// Stage (i): daily chest, collection, weekly challenge and push notifications (fake push service).
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ANON, APP, CRON_HEADERS, DIR, FIXTURE, SHOTS, SUPABASE, accessToken, assert, done, launch, loginAs, step, typingTest } from "./lib.mjs";

const browser = await launch();
const as = (email) => loginAs(browser, email);
const pushes = () => {
  const file = path.join(DIR, "push_calls.jsonl");
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const ana = await as("ana@pacto.test");
let won;
await step("Ana closed the day: the daily chest spins, opens and reveals an item, once", async () => {
  const card = ana.getByTestId("chest-daily");
  await card.getByRole("button", { name: "Abrir baú" }).click();
  await card.getByTestId("chest-item").waitFor();
  won = await card.getByTestId("chest-item").innerText();
  await ana.waitForTimeout(400);
  await ana.screenshot({ path: `${SHOTS}/i1-bau-aberto.png` });
  await ana.reload();
  await ana.getByTestId("chest-daily").getByTestId("chest-item").waitFor();
  assert((await ana.getByTestId("chest-daily").getByTestId("chest-item").innerText()) === won, "same item after reload");
  assert((await ana.getByRole("button", { name: "Abrir baú" }).count()) === 0, "chest can be opened again");
});

await step("the item shows in Ana's collection (Perfil), seen by the group", async () => {
  await ana.getByRole("link", { name: "Perfil" }).click();
  await ana.waitForURL("**/historico/**");
  const shelf = ana.getByTestId("collection");
  await shelf.waitFor();
  assert((await ana.getByTestId("collection-count").innerText()) === "1/18", await ana.getByTestId("collection-count").innerText());
  assert((await shelf.locator('[data-owned="true"]').count()) === 1, "one owned slot");
  // Silhouettes are not buttons and never name the object they hide.
  assert((await shelf.locator('[data-owned="false"] button').count()) === 0, "silhouettes are not interactive");
  assert((await shelf.locator('[data-owned="false"]').filter({ hasText: won }).count()) === 0, "silhouettes hide names");
  await ana.screenshot({ path: `${SHOTS}/i2-colecao.png`, fullPage: true });

  // The owned object opens its card; Escape closes it and focus goes back to the object.
  const item = shelf.getByRole("button", { name: new RegExp(won, "i") });
  await item.click();
  const card = ana.getByTestId("collection-item-dialog");
  await card.getByRole("heading", { name: new RegExp(won, "i") }).waitFor();
  assert((await card.getByTestId("collection-item-copies").innerText()) === "Você tem 1 cópia.", "own copies line");
  assert(await ana.evaluate(() => document.activeElement?.getAttribute("aria-label") === "Fechar"), "focus starts on Fechar");
  await ana.screenshot({ path: `${SHOTS}/i2b-ficha.png` });
  await ana.keyboard.press("Escape");
  await card.waitFor({ state: "hidden" });
  assert(await item.evaluate((el) => el === document.activeElement), "focus returns to the object");
});

const davi = await as("davi@pacto.test");
await step("another member sees Ana's object card without \"Você tem\"", async () => {
  await davi.goto(ana.url());
  const shelf = davi.getByTestId("collection");
  await shelf.getByRole("button", { name: new RegExp(won, "i") }).click();
  const card = davi.getByTestId("collection-item-dialog");
  assert((await card.getByTestId("collection-item-copies").innerText()) === "1 cópia na coleção.", "other member copies line");
  await card.getByRole("button", { name: "Fechar" }).last().click();
  await card.waitFor({ state: "hidden" });
  await davi.goto(`${APP}/hoje`);
});
await step("someone who didn't close the day sees a locked chest and the weekly challenge", async () => {
  await davi.getByTestId("daily-chest-card").getByText("Feche as 3 metas").waitFor();
  assert((await davi.getByRole("button", { name: "Abrir baú" }).count()) === 0, "open button without closing the day");
  const week = davi.getByTestId("weekly-challenge");
  await week.waitFor();
  assert((await week.locator("[data-week-member]").count()) === 6, "6 members in the challenge");
  // Nobody can open a chest through the API without earning it.
  const token = await accessToken(davi);
  const r = await fetch(`${SUPABASE}/rest/v1/rpc/open_chest`, {
    method: "POST", headers: { apikey: ANON, authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ p_kind: "daily" }),
  });
  assert(r.status >= 400, `open_chest without the day: ${r.status}`);
});

await step("push: Davi turns notices on (fake push service), Caio closes the day -> Davi is nudged once", async () => {
  // A real browser subscription needs Google/Apple push servers; store a valid one for the fake service.
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();
  const b64u = (b) => b.toString("base64url");
  const token = await accessToken(davi);
  const sub = await fetch(`${SUPABASE}/rest/v1/push_subscriptions`, {
    method: "POST",
    headers: { apikey: ANON, authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ endpoint: "http://127.0.0.1:54500/push/davi", p256dh: b64u(ecdh.getPublicKey()), auth: b64u(crypto.randomBytes(16)) }),
  });
  assert(sub.status === 201, `subscribe ${sub.status} ${await sub.text()}`);

  const before = pushes().filter((p) => p.path === "/push/davi").length;
  const caio = await as("caio@pacto.test");
  await typingTest(caio, caio.locator("[data-goal=typing][data-state=pending]"));
  await caio.locator("[data-goal=typing][data-state=done]").waitFor();
  for (const goal of ["reading"]) {
    const card = caio.locator(`[data-goal=${goal}]`);
    await card.getByTestId("proof-photo-input").setInputFiles(FIXTURE);
    if (goal === "reading") await card.getByTestId("pages").fill("9");
    await card.getByRole("button", { name: "Enviar prova" }).click();
    await caio.locator(`[data-goal=${goal}][data-state=done]`).waitFor();
  }
  for (let i = 0; i < 40 && pushes().filter((p) => p.path === "/push/davi").length === before; i++) await wait(250);
  const got = pushes().filter((p) => p.path === "/push/davi");
  assert(got.length === before + 1, `Davi got ${got.length - before} nudges`);
  const last = got.at(-1);
  assert(last.vapid && last.encoding === "aes128gcm" && last.bytes > 50, `encrypted, signed push: ${JSON.stringify(last)}`);
  // Calling again the same day sends nothing new.
  const again = await caio.evaluate(async () => (await fetch("/api/progress", { method: "POST" })).json());
  assert(again.nudged === 0, `second nudge ${JSON.stringify(again)}`);

  // Caio opens his chest with reduced motion: the result shows at once, without the rising item.
  // A second tab opened before then gets "Este baú já foi aberto." and the same item, not a new draw.
  await caio.goto(`${APP}/hoje`);
  const other = await caio.context().newPage();
  await other.goto(`${APP}/hoje`);
  await caio.emulateMedia({ reducedMotion: "reduce" });
  const card = caio.getByTestId("chest-daily");
  await card.getByRole("button", { name: "Abrir baú" }).click();
  await card.getByTestId("chest-item").waitFor();
  const item = await card.getByTestId("chest-item").innerText();
  await card.getByText("Você recebeu", { exact: true }).waitFor();
  const moving = await card.getByTestId("chest-item-sprite").evaluate((el) => getComputedStyle(el).animationName !== "none" && parseFloat(getComputedStyle(el).animationDuration) > 0);
  assert(!moving, "no rising animation with reduced motion");
  const late = other.getByTestId("chest-daily");
  await late.getByRole("button", { name: "Abrir baú" }).click();
  await late.getByText("Este baú já foi aberto.", { exact: true }).waitFor();
  assert((await late.getByText("Você recebeu", { exact: true }).count()) === 0, "no second \"Você recebeu\" on a reopened chest");
  assert((await late.getByTestId("chest-item").innerText()) === item, "second tab shows the stored item");
  await other.close();
});

await step("daily reminder (cron): pending members get one reminder a day", async () => {
  const before = pushes().filter((p) => p.path === "/push/davi").length;
  const r1 = await fetch(`${APP}/api/cron/remind`, { headers: CRON_HEADERS }).then((r) => r.json());
  assert(r1.reminded >= 1, `reminded ${JSON.stringify(r1)}`);
  const r2 = await fetch(`${APP}/api/cron/remind`, { headers: CRON_HEADERS }).then((r) => r.json());
  assert(r2.reminded === 0, `second run reminded ${JSON.stringify(r2)}`);
  assert(pushes().filter((p) => p.path === "/push/davi").length === before + 1, "exactly one reminder for Davi");
});

await step("settings show the notices section", async () => {
  await davi.goto(`${APP}/config`);
  await davi.getByTestId("push-settings").waitFor();
  await davi.getByRole("heading", { name: /Avisos/ }).waitFor();
});

await browser.close();
done();
