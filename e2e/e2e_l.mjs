// Stage (l): old-photo warning, stamps on proofs and the weekly summary push (after stage k).
import fs from "node:fs";
import path from "node:path";
import { ANON, APP, CRON_HEADERS, DIR, SUPABASE, accessToken, assert, done, launch, loginAs, sql, step, typingTest } from "./lib.mjs";

const browser = await launch();
const pushes = () => {
  const file = path.join(DIR, "push_calls.jsonl");
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
};

/** A real JPEG (drawn by the browser) with an EXIF DateTimeOriginal `daysAgo` days back. */
async function oldJpeg(page, daysAgo) {
  const b64 = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = "#2f6fd6";
    g.fillRect(0, 0, 64, 64);
    return c.toDataURL("image/jpeg").split(",")[1];
  });
  const jpeg = Buffer.from(b64, "base64");
  // Counted from today in São Paulo, as the app does (the runner's clock may already be on the next day in UTC).
  const sp = new Date(Date.now() - 3 * 3_600_000);
  const d = new Date(Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth(), sp.getUTCDate() - daysAgo));
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getUTCFullYear()}:${pad(d.getUTCMonth() + 1)}:${pad(d.getUTCDate())} 12:00:00`;
  // TIFF (little endian): IFD0 -> Exif IFD -> DateTimeOriginal
  const t = Buffer.alloc(64);
  t.write("II", 0, "ascii");
  t.writeUInt16LE(42, 2);
  t.writeUInt32LE(8, 4);
  t.writeUInt16LE(1, 8);
  t.writeUInt16LE(0x8769, 10); t.writeUInt16LE(4, 12); t.writeUInt32LE(1, 14); t.writeUInt32LE(26, 18);
  t.writeUInt16LE(1, 26);
  t.writeUInt16LE(0x9003, 28); t.writeUInt16LE(2, 30); t.writeUInt32LE(20, 32); t.writeUInt32LE(44, 36);
  t.write(stamp, 44, "ascii");
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, 0, 0]), Buffer.from("Exif\0\0", "binary"), t]);
  app1.writeUInt16BE(app1.length - 2, 2);
  return Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]);
}

// Someone who has not sent today's reading yet.
const who = ["bia", "caio", "eva", "ana"].find(
  (n) => sql(`select count(*) from public.checkins c join auth.users u on u.id = c.user_id where u.email = '${n}@pacto.test' and c.goal = 'reading' and c.day = public.sp_today() and not c.extra`) === "0",
);
let proofUrl;

await step("a photo the phone dates 3 days back: warned before sending, flagged for the group", async () => {
  assert(who, "nobody left with a pending reading");
  const p = await loginAs(browser, `${who}@pacto.test`);
  const card = p.locator("[data-goal=reading][data-state=pending]");
  await card.getByTestId("proof-photo-input").setInputFiles({ name: "velha.jpg", mimeType: "image/jpeg", buffer: await oldJpeg(p, 3) });
  await card.getByTestId("photo-age-note").getByText("Foto de 3 dias atrás").waitFor();
  await card.getByTestId("pages").fill("7");
  await card.getByRole("button", { name: "Enviar prova" }).click();
  const row = p.locator("[data-goal=reading][data-state=done]");
  await row.getByText("Data anterior").waitFor();
  await row.click();
  await p.waitForURL("**/checkin/**");
  proofUrl = p.url();
  await p.getByTestId("photo-age").getByText(/Enviada em .*, 3 dias depois\./).waitFor();
  // The owner sees the stamps but cannot stamp their own proof.
  assert(await p.getByTestId("reactions").locator('[data-reaction="respeito"]').isDisabled(), "owner can stamp own proof");
});

await step("friends stamp the proof; it stays after reload and the feed counts it", async () => {
  const friend = who === "ana" ? "bia" : "ana";
  const p = await loginAs(browser, `${friend}@pacto.test`);
  await p.goto(proofUrl);
  const btn = p.getByTestId("reactions").locator('[data-reaction="respeito"]');
  await btn.click();
  await p.waitForFunction(() => document.querySelector('[data-reaction="respeito"]')?.getAttribute("aria-pressed") === "true");
  await p.waitForTimeout(500);
  await p.reload();
  await p.getByTestId("reactions").getByRole("button", { name: /Ver quem carimbou · 1/ }).click();
  await p.getByTestId("stamp-names").getByText(/Respeito:\s*você/).waitFor();
  await p.goto(`${APP}/feed`);
  await p.getByTestId("stamp-count").getByText("1 carimbo").first().waitFor();
  // The feed marks the file's earlier date beside the metadata, never over the photo.
  assert((await p.getByTestId("photo-older").count()) >= 1, "feed shows the earlier date");
});

await step("weekly summary: one push per subscribed member a day", async () => {
  const before = pushes().length;
  const r1 = await fetch(`${APP}/api/cron/weekly`, { headers: CRON_HEADERS }).then((r) => r.json());
  assert(r1.summarized >= 1, `summarized ${JSON.stringify(r1)}`);
  for (let i = 0; i < 20 && pushes().length === before; i++) await new Promise((r) => setTimeout(r, 250));
  assert(pushes().length > before, "a summary reached the push service");
  const r2 = await fetch(`${APP}/api/cron/weekly`, { headers: CRON_HEADERS }).then((r) => r.json());
  assert(r2.summarized === 0, `second run ${JSON.stringify(r2)}`);
});

await step("typing: another attempt over a text keeps the place, English is offered, the ranking keeps records per device, mode and language, and the server refuses a faked run", async () => {
  const p = await loginAs(browser, "ana@pacto.test");
  await p.getByRole("button", { name: /Tentar de novo \(2 restantes\)/ }).click();
  const again = p.locator("[data-goal=typing][data-state=again]");
  await again.getByTestId("typing-mode-text").click();
  await again.getByTestId("typing-texts").getByRole("tab", { name: "SQL e dados" }).click();
  await again.getByTestId("typing-text-sql-o-que-e").click();
  await again.getByTestId("typing-preview").getByText(/SQL é a linguagem/).waitFor();
  await typingTest(p, again);
  await p.getByTestId("typing-moved").getByText(/Avançou \d+ palavras? em “O que é SQL”/).waitFor();
  await p.getByRole("button", { name: /Tentar de novo \(1 restante\)/ }).waitFor();
  // The proof follows the day's best test: Hoje, the feed and the proof page draw its card.
  const best = sql("select round(max(t.wpm))::int from typing_tests t join members m using (user_id) where m.display_name like 'Ana%' and t.day = sp_today() and t.score = (select max(score) from typing_tests t2 where t2.user_id = t.user_id and t2.day = t.day)");
  await p.locator("[data-goal=typing][data-state=done]").getByTestId("typing-card").getByText(best).waitFor();
  await p.goto(`${APP}/feed`);
  const tile = p.locator('[data-member^="Ana"] a', { hasText: "Digitação" });
  await tile.getByTestId("typing-card").getByText(best).waitFor();
  await tile.click();
  await p.waitForURL("**/checkin/**");
  await p.getByTestId("typing-card").getByText(best, { exact: true }).waitFor();
  await p.goto(`${APP}/hoje`);
  const place = Number(sql("select p.words from typing_progress p join members m using (user_id) where m.display_name like 'Ana%' and p.text_id = 'sql-o-que-e'"));
  assert(place > 0, `place ${place}`);
  // The choice is remembered, with the place shown next to the text.
  await p.getByRole("button", { name: /Tentar de novo/ }).click();
  // The saved choice is applied right after the panel mounts: wait for it rather than read once.
  await again.locator('[data-testid="typing-mode-text"][aria-checked="true"]').waitFor({ timeout: 5000 }).catch(() => {
    throw new Error("mode remembered");
  });
  const sqlText = again.getByTestId("typing-text-sql-o-que-e");
  await again.locator('[data-testid="typing-text-sql-o-que-e"][aria-checked="true"]').waitFor({ timeout: 5000 }).catch(() => {
    throw new Error("text remembered");
  });
  await sqlText.getByText(/^\d+%$/).waitFor();
  await again.getByTestId("typing-preview").getByText(/^Continua em:/).waitFor();
  // In English the list shows the English texts.
  await again.getByTestId("typing-lang-en").click();
  await again.getByTestId("typing-texts").getByRole("tab", { name: "SQL e dados" }).click();
  await again.getByTestId("typing-text-en-sql-what").waitFor();
  assert((await again.getByTestId("typing-text-sql-o-que-e").count()) === 0, "Portuguese texts in the English list");
  await again.getByTestId("typing-lang-pt").click();
  await p.goto(`${APP}/ranking`);
  // Stage b typed on a computer, this attempt on a phone.
  const records = p.getByTestId("typing-records");
  await records.locator('[data-device="pc"] [data-mode="words"][data-lang="pt"]').getByText(/Ana.*/).first().waitFor();
  await records.locator('[data-device="mobile"] [data-mode="text"][data-lang="pt"]').getByText(/Ana.*/).first().waitFor();
  // Finishing right after starting (a faked clock) is refused by the server.
  const token = await accessToken(p);
  const h = { apikey: ANON, authorization: `Bearer ${token}`, "content-type": "application/json" };
  // A Portuguese text cannot be started as an English test.
  const wrong = await fetch(`${SUPABASE}/rest/v1/rpc/start_typing_test`, {
    method: "POST", headers: h, body: JSON.stringify({ p_device: "pc", p_mode: "text", p_text: "sql-o-que-e", p_lang: "en" }),
  });
  assert(wrong.status >= 400, `language mismatch accepted: ${wrong.status}`);
  const start = await fetch(`${SUPABASE}/rest/v1/rpc/start_typing_test`, {
    method: "POST", headers: h, body: JSON.stringify({ p_device: "pc", p_mode: "text", p_text: "sql-o-que-e" }),
  }).then((r) => r.json());
  assert(start[0].start_word === place, `continues at ${start[0].start_word}, saved ${place}`);
  const fin = await fetch(`${SUPABASE}/rest/v1/rpc/finish_typing_test`, { method: "POST", headers: h, body: JSON.stringify({ p_test: start[0].test_id, p_correct: 50, p_typed: 50 }) });
  assert(fin.status >= 400, `faked run accepted: ${fin.status}`);
  // That was the third attempt: no more today.
  await p.goto(`${APP}/hoje`);
  assert((await p.getByRole("button", { name: /Tentar de novo/ }).count()) === 0, "a fourth attempt is offered");
});

await step("typing: a 5-minute test is timed by the server for its length and keeps its own record", async () => {
  const p = await loginAs(browser, "caio@pacto.test");
  await p.getByRole("button", { name: /Tentar de novo/ }).click();
  const again = p.locator("[data-goal=typing][data-state=again]");
  await again.getByTestId("typing-minutes-5").click();
  await again.getByText(/5 minutos digitando/).waitFor();
  // A wrong word can be reopened with Backspace and fixed (as on Monkeytype); a right one cannot.
  await again.getByRole("button", { name: "Começar teste" }).click();
  const input = again.getByTestId("typing-input");
  await input.waitFor();
  const first = await again.getByTestId("typing-word-current").innerText();
  await input.pressSequentially("zzz ", { delay: 30 });
  await input.press("Backspace");
  assert((await input.inputValue()) === "zzz", `reopened ${await input.inputValue()}`);
  await input.fill("");
  await input.pressSequentially(`${first} `, { delay: 30 });
  await input.press("Backspace");
  assert((await input.inputValue()) === "", "a right word was reopened");
  while ((await again.getByTestId("typing-test").getAttribute("data-phase").catch(() => "gone")) === "running") {
    const word = await again.getByTestId("typing-word-current").innerText().catch(() => "");
    if (!word) break;
    await input.pressSequentially(`${word} `, { delay: 60 }).catch(() => {});
  }
  await p.getByTestId("typing-moved").or(p.getByRole("button", { name: /Tentar de novo/ })).first().waitFor();
  const row = sql("select t.minutes || '|' || t.seconds from typing_tests t join members m using (user_id) where m.display_name = 'Caio' order by t.started_at desc limit 1");
  // e2e/setup.sql makes a "minute" last 3 seconds.
  assert(row === "5|15", `last test ${row}`);
  await p.goto(`${APP}/ranking`);
  await p.getByTestId("typing-records").locator('[data-minutes="5"]').getByText(/Caio/).first().waitFor();
});

await step("a proof older than 30 days keeps only its thumbnail and loses its PDF, and the proof page says so", async () => {
  // Move one of Ana's study proofs to 31 days ago (a day she has no study proof), then run the daily cron.
  const row = sql(`select c.id || '|' || c.photo_path || '|' || c.goal from checkins c join auth.users u on u.id = c.user_id
    where u.email = 'ana@pacto.test' and c.goal = 'study' and not c.extra and c.typing_test_id is null order by c.created_at limit 1`);
  assert(row, "Ana has a study proof");
  const [id, photo, goal] = row.split("|");
  // While the proof is recent, Ana attaches a PDF through the app's route (0030 retention target).
  const p = await loginAs(browser, "ana@pacto.test");
  await p.goto(`${APP}/checkin/${id}`);
  const upload = (checkinId) =>
    p.evaluate(async (cid) => {
      const form = new FormData();
      form.set("file", new File(["%PDF-1.4\n% retention test\n%%EOF\n"], "material.pdf", { type: "application/pdf" }));
      return (await fetch(`/api/checkins/${cid}/attachments`, { method: "POST", body: form })).status;
    }, checkinId);
  assert((await upload(id)) === 201, "the PDF was not accepted");
  const pdf = sql(`select storage_path from checkin_attachments where checkin_id = '${id}'`);
  const hasFile = () => sql(`select count(*) from storage.objects where bucket_id = 'attachments' and name = '${pdf}'`) === "1";
  assert(pdf && hasFile(), "the PDF is stored");
  const old = sql(`select (sp_today() - 31)::text`);
  sql(`delete from checkins c using auth.users u where u.id = c.user_id and u.email = 'ana@pacto.test' and c.day = '${old}' and c.goal = '${goal}' and c.id <> '${id}'`);
  sql(`update checkins set day = '${old}' where id = '${id}'`);
  const thumb = photo.replace(/\.jpg$/, ".thumb.jpg");
  const has = (name) => sql(`select count(*) from storage.objects where name = '${name}'`) === "1";
  assert(has(photo) && has(thumb), "the proof has its photo and thumbnail");
  const r = await fetch(`${APP}/api/cron/remind`, { headers: CRON_HEADERS }).then((res) => res.json());
  assert(r.trimmed >= 1, `trimmed ${JSON.stringify(r)}`);
  assert(!has(photo), "the full photo is still stored");
  assert(has(thumb), "the thumbnail was deleted");
  assert(r.attachmentsExpired >= 1, `attachments ${JSON.stringify(r)}`);
  assert(!hasFile(), "the PDF is still stored");
  assert(sql(`select expired_at is not null from checkin_attachments where checkin_id = '${id}'`) === "t", "the attachment row was not stamped");
  await p.goto(`${APP}/checkin/${id}`);
  await p.getByTestId("photo-trimmed").waitFor();
  assert(await p.locator("figure img").first().evaluate((img) => img.complete && img.naturalWidth > 0), "no image shown");
  // The block stays with the name and says the file is gone; no download, no form to send it again.
  const block = p.getByTestId("checkin-attachments");
  await block.getByText("material.pdf").waitFor();
  await block.getByTestId("attachment-expired").waitFor();
  assert((await block.getByRole("link", { name: /Baixar PDF/ }).count()) === 0, "a download link for a deleted file");
  assert((await block.locator("form").count()) === 0, "the owner can upload the expired file again");
  // Refused by age first (400); the (checkin_id, kind) row would refuse it too.
  assert((await upload(id)) === 400, "the old proof accepted its file again");
  // An old study proof with no file cannot get one either: it would be deleted the next night.
  const other = sql(`select c.id from checkins c join auth.users u on u.id = c.user_id where u.email = 'ana@pacto.test'
    and c.goal = 'study' and c.id <> '${id}' and not exists (select 1 from checkin_attachments a where a.checkin_id = c.id) limit 1`);
  if (other) {
    const day = sql(`select day from checkins where id = '${other}'`);
    sql(`update checkins set day = sp_today() - 40 where id = '${other}'`);
    assert((await upload(other)) === 400, "an old proof accepted a file");
    sql(`update checkins set day = '${day}' where id = '${other}'`);
  }
  await p.context().close();
});

await browser.close();
done();
