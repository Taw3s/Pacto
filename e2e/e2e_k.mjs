// Stage (k): the judge's animations and the courtroom interactions (after stages c and j).
import { devices } from "playwright";
import fs from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";
import { APP, DIR, FIXTURE, assert, done, launch, loginAs, newPhone, sql, step } from "./lib.mjs";

const browser = await launch();
const bia = sql(`select user_id from public.members where display_name = 'Bia'`);
// Bia's typing proof, condemned in stage c (Caio voted "anular" with this reason).
const condemned = sql(`select c.id from public.checkins c join public.dispute_results r on r.checkin_id = c.id
  where c.user_id = '${bia}' and r.status = 'upheld' and c.goal = 'typing' limit 1`);
const url = `${APP}/checkin/${condemned}`;

/** Every frame the bench judge shows during `ms`. */
async function framesFor(page, ms) {
  return page.evaluate(async (ms) => {
    const seen = [];
    const end = performance.now() + ms;
    while (performance.now() < end) {
      const f = document.querySelector('[data-testid="dispute"] [data-judge]')?.getAttribute("data-frame");
      if (f && seen.at(-1) !== f) seen.push(f);
      await new Promise((r) => setTimeout(r, 20));
    }
    return seen;
  }, ms);
}

const eva = await loginAs(browser, "eva@pacto.test");

await step("a closed tribunal is not re-enacted: verdict at once, the judge still on the final pose, the crowd still there", async () => {
  await eva.goto(url);
  await eva.getByTestId("verdict").getByText("Condenado").waitFor({ timeout: 2000 });
  const frames = await framesFor(eva, 2000);
  assert(frames.length === 1 && frames[0] === "gavel8", `a closed session moved: ${frames.join(",")}`);
  // The crowd stays in a closed session too, still (Astra, Q4 = A): scenery, never a reaction to the verdict.
  assert((await eva.getByTestId("court-crowd").count()) === 1, "no crowd on a closed tribunal");
  const closed = await sceneFor(eva, 1000);
  assert(closed.seen.every((k) => k === "gavel8|0"), `the crowd moved in a closed session: ${closed.seen.join(" ")}`);
});

// The tribunal the AI opened in stage g (Caio's study) is still open here.
const open = sql(`select r.checkin_id from public.dispute_results r where r.status = 'open' order by r.closes_at desc limit 1`);
const openUrl = `${APP}/checkin/${open}`;

/**
 * The scene over `ms`, from right after navigation: "<judge frame>|<people out of their rest pose>", plus every row that
 * was ever out of rest as a whole (the crowd moves in small groups, never a full row at once).
 */
async function sceneFor(page, ms) {
  return page.evaluate(async (ms) => {
    const seen = [];
    const wholeRows = new Set();
    const end = performance.now() + ms;
    while (performance.now() < end) {
      const q = (s) => document.querySelector(`[data-testid="dispute"] ${s}`);
      const moving = document.querySelectorAll('[data-testid="court-crowd"] [data-pose]:not([data-pose="rest"])').length;
      document.querySelectorAll('[data-testid="court-crowd"] [class*="crowd-r"]').forEach((row, i) => {
        const people = row.querySelectorAll("[data-pose]");
        if (people.length && [...people].every((p) => p.getAttribute("data-pose") !== "rest")) wholeRows.add(i);
      });
      const k = `${q("[data-judge]")?.getAttribute("data-frame")}|${moving}`;
      if (seen.at(-1) !== k) seen.push(k);
      await new Promise((r) => setTimeout(r, 15));
    }
    return { seen, wholeRows: [...wholeRows] };
  }, ms);
}

await step("an open tribunal opens with one strike while small groups of the crowd settle, once; voting works from the start", async () => {
  assert(open, "an open tribunal from stage g");
  const p = await loginAs(browser, "eva@pacto.test");
  await p.goto(openUrl, { waitUntil: "commit" });
  await p.getByTestId("dispute").waitFor();
  // The controls (or Eva's recorded vote) are there before the scene ends.
  await p.getByTestId("vote-form").or(p.getByText(/^Seu voto:/)).first().waitFor({ timeout: 1000 });
  const { seen: scene, wholeRows } = await sceneFor(p, 2500);
  const judge = scene.map((k) => k.split("|")[0]);
  assert(judge.includes("gavel5"), `no strike: ${scene.join(" ")}`);
  assert(judge.filter((f, i) => f === "gavel5" && judge[i - 1] !== "gavel5").length === 1, `struck more than once: ${scene.join(" ")}`);
  assert(scene.at(-1) === "idle1|0", `does not end at rest and settled: ${scene.join(" ")}`);
  assert(scene.some((k) => !k.endsWith("|0")), `the crowd never moved: ${scene.join(" ")}`);
  assert(wholeRows.length === 0, `a whole row moved at once: rows ${wholeRows.join(",")}`);
  await p.reload();
  await p.getByTestId("dispute").waitFor();
  const again = await sceneFor(p, 1500);
  assert(again.seen.every((k) => k === "idle1|0"), `replayed: ${again.seen.join(" ")}`);
  await p.context().close();
});

await step("each juror who voted opens their reason", async () => {
  await eva.locator('[data-juror="Caio"] button').click();
  await eva.getByTestId("jury-reason").getByText("O relógio da foto marca 23h de ontem").waitFor();
  assert((await eva.locator('[data-juror="Caio"] button').getAttribute("aria-expanded")) === "true", "expanded state");
});

await step("the proof opens enlarged in the page; Esc closes it and focus returns", async () => {
  const thumb = eva.getByTestId("dispute").getByRole("button", { name: /Ampliar a foto/ });
  await thumb.click();
  const dialog = eva.locator("dialog[open]");
  await dialog.waitFor();
  assert(await dialog.locator("img").evaluate((i) => i.naturalWidth > 0), "enlarged photo loads");
  await eva.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached" });
  const focused = await eva.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
  assert(focused.startsWith("Ampliar a foto"), `focus went to: ${focused}`);
});

await step("reduced motion: the judge never changes frame; a confirmed vote shows the closed ballot box at once", async () => {
  const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "pt-BR", timezoneId: "America/Sao_Paulo", reducedMotion: "reduce" });
  const p = await ctx.newPage();
  await p.goto(`${APP}/login`);
  await p.fill("#email", "fab@pacto.test");
  await p.fill("#password", "senha123");
  await p.click("button:text-is('Entrar')");
  await p.waitForURL("**/hoje");
  await p.goto(url);
  await p.getByTestId("verdict").waitFor();
  const frames = await framesFor(p, 1500);
  assert(frames.length === 1 && frames[0] === "gavel8", `frames with reduced motion: ${frames.join(",")}`);
  // An open session with reduced motion: the final pose at once, the crowd settled.
  await p.goto(openUrl);
  await p.getByTestId("dispute").waitFor();
  const { seen: scene } = await sceneFor(p, 1500);
  assert(scene.length === 1 && scene[0] === "idle1|0", `scene with reduced motion: ${scene.join(" ")}`);
  // Fab votes with reduced motion: the closed ballot box and the text at once, no frames in between.
  await p.evaluate(() => {
    window.__ballot = [];
    new MutationObserver(() => {
      const b = document.querySelector('[data-testid="ballot-box"] img')?.getAttribute("data-frame");
      if (b && window.__ballot.at(-1) !== b) window.__ballot.push(b);
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-frame"] });
  });
  await p.getByTestId("vote-form").getByRole("button", { name: /^Manter a prova/ }).click();
  await p.fill("#vote-reason", "Dá para ver o livro aberto na foto");
  await p.getByRole("button", { name: "Confirmar voto" }).click();
  await p.getByTestId("ballot-box").getByText("Seu voto foi registrado.").waitFor();
  await p.waitForTimeout(400);
  const ballot = await p.evaluate(() => window.__ballot);
  assert(ballot.join(",") === "ballotBox", `ballot with reduced motion: ${ballot.join(",")}`);
  await ctx.close();
});

await step("Hoje: pending goals come before the chests", async () => {
  const p = await loginAs(browser, "bia@pacto.test");
  const order = await p.evaluate(() => {
    const goals = document.getElementById("metas");
    const chest = document.querySelector('[data-testid="daily-chest-card"]');
    return goals && chest ? goals.compareDocumentPosition(chest) & Node.DOCUMENT_POSITION_FOLLOWING : -1;
  });
  assert(order > 0, "the daily chest is above the pending goals");
});

await step("Hoje: each prop on the desk takes the pose of its goal's confirmed state", async () => {
  const p = await loginAs(browser, "bia@pacto.test");
  await p.locator("[data-shelf]").first().waitFor();
  const poses = await p.locator("[data-shelf]").evaluateAll((items) =>
    items.map((li) => [li.getAttribute("data-shelf"), li.getAttribute("data-shelf-state"), li.querySelector("img")?.getAttribute("src")]),
  );
  assert(poses.length === 3, `three props: ${JSON.stringify(poses)}`);
  const expected = { study: ["notebookDone", "notebookPending"], typing: ["keyboard", "keyboard"], reading: ["bookDone", "bookPending"] };
  for (const [goal, state, src] of poses) {
    const sprite = expected[goal][state === "done" ? 0 : 1]; // annulled takes the pending pose
    assert(src === `/lowpoly/${sprite}.png`, `${goal} ${state} shows ${src}`);
  }
  await p.context().close();
});

await step("a proof takes up to 4 photos: gallery on the proof page and all of them go to the AI judge", async () => {
  const p = await loginAs(browser, "davi@pacto.test");
  const card = p.locator("[data-goal=reading][data-state=pending]");
  await card.getByTestId("proof-photo-input").setInputFiles([FIXTURE, FIXTURE, FIXTURE]);
  assert((await card.getByTestId("photo-previews").locator("img").count()) === 3, "3 previews");
  await card.getByRole("button", { name: "Tirar a foto 3" }).click();
  await card.getByTestId("proof-photo-input").setInputFiles([FIXTURE, FIXTURE, FIXTURE]);
  assert((await card.getByTestId("photo-previews").locator("img").count()) === 4, "capped at 4");
  await card.getByText("Até 4 fotos por prova").waitFor();
  await card.getByTestId("pages").fill("12");
  await card.getByRole("button", { name: "Enviar prova" }).click();
  await p.locator("[data-goal=reading][data-state=done]").click();
  await p.waitForURL("**/checkin/**");
  const gallery = p.getByTestId("proof-photos");
  await gallery.waitFor();
  assert((await gallery.locator("li").count()) === 4, "4 photos on the proof page");
  await gallery.getByRole("button", { name: "Ampliar a foto 2 de 4" }).click();
  await p.locator("dialog[open]").getByText("Foto 2 de 4").waitFor();
  await p.keyboard.press("ArrowRight");
  await p.locator("dialog[open]").getByText("Foto 3 de 4").waitFor();
  await p.keyboard.press("Escape");
  const calls = () => fs.readFileSync(path.join(DIR, "gemini_calls.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  for (let i = 0; i < 40 && !calls().some((c) => c.claim.goal === "reading" && c.images === 4); i++) await new Promise((r) => setTimeout(r, 250));
  assert(calls().some((c) => c.claim.goal === "reading" && c.images === 4), "the AI judge got the 4 photos");
});

await step("the judge's guide answers fixed questions about the rules", async () => {
  const p = await loginAs(browser, "eva@pacto.test");
  await p.getByTestId("judge-guide").click();
  const dialog = p.locator("dialog[open]");
  await dialog.getByRole("button", { name: "Como funciona o tribunal?" }).click();
  await dialog.getByTestId("guide-answer").getByText("Depois de 72 h").waitFor();
  await dialog.getByRole("button", { name: "Outras perguntas" }).click();
  await dialog.getByRole("button", { name: "Quando eu fico devendo?" }).waitFor();
  await p.addStyleTag({ content: "body{background-image:none!important;background-color:#2a2d32!important}" });
  const axe = await new AxeBuilder({ page: p }).include("dialog[open]").withTags(["wcag2a", "wcag2aa"]).analyze();
  const bad = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  assert(bad.length === 0, bad.map((v) => `${v.id}×${v.nodes.length}`).join(", "));
  await p.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached" });
});

await step("Google sign-in sends the browser to Supabase's Google authorize page and back to /auth/confirm", async () => {
  const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "pt-BR" });
  const p = await ctx.newPage();
  await p.goto(`${APP}/login`);
  const google = p.getByTestId("google-login");
  // The login form is client-rendered (inside Suspense): wait for it before deciding the button is missing.
  await p.locator("#email").waitFor();
  if ((await google.count()) === 0) throw new Error("no Google button: build the app with NEXT_PUBLIC_GOOGLE_LOGIN=1");
  const [req] = await Promise.all([p.waitForRequest((r) => r.url().includes("/auth/v1/authorize")), google.click()]);
  const u = new URL(req.url());
  assert(u.searchParams.get("provider") === "google", `provider ${u.searchParams.get("provider")}`);
  assert(new URL(u.searchParams.get("redirect_to")).pathname === "/auth/confirm", `redirect_to ${u.searchParams.get("redirect_to")}`);
  assert(u.searchParams.get("code_challenge"), "PKCE challenge");
  await ctx.close();
});

await step("a session left from a deleted account goes back to the login instead of failing to join", async () => {
  const p = await loginAs(browser, "fab@pacto.test");
  sql(`delete from auth.users where email = 'fab@pacto.test'`);
  // Production verifies the session token locally and lands here (the case that hit a real user);
  // locally the middleware already asks the auth server, so open the join step directly.
  await p.goto(`${APP}/join?step=code`);
  await p.waitForURL("**/login?error=session");
  await p.getByText("Sua sessão era de uma conta que não existe mais").waitFor();
});

await step("anyone without an invite creates a challenge, picks the debt menu, and only the owner changes it (from next Monday)", async () => {
  const { page: p } = await newPhone(browser);
  await p.goto(`${APP}/join`);
  await p.getByTestId("toggle-create").click();
  assert((await p.locator("#code").count()) === 0, "no invite code asked when creating");
  await p.fill("#name", "Rui");
  await p.fill("#email", "rui@pacto.test");
  await p.fill("#password", "senha123");
  await p.getByRole("button", { name: "Criar conta" }).click();
  await p.waitForURL("**/join?step=code&criar=1");
  await p.fill("#group", "Pacto do Rui");
  const picker = p.getByTestId("menu-picker");
  await picker.locator('[data-item="coke"]').click(); // leaves 1 salgado
  await picker.locator('[data-item="pizza"]').click();
  assert(await picker.locator('[data-item="coffee"]').isDisabled(), "a third item can be picked");
  await picker.getByText("1 salgado + 1 fatia de pizza").waitFor();
  await p.getByRole("button", { name: "Criar desafio" }).click();
  await p.waitForURL("**/hoje");
  const group = sql("select g.name || '|' || g.invite_code || '|' || (g.owner_id = m.user_id) from groups g join members m on m.group_id = g.id where m.display_name = 'Rui'");
  assert(/^Pacto do Rui\|[A-HJ-NP-Z2-9]{8}\|true$/.test(group), `group ${group}`);

  await p.goto(`${APP}/config`);
  const settings = p.getByTestId("group-settings");
  await settings.getByTestId("invite-code").getByText(group.split("|")[1]).waitFor();
  await settings.getByTestId("settings-menu-today").getByText("1 salgado + 1 fatia de pizza").waitFor();
  await settings.locator('[data-item="snack"]').click();
  await settings.locator('[data-item="pix"]').click();
  await settings.getByRole("button", { name: "Salvar cardápio" }).click();
  await settings.getByText(/Salvo\. Vale a partir de/).waitFor();
  await settings.getByTestId("settings-menu-next").getByText(/1 fatia de pizza \+ 1 Pix de R\$ 5/).waitFor();
  // Today still costs the old menu; the change shows on Dívidas too.
  await p.goto(`${APP}/dividas`);
  await p.getByTestId("menu-today").getByText("1 salgado + 1 fatia de pizza").waitFor();
  await p.getByTestId("menu-next").getByText(/1 fatia de pizza \+ 1 Pix de R\$ 5/).waitFor();

  // In the original group nobody created it in the app: members see the menu but cannot change it.
  const ana = await loginAs(browser, "ana@pacto.test");
  await ana.goto(`${APP}/config`);
  await ana.getByTestId("settings-menu-today").getByText("1 Coca + 1 salgado").waitFor();
  assert((await ana.getByTestId("menu-picker").count()) === 0, "a non-owner can edit the menu");
  await ana.getByText("Só quem criou o desafio troca o cardápio.").waitFor();
});

await browser.close();
done();
