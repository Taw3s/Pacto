// Stage (c): feed + tribunal
import { ANON, APP, FIXTURE, SERVICE, SHOTS, SUPABASE, assert, done, launch, loginAs, step, typingTest } from "./lib.mjs";

for (const name of ["Caio", "Davi", "Eva", "Fab"]) {
  await fetch(`${SUPABASE}/auth/v1/signup`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON },
    body: JSON.stringify({ email: `${name.toLowerCase()}@pacto.test`, password: "senha123", data: { invite_code: "PACTO2026", display_name: name } }),
  });
}
// Bia joined via magic link and has no password: set one through the admin API.
const users = await fetch(`${SUPABASE}/auth/v1/admin/users`, { headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}` } }).then((r) => r.json());
const bia = users.users.find((u) => u.email === "bia@pacto.test");
await fetch(`${SUPABASE}/auth/v1/admin/users/${bia.id}`, {
  method: "PUT", headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, "content-type": "application/json" },
  body: JSON.stringify({ password: "senha123" }),
});

const browser = await launch();
const as = (email) => loginAs(browser, email);

const biaP = await as("bia@pacto.test");
/** Records every sprite the desk's keyboard shows from now on (window.__keys). */
const watchKeys = (page) =>
  page.evaluate(() => {
    window.__keys = [];
    const img = document.querySelector("[data-shelf=typing] img");
    const note = () => window.__keys.push(img.getAttribute("src").replace("/lowpoly/", ""));
    new MutationObserver(note).observe(img, { attributes: true, attributeFilter: ["src"] });
  });

await step("Bia checks in typing; the desk's space bar goes down and back once", async () => {
  await watchKeys(biaP);
  await typingTest(biaP, biaP.locator("[data-goal=typing][data-state=pending]"));
  await biaP.locator("[data-goal=typing][data-state=done]").waitFor();
  await biaP.waitForTimeout(600);
  const keys = await biaP.evaluate(() => window.__keys);
  assert(keys.filter((k) => k === "keyboardPress2.png").length === 1, `the key did not press once: ${keys.join(" ")}`);
  assert(keys.at(-1) === "keyboard.png", `the keyboard did not come back to rest: ${keys.join(" ")}`);
  assert((await biaP.locator("[data-shelf=typing]").getAttribute("data-shelf-state")) === "done", "typing done on the desk");
  // Reloading shows the resting keyboard, without pressing again.
  await biaP.reload();
  await biaP.locator("[data-shelf=typing][data-shelf-state=done]").waitFor();
  await watchKeys(biaP);
  await biaP.waitForTimeout(600);
  const again = await biaP.evaluate(() => window.__keys);
  assert(again.length === 0, `pressed again after reload: ${again.join(" ")}`);
  assert((await biaP.locator("[data-shelf=typing] img").getAttribute("src")) === "/lowpoly/keyboard.png", "resting keyboard after reload");
});

const ana = await as("ana@pacto.test");
await step("feed shows everyone with status", async () => {
  await ana.goto(`${APP}/feed`);
  assert((await ana.locator("[data-member]").count()) === 6, "6 members");
  await ana.locator("[data-member=Ana]").getByText("Dia cumprido").waitFor();
  await ana.locator("[data-member=Bia]").getByText("1/3 metas").waitFor();
  await ana.locator("[data-member=Caio]").getByText("0/3 metas").waitFor();
  await ana.screenshot({ path: `${SHOTS}/c1-feed.png`, fullPage: true });
});

await step("owner cannot dispute own check-in (no form)", async () => {
  await ana.locator('[data-member=Ana] a[href^="/checkin/"]').first().click();
  await ana.waitForURL("**/checkin/**");
  assert((await ana.getByText("Levar ao tribunal").count()) === 0, "own dispute form shown");
});

let url;

/** Records, from now on, every frame the ballot box shows and every judge frame on the bench (window.__ballot, window.__judge). */
const watchCourt = (p) =>
  p.evaluate(() => {
    window.__ballot = [];
    window.__judge = [];
    window.__verdictJudge = [];
    const note = () => {
      const b = document.querySelector('[data-testid="ballot-box"] img')?.getAttribute("data-frame");
      if (b && window.__ballot.at(-1) !== b) window.__ballot.push(b);
      const j = document.querySelector('[data-testid="dispute"] [data-judge]')?.getAttribute("data-frame");
      if (j && window.__judge.at(-1) !== j) window.__judge.push(j);
      const v = document.querySelector('[data-testid="verdict"] [data-judge]')?.getAttribute("data-frame");
      if (v && window.__verdictJudge.at(-1) !== v) window.__verdictJudge.push(v);
    };
    new MutationObserver(note).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-frame", "src"] });
  });

async function vote(p, choice, reason) {
  await p.waitForLoadState("networkidle");
  await p.getByTestId("vote-form").getByRole("button", { name: new RegExp(`^${choice}`) }).click();
  await p.fill("#vote-reason", reason);
  await p.getByRole("button", { name: "Confirmar voto" }).click();
  await p.getByText(`Seu voto: ${choice.toLowerCase()}`).or(p.getByTestId("verdict")).first().waitFor();
}

await step("Ana disputes Bia's check-in: courtroom with defendant, jury and score", async () => {
  await ana.goto(`${APP}/feed`);
  await ana.locator('[data-member=Bia] a[href^="/checkin/"]').first().click();
  await ana.waitForURL("**/checkin/**");
  url = ana.url();
  await ana.waitForLoadState("networkidle");
  await ana.fill("textarea", "A foto parece ser de ontem");
  await ana.click("button:has-text('Levar ao tribunal')");
  await ana.getByText("Em votação").waitFor();
  assert((await ana.getByTestId("defendant").innerText()) === "Bia", "defendant in the middle");
  assert((await ana.getByTestId("guilty-count").innerText()) === "1", "author counts as guilty");
  await ana.getByText("Decide quem chegar a 3 dos 5 votos.").waitFor();
  assert((await ana.locator("[data-juror]").count()) === 5, "5 jurors");
  assert((await ana.locator('[data-juror="Ana"]').getAttribute("data-vote")) === "guilty", "Ana's seat shows guilty");
  assert((await ana.getByTestId("vote-form").count()) === 0, "author can vote again");
  await ana.getByText("Acusação · Ana").waitFor();
});

await step("Bia (defendant) sees tribunal in feed, defends once, cannot vote", async () => {
  await biaP.goto(`${APP}/feed`);
  await biaP.getByText(/tribuna(l|is) em andamento/i).waitFor();
  await biaP.goto(url);
  await biaP.waitForLoadState("networkidle");
  await biaP.getByText("Você é o réu e não vota").waitFor();
  assert((await biaP.getByTestId("vote-form").count()) === 0, "defendant sees vote buttons");
  await biaP.fill("textarea", "É de hoje, olha o relógio no canto");
  await biaP.click("button:has-text('Enviar defesa')");
  await biaP.getByRole("button", { name: "Enviar defesa" }).waitFor({ state: "detached" });
  await biaP.locator("section:has(#defesa) p", { hasText: "É de hoje, olha o relógio no canto" }).waitFor();
});

await step("a vote needs guilty/innocent AND a reason; a failed vote drops no ballot, a confirmed one drops it once", async () => {
  const p = await as("caio@pacto.test");
  await p.goto(url);
  await p.waitForLoadState("networkidle");
  await p.getByTestId("vote-form").getByRole("button", { name: /^Anular a prova/ }).click();
  assert(await p.getByRole("button", { name: "Confirmar voto" }).isDisabled(), "vote without reason enabled");
  await p.fill("#vote-reason", "O relógio da foto marca 23h de ontem");
  await watchCourt(p);
  // The server refuses once: an error, no ballot.
  await p.route("**/rest/v1/dispute_votes*", (r) =>
    r.request().method() === "POST"
      ? r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ code: "XX000", message: "simulated failure" }) })
      : r.continue());
  await p.getByRole("button", { name: "Confirmar voto" }).click();
  await p.getByText("Não foi possível votar. Tente de novo.").waitFor();
  await p.waitForTimeout(400);
  assert((await p.evaluate(() => window.__ballot.length)) === 0, "a ballot dropped on a failed vote");
  await p.unroute("**/rest/v1/dispute_votes*");
  // Confirmed: the ballot drops once (4 frames, ending in the closed box) and the vote is said to be recorded.
  await p.getByRole("button", { name: "Confirmar voto" }).click();
  await p.getByText("Seu voto: anular a prova").waitFor();
  await p.getByTestId("ballot-box").getByText("Seu voto foi registrado.").waitFor();
  await p.waitForTimeout(500);
  const frames = await p.evaluate(() => window.__ballot);
  assert(frames.join(",") === "ballot1,ballot2,ballot3,ballotBox", `ballot frames: ${frames.join(",")}`);
  assert((await p.getByTestId("guilty-count").innerText()) === "2", "2 guilty");
  await p.getByText("Em votação").waitFor();
  // A later visit: the recorded vote, no ballot dropping again.
  await p.reload();
  await p.getByText("Seu voto: anular a prova").waitFor();
  await p.waitForTimeout(500);
  assert((await p.getByTestId("ballot-box").count()) === 0, "the ballot dropped again after reload");
});

await step("Davi votes guilty — majority reached: one closing strike (no ballot) + CONDENADO, proof annulled", async () => {
  const p = await as("davi@pacto.test");
  await p.goto(url);
  await p.waitForLoadState("networkidle");
  await p.waitForTimeout(1300); // the opening strike is over
  await watchCourt(p);
  await vote(p, "Anular a prova", "Concordo com a Ana");
  await p.getByTestId("verdict").getByText("Condenado").waitFor();
  await p.waitForTimeout(900);
  // Vote and closing together: only the closing moves. The judge next to the verdict (where the voter is looking; the
  // bench is scrolled away) looks at the result, strikes once and stays closed; the bench does not strike again.
  const judge = await p.evaluate(() => window.__verdictJudge);
  const bench = await p.evaluate(() => window.__judge);
  assert((await p.evaluate(() => window.__ballot.length)) === 0, "a ballot dropped on the closing vote");
  assert(judge.includes("think1") && judge.filter((f) => f === "gavel5").length === 1, `closing strike: ${judge.join(",")}`);
  assert(judge.at(-1) === "gavel8", `does not end on the closed pose: ${judge.join(",")}`);
  assert(!bench.includes("gavel5"), `the bench struck on closing: ${bench.join(",")}`);
  await p.getByText("esta prova não conta").waitFor();
  await p.waitForTimeout(1300); // let the gavel finish for the screenshot
  await p.screenshot({ path: `${SHOTS}/c2-tribunal.png`, fullPage: true });
});

await step("Eva can no longer vote; Votos tab shows who convicted and why; feed shows 'Grupo rejeitou'", async () => {
  const p = await as("eva@pacto.test");
  await p.goto(url);
  await p.waitForLoadState("networkidle");
  assert((await p.getByTestId("vote-form").count()) === 0, "vote buttons after close");
  await p.getByRole("tab", { name: /Votos/ }).click();
  const caioVote = p.locator('[data-vote-by="Caio"]');
  await caioVote.getByText("Anular", { exact: true }).waitFor();
  await caioVote.getByText("O relógio da foto marca 23h de ontem").waitFor();
  await p.locator('[data-vote-by="Ana"]').getByText("A foto parece ser de ontem").waitFor();
  await p.screenshot({ path: `${SHOTS}/c3-votos.png`, fullPage: true });
  await p.goto(`${APP}/feed`);
  await p.locator("[data-member=Bia]").getByText("Grupo rejeitou").waitFor();
  assert((await p.getByText(/tribuna(l|is) em andamento/i).count()) === 0, "tribunal banner still shown");
});

await step("acquittal path: 3 'inocente' keeps the check-in (ABSOLVIDO)", async () => {
  // Fab checks in; Caio disputes; Ana, Bia, Davi vote innocent.
  const fab = await as("fab@pacto.test");
  const card = fab.locator("[data-goal=reading]");
  await card.getByTestId("proof-photo-input").setInputFiles(FIXTURE);
  await card.getByTestId("pages").fill("5");
  await card.getByRole("button", { name: "Enviar prova" }).click();
  await fab.locator("[data-goal=reading][data-state=done]").waitFor();
  const caio = await as("caio@pacto.test");
  await caio.goto(`${APP}/feed`);
  await caio.locator('[data-member=Fab] a[href^="/checkin/"]').first().click();
  await caio.waitForURL("**/checkin/**");
  const u = caio.url();
  await caio.waitForLoadState("networkidle");
  await caio.getByText("Livro aberto na página 12.").waitFor(); // AI review done: no refresh racing the dispute
  await caio.fill("textarea", "Esse livro não conta");
  await caio.click("button:has-text('Levar ao tribunal')");
  await caio.getByText("Em votação").waitFor();
  for (const who of ["ana", "bia", "davi"]) {
    const p = who === "ana" ? ana : who === "bia" ? biaP : await as(`${who}@pacto.test`);
    await p.goto(u);
    await vote(p, "Manter a prova", `Livro vale sim (${who})`);
  }
  await ana.goto(u);
  await ana.getByText("a prova continua valendo.").waitFor();
  await ana.getByTestId("verdict").getByText("Absolvido").waitFor();
});

await browser.close();
done();
