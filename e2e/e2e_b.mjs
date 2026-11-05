// Stage (b): today's check-in
import fs from "node:fs";
import { ANON, APP, FIXTURE, SHOTS, SUPABASE, accessToken, assert, done, jpegSize, launch, newPhone, sql, step, storedFile, typingTest } from "./lib.mjs";

const browser = await launch();
const { page: p } = await newPhone(browser);

async function login(page, email) {
  await page.goto(`${APP}/login`);
  await page.fill("#email", email);
  await page.fill("#password", "senha123");
  await page.click("button:text-is('Entrar')");
  await page.waitForURL("**/hoje");
}

await step("Ana sees 3 pending goals, progress 0/3 and countdown", async () => {
  await login(p, "ana@pacto.test");
  await p.getByTestId("scoreboard").waitFor();
  assert((await p.locator("[data-state=pending]:not([data-goal=project])").count()) === 3, "3 pending");
  await p.getByText("0/3").waitFor();
  await p.getByText("Encerra em").waitFor();
  await p.screenshot({ path: `${SHOTS}/b1-hoje-vazio.png`, fullPage: true });
});

await step("study needs photo + a 40-char answer to the question of the day before enabling submit", async () => {
  const card = p.locator("[data-goal=study]");
  const btn = card.getByRole("button", { name: "Enviar prova" });
  assert(await btn.isDisabled(), "disabled without photo");
  await card.getByTestId("proof-photo-input").setInputFiles(FIXTURE);
  await card.locator("textarea").fill("curto demais");
  assert(await btn.isDisabled(), "disabled with short summary");
  await card.getByText("12 de 40").waitFor();
  await card.locator("textarea").fill("Revisei funções afins e quadráticas, fiz 20 exercícios do capítulo 3.");
  await card.getByTestId("minutes").fill("45");
  assert(await btn.isDisabled(), "disabled with < 60 minutes");
  await card.getByTestId("minutes").fill("95");
  assert(await btn.isEnabled(), "enabled");
  const prompt = await card.getByTestId("study-question").getAttribute("data-prompt");
  await btn.click();
  await p.locator("[data-goal=study][data-state=done]").waitFor();
  await p.getByText("1/3").waitFor();
  // The summary answers the question of the day, and the proof keeps which one it was.
  assert(sql("select study_prompt from checkins where goal='study'") === prompt, `stored prompt vs ${prompt}`);
});

await step("photo was compressed to JPEG with max side 1600px, plus a 480px thumbnail", async () => {
  const name = sql("select photo_path from checkins where goal='study'");
  const full = await storedFile(name);
  const size = jpegSize(full);
  assert(size?.width === 1600 && size?.height === 1200, `got ${JSON.stringify(size)}`);
  const thumb = jpegSize(await storedFile(name.replace(/\.jpg$/, ".thumb.jpg")));
  assert(thumb?.width === 480 && thumb?.height === 360, `thumb ${JSON.stringify(thumb)}`);
  console.log(`    JPEG 1600x1200, ${Math.round(full.length / 1024)} KB (original PNG ${Math.round(fs.statSync(FIXTURE).size / 1024)} KB)`);
});

await step("check-in day is today in São Paulo (set by the database)", async () => {
  const day = sql("select day from checkins where goal='study'");
  const sp = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  assert(day === sp, `day ${day} vs SP ${sp}`);
});

await step("typing + reading complete the day", async () => {
  // Typing is a test inside the app: no photo, no form.
  const typing = p.locator("[data-goal=typing][data-state=pending]");
  assert((await typing.locator("input[type=file]").count()) === 0, "typing still asks for a photo");
  // Sound is on by default; one tap turns it off and the choice survives a reload.
  // The board loads on demand: wait for the button to answer instead of reading it right after the click.
  const sound = typing.getByTestId("typing-sounds");
  await typing.locator('[data-testid="typing-sounds"][aria-pressed="true"]').waitFor();
  const off = typing.locator('[data-testid="typing-sounds"][aria-pressed="false"]');
  for (let i = 0; i < 5 && !(await off.count()); i++) {
    await sound.click();
    await off.waitFor({ timeout: 2000 }).catch(() => {});
  }
  assert((await off.count()) === 1 && (await off.getAttribute("aria-label")) === "Som desligado", "sound turns off");
  await p.reload();
  await typing.locator('[data-testid="typing-sounds"][aria-pressed="false"]').waitFor();
  await typingTest(p, typing);
  await p.locator("[data-goal=typing][data-state=done]").waitFor();
  for (const goal of ["reading"]) {
    const card = p.locator(`[data-goal=${goal}]`);
    assert((await card.locator("textarea").count()) === 0, "no summary field");
    await card.getByTestId("proof-photo-input").setInputFiles(FIXTURE);
    if (goal === "reading") {
      assert(await card.getByRole("button", { name: "Enviar prova" }).isDisabled(), "reading needs pages");
      await card.getByTestId("pages").fill("23");
    }
    // The proof is saved but its answer is lost (the phone switched networks): no error, the proof shows (friends' report, 27/10).
    let dropped = 0;
    await p.route("**/rest/v1/checkins*", async (route) => {
      if (route.request().method() !== "POST" || dropped++) return route.continue();
      await route.fetch();
      await route.abort("failed");
    });
    await card.getByRole("button", { name: "Enviar prova" }).click();
    await p.locator(`[data-goal=${goal}][data-state=done]`).waitFor();
    await p.unroute("**/rest/v1/checkins*");
    assert(dropped === 1, `answer dropped ${dropped} times`);
    assert((await p.getByText("Não foi possível enviar").count()) === 0, "error shown for a saved proof");
  }
  await p.getByTestId("scoreboard").getByText("Dia cumprido").waitFor();
  await p.getByText("3/3").waitFor();
  await p.screenshot({ path: `${SHOTS}/b2-hoje-cumprido.png`, fullPage: true });
});

await step("after reload: proofs shown, no way to edit", async () => {
  await p.reload();
  assert((await p.locator("[data-state=done]").count()) === 3, "3 done");
  assert((await p.getByTestId("attachment-input").count()) === 1, "only the optional project upload remains");
  await p.locator("[data-goal=study]").getByText("95 min").waitFor();
  await p.locator("[data-goal=reading]").getByText("23 páginas").waitFor();
  assert((await p.locator("[data-goal=study] img:not(.sprite)").evaluate((img) => img.naturalWidth)) > 0, "signed image loads");
});

await step("API cannot back-date, edit, or upload to another user's folder", async () => {
  const token = await accessToken(p);
  const h = { apikey: ANON, authorization: `Bearer ${token}`, "content-type": "application/json" };
  const backdate = await fetch(`${SUPABASE}/rest/v1/checkins`, {
    method: "POST", headers: h, body: JSON.stringify({ goal: "typing", photo_path: "x", day: "2026-01-01" }),
  });
  assert(backdate.status >= 400, `backdate status ${backdate.status}`);
  const patch = await fetch(`${SUPABASE}/rest/v1/checkins?goal=eq.study`, {
    method: "PATCH", headers: h, body: JSON.stringify({ summary: "editado depois de enviado, o que não pode acontecer" }),
  });
  assert(patch.status >= 400, `patch status ${patch.status}`);
  const del = await fetch(`${SUPABASE}/rest/v1/checkins?goal=eq.study`, { method: "DELETE", headers: h });
  assert(del.status >= 400, `delete status ${del.status}`);
  const bia = sql("select user_id from members where display_name='Bia'");
  const grp = sql("select id from groups limit 1");
  const up = await fetch(`${SUPABASE}/storage/v1/object/media/${grp}/${bia}/fake.jpg`, {
    method: "POST", headers: { ...h, "content-type": "image/jpeg" }, body: "x",
  });
  // Storage answers an RLS refusal with 400 or 403 depending on the version: never 2xx.
  assert(up.status === 400 || up.status === 403, `foreign upload status ${up.status}`);
  assert(!(await storedFile(`${grp}/${bia}/fake.jpg`)), "foreign file stored");
});

await browser.close();
done();
