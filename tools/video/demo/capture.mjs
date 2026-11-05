// Builds the demo group through the real app and screenshots the pieces the video shows (tools/video/README.md).
// Needs a FRESH local Supabase with tools/video/demo/setup.sql applied, the app running (APP_URL) and demo/gemini_mock.mjs.
// Output: demo/out/*.png (4× pixel density) and demo/out/meta.json (where the judge sits in each shot, in CSS pixels).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(DIR, "out");
const APP = process.env.APP_URL || "http://localhost:3000";
const SUPABASE = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const ANON = process.env.SUPABASE_ANON_KEY;
const DPR = 4;
const PHOTO = { study: path.join(DIR, "photos", "study.jpg"), reading: path.join(DIR, "photos", "reading.jpg") };
const PEOPLE = ["Ana", "Bruno", "Carla", "Diego", "Elisa"];
const email = (name) => `${name.toLowerCase()}@demo.pacto`;
fs.mkdirSync(OUT, { recursive: true });
const meta = {};
const pages = [];

const sql = (q) => execFileSync("psql", ["-v", "ON_ERROR_STOP=1", "-tAc", q]).toString().trim();
const psqlFile = (f) => execFileSync("psql", ["-q", "-f", path.join(DIR, f)], { stdio: "inherit" });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(check, what, ms = 30_000) {
  for (const end = Date.now() + ms; Date.now() < end; await wait(300)) if (await check()) return;
  throw new Error(`timed out waiting for ${what}`);
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
// Reduced motion: the judge shows its resting frame, so every shot is a stable still (the video animates the judge itself).
async function phone(name, { width = 390, height = 844 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: DPR, isMobile: width < 600, hasTouch: width < 600, locale: "pt-BR", timezoneId: "America/Sao_Paulo", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  pages.push({ name: name ?? "guest", page });
  page.on("pageerror", (e) => console.log(`  [${name ?? "guest"} pageerror]`, e.message));
  if (name) {
    await page.goto(`${APP}/login`);
    await page.fill("#email", email(name));
    await page.fill("#password", "senha123");
    await page.click("button:text-is('Entrar')");
    await page.waitForURL("**/hoje");
  }
  return page;
}

// The judge (animated or a plain sprite) and the proof folder: the video draws them itself, frame by frame.
const JUDGE = 'img[data-judge], img[src*="/lowpoly/judge-"]';
const FOLDER = 'img[src*="/lowpoly/evidenceFolder"]';
const hiding = (sel) => `${sel}{visibility:hidden!important}`;

/**
 * Screenshot of a region of the page as demo/out/<id>.png: one element, or from the top of `from` to the bottom of `to`.
 * Also records, relative to it, the judge, the folder and the `parts` (selectors, or "children" for every direct child),
 * and saves copies without the judge (-nojudge) and without judge and folder (-bare).
 */
async function shot(page, id, from, { to = from, parts = {}, pad = 0 } = {}) {
  await from.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  await wait(400);
  const abs = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }; });
  const a = await abs(from);
  const b = await abs(to);
  const clip = { x: a.x - pad, y: a.y - pad, width: a.w + 2 * pad, height: b.y + b.h - a.y + 2 * pad };
  const rel = async (loc) => { const r = await abs(loc); return { x: r.x - clip.x, y: r.y - clip.y, w: r.w, h: r.h }; };
  const entry = { width: clip.width, height: clip.height, dpr: DPR, parts: {} };
  const inside = (sel) => page.locator(sel).filter({ visible: true }).evaluateAll((els, c) => els.filter((el) => {
    const r = el.getBoundingClientRect(), x = r.x + scrollX, y = r.y + scrollY;
    return x >= c.x - 1 && y >= c.y - 1 && x + r.width <= c.x + c.width + 1 && y + r.height <= c.y + c.height + 1;
  }).length, clip);
  const take = (suffix) => page.screenshot({ path: path.join(OUT, `${id}${suffix}.png`), clip, fullPage: true });
  const judge = page.locator(JUDGE).filter({ visible: true });
  if (await inside(JUDGE)) {
    for (const j of await judge.all()) {
      const r = await rel(j);
      if (r.x >= 0 && r.y >= 0 && r.x + r.w <= clip.width && r.y + r.h <= clip.height) entry.judge = { x: r.x, y: r.y, size: r.w, frame: await j.getAttribute("data-frame") };
    }
  }
  const folder = page.locator(FOLDER).filter({ visible: true });
  if (await inside(FOLDER)) for (const f of await folder.all()) { const r = await rel(f); if (r.x >= 0 && r.y >= 0) entry.folder = { x: r.x, y: r.y, size: r.w }; }
  for (const [name, sel] of Object.entries(parts)) {
    if (sel === "children") {
      const kids = from.locator(":scope > *");
      entry.parts[name] = [];
      for (const k of await kids.all()) entry.parts[name].push(await rel(k));
    } else entry.parts[name] = await rel(page.locator(sel).filter({ visible: true }).first());
  }
  for (const [suffix, css] of [["-nojudge", entry.judge && hiding(JUDGE)], ["-bare", entry.folder && hiding(`${JUDGE},${FOLDER}`)]]) {
    if (!css) continue;
    const tag = await page.addStyleTag({ content: css });
    await take(suffix);
    await tag.evaluate((t) => t.remove());
  }
  await take("");
  meta[id] = entry;
  fs.writeFileSync(path.join(OUT, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
  console.log(`✔ ${id} ${Math.round(clip.width)}×${Math.round(clip.height)}${entry.judge ? " (judge)" : ""}${entry.folder ? " (folder)" : ""}`);
}

async function send(page, goal, fill) {
  const card = page.locator(`[data-goal=${goal}]`);
  if (goal === "typing") {
    await card.getByRole("button", { name: "Começar teste" }).click();
    const input = card.getByTestId("typing-input");
    await input.waitFor();
    // About 70 WPM: a believable result on the proof card.
    while ((await card.getByTestId("typing-test").getAttribute("data-phase").catch(() => "gone")) === "running") {
      const word = await card.getByTestId("typing-word-current").innerText().catch(() => "");
      if (!word) break;
      await input.pressSequentially(`${word} `, { delay: 170 }).catch(() => {});
    }
  } else {
    await card.locator("input[type=file]").setInputFiles(PHOTO[goal]);
    await fill(card);
    await card.getByRole("button", { name: "Enviar prova" }).click();
  }
  await page.locator(`[data-goal=${goal}][data-state=done]`).waitFor({ timeout: 30_000 });
}
const study = (summary) => async (card) => {
  await card.locator("textarea").fill(summary);
  await card.getByTestId("minutes").fill("95");
};
const reading = (pages) => async (card) => card.getByTestId("pages").fill(String(pages));

try {
// --- the group ---
for (const name of PEOPLE) {
  const r = await fetch(`${SUPABASE}/auth/v1/signup`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON },
    body: JSON.stringify({ email: email(name), password: "senha123", data: { invite_code: "DEMO2026", display_name: name } }),
  });
  if (!r.ok) throw new Error(`signup ${name}: ${r.status} ${await r.text()}`);
}
psqlFile("history.sql");

// --- the presentation (sala do juiz), logged out ---
for (const [id, size] of [["room-desktop", { width: 1440, height: 900 }], ["room-phone", { width: 390, height: 844 }]]) {
  const p = await phone(null, size);
  await p.goto(`${APP}/`);
  await shot(p, id, p.locator("figure > div[aria-hidden]").first());
  await p.screenshot({ path: path.join(OUT, `${id}-page.png`) });
  await p.context().close();
}

// --- Ana's day: three proofs, verified by the (fake) AI judge ---
const ana = await phone("Ana");
await send(ana, "study", study("Revisei funções do 2º grau: discriminante, raízes e vértice. Fiz os exercícios 12 a 18 do capítulo 3."));
await send(ana, "typing");
await send(ana, "reading", reading(32));
await until(() => sql("select count(*) from checkin_reviews r join checkins c on c.id = r.checkin_id join members m on m.user_id = c.user_id where m.display_name = 'Ana' and c.day = public.sp_today()") === "3", "Ana's 3 reviews");
await ana.goto(`${APP}/hoje`);
await ana.getByTestId("verified").waitFor();
for (const goal of ["study", "typing", "reading"]) await shot(ana, `today-${goal}`, ana.locator(`[data-goal=${goal}]`));
// With a margin: the tilted stamp goes past the element's box.
await shot(ana, "today-verified", ana.getByTestId("verified"), { pad: 16 });
await shot(ana, "today-scoreboard", ana.getByTestId("scoreboard"));
await ana.screenshot({ path: path.join(OUT, "today-page.png"), fullPage: true });
for (const goal of ["study", "typing", "reading"]) {
  const id = sql(`select c.id from checkins c join members m on m.user_id = c.user_id where m.display_name = 'Ana' and c.day = public.sp_today() and c.goal = '${goal}'`);
  await ana.goto(`${APP}/checkin/${id}`);
  await ana.waitForLoadState("networkidle");
  await ana.addStyleTag({ content: "nav{display:none!important}" });
  await ana.screenshot({ path: path.join(OUT, `proof-${goal}-page.png`), fullPage: true });
  // From the document tab to the photo (or the typing card): owner, what was declared, the AI badge and the proof.
  await shot(ana, `proof-${goal}`, ana.locator("main header.doc-tab").first(), {
    to: ana.locator("main figure").first(),
    pad: 12,
    // The video lays these out apart (Astra, round 5): who and what was declared, then the evidence.
    parts: { header: "main header.doc-tab", informed: "main dl.card", evidence: "main figure" },
  });
}

// --- another example: Carla's reading goes to the tribunal, and the group keeps it ---
const carla = await phone("Carla");
await send(carla, "reading", reading(28));
const carlaProof = sql("select c.id from checkins c join members m on m.user_id = c.user_id where m.display_name = 'Carla' and c.day = public.sp_today() and c.goal = 'reading'");
const url = `${APP}/checkin/${carlaProof}`;
const diego = await phone("Diego");
await diego.goto(url);
await diego.waitForLoadState("networkidle");
await diego.fill("textarea", "A página parece a mesma de ontem.");
await diego.click("button:has-text('Levar ao tribunal')");
await diego.getByText("Em votação").waitFor();
await carla.goto(url);
await carla.waitForLoadState("networkidle");
await carla.fill("textarea", "Hoje li o capítulo 4 inteiro, o marcador está na página 49.");
await carla.click("button:has-text('Enviar defesa')");
await carla.getByRole("button", { name: "Enviar defesa" }).waitFor({ state: "detached" });

const elisa = await phone("Elisa");
async function courtroom(id) {
  await elisa.goto(url);
  await elisa.waitForLoadState("networkidle");
  await shot(elisa, id, elisa.getByTestId("dispute"), { parts: { blocks: "children" } });
}
async function vote(name, reason) {
  const p = name === "Elisa" ? elisa : await phone(name);
  await p.goto(url);
  await p.waitForLoadState("networkidle");
  await p.getByTestId("vote-form").getByRole("button", { name: /^Manter a prova/ }).click();
  await p.fill("#vote-reason", reason);
  await p.getByRole("button", { name: "Confirmar voto" }).click();
  await p.getByText("Seu voto: manter a prova").or(p.getByTestId("verdict")).first().waitFor();
  if (p !== elisa) await p.context().close();
}
// Four jurors (Diego's accusation counts as a vote to annul): two votes to keep the proof decide it.
await courtroom("tribunal-open");
await vote("Ana", "Dá para ver o capítulo 4 no alto da página.");
await courtroom("tribunal-vote1");
await vote("Bruno", "Ontem ela estava no capítulo 3.");
await elisa.goto(url);
await elisa.getByTestId("verdict").waitFor();
await courtroom("tribunal-verdict");
await elisa.screenshot({ path: path.join(OUT, "tribunal-page.png"), fullPage: true });

// --- Bruno's debt: Ana receives the Coca; only that item becomes a receipt ---
await ana.goto(`${APP}/dividas`);
const row = ana.locator("[data-debtor=Bruno]");
await row.locator("button[aria-expanded]").first().click();
await row.getByRole("button", { name: /^Recebi 1 Coca de Bruno/ }).waitFor();
await shot(ana, "debt-pending", row);
await row.getByRole("button", { name: /^Recebi 1 Coca de Bruno/ }).click();
const dialog = ana.locator("dialog[open]");
await dialog.getByRole("heading", { name: "Registrar recebimento?" }).waitFor();
await shot(ana, "debt-dialog", dialog);
await dialog.getByRole("button", { name: "Registrar recebimento" }).click();
await dialog.waitFor({ state: "detached" });
await row.locator("[data-receipt=coke]").waitFor();
await shot(ana, "debt-received", row);
await ana.screenshot({ path: path.join(OUT, "debts-page.png"), fullPage: true });

} catch (e) {
  // What every open page showed when it failed, for the log on the video-shots branch.
  for (const [i, { name, page }] of pages.entries()) await page.screenshot({ path: path.join(OUT, `fail-${i}-${name}.png`) }).catch(() => {});
  throw e;
} finally {
  await browser.close();
}
console.log("demo/out: done");
