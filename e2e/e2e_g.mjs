// Patch: AI review of photos (Gemini mocked)
import fs from "node:fs";
import path from "node:path";
import { ANON, APP, DIR, FIXTURE, SHOTS, SUPABASE, accessToken, assert, done, launch, loginAs, step, typingTest } from "./lib.mjs";

const calls = () => (fs.existsSync(path.join(DIR, "gemini_calls.jsonl")) ? fs.readFileSync(path.join(DIR, "gemini_calls.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : []);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await launch();
const as = (email) => loginAs(browser, email);
async function checkin(p, goal, fill) {
  if (goal === "typing") {
    await typingTest(p, p.locator("[data-goal=typing][data-state=pending]"));
    return p.locator("[data-goal=typing][data-state=done]").waitFor();
  }
  const card = p.locator(`[data-goal=${goal}]`);
  await card.getByTestId("proof-photo-input").setInputFiles(FIXTURE);
  await fill?.(card);
  await card.getByRole("button", { name: goal === "project" ? "Registrar projeto" : "Enviar prova" }).click();
  await p.locator(`[data-goal=${goal}][data-state=done]`).waitFor();
}
async function openTile(p, member, label) {
  await p.goto(`${APP}/feed`);
  await p.locator(`[data-member^="${member}"] a`, { hasText: label }).click();
  await p.waitForURL("**/checkin/**");
}

await step("check-ins sent earlier today were reviewed in the background", async () => {
  await wait(1500);
  const c = calls();
  assert(c.length >= 3, `expected reviews already, got ${c.length} Gemini calls`);
  const first = c[0];
  assert(first.key === (process.env.GEMINI_API_KEY || "test-key"), "API key header");
  assert(first.url.includes("gemini-flash-latest:generateContent"), first.url);
  assert(first.schema && first.mime === "image/jpeg" && first.imageBytes > 10000, JSON.stringify(first));
});

const ana = await as("ana@pacto.test");
await step("typing made in the app: the judge records the measured result, no photo analysis", async () => {
  await openTile(ana, "Ana", "Digitação");
  await ana.getByText(/Teste de digitação feito no app: \d+ WPM/).waitFor();
  await ana.getByText("IA conferiu").first().waitFor();
});

await step("unclear: no badge, only the description", async () => {
  await openTile(ana, "Ana", "Leitura");
  await ana.getByText("Imagem muito escura.").waitFor();
  assert((await ana.getByText("IA conferiu").count()) === 0 && (await ana.getByText("IA diverge").count()) === 0, "badge on unclear");
});

const caio = await as("caio@pacto.test");
await step("mismatch: visible timer far below the declared minutes", async () => {
  await checkin(caio, "study", async (card) => {
    await card.locator("textarea").fill("Estudei geometria analítica, retas e circunferências por bastante tempo.");
    await card.getByTestId("minutes").fill("240");
  });
  await wait(1500);
  await openTile(caio, "Caio", "Estudo");
  await caio.getByTestId("ai-review").getByText("cronômetro marcando 45 minutos").waitFor();
  await caio.getByText("Você informou 240 min. A IA identificou um cronômetro com 45 min na imagem.").waitFor();
  // The question of the day goes to the judge, and its rating of the answer is shown (it never changes the verdict).
  const sent = calls().findLast((c) => c.claim.goal === "study" && c.claim.declared_minutes === 240);
  assert(sent?.claim.study_question === (await caio.getByTestId("proof-question").innerText()), `question sent: ${JSON.stringify(sent?.claim)}`);
  await caio.getByTestId("ai-answer").getByText("responde com detalhes do assunto.").waitFor();
  await caio.screenshot({ path: `${SHOTS}/g1-ia-diverge.png`, fullPage: true });
});

const davi = await as("davi@pacto.test");
await step("mismatch opens a tribunal with the AI as accuser, never annuls by itself", async () => {
  await checkin(davi, "project", async (card) => {
    await card.getByTestId("title").fill("Foto do meu gato");
    await card.getByTestId("project-url").fill("https://github.com/Taw3s/pactus");
  });
  await wait(1500);
  await davi.goto(`${APP}/feed`);
  await davi.locator('[data-member="Caio"]').getByText("Em votação").waitFor();
  await davi.getByText(/tribuna(l|is) em andamento/i).waitFor();
  await davi.screenshot({ path: `${SHOTS}/g2-feed.png`, fullPage: true });
  await openTile(davi, "Caio", "Estudo");
  // The judge points at the proof from the bench, but leaves the decision to the jury.
  await davi.getByTestId("dispute").getByText("A foto não bateu com a meta. Quem decide é o júri.").waitFor();
  assert((await davi.getByTestId("accuser").innerText()) === "Juiz IA", "the AI is the accuser");
  assert((await davi.getByTestId("guilty-count").innerText()) === "0", "the AI does not vote");
  await davi.getByText(/Juiz IA: a foto não confere com a meta/).waitFor();
  await davi.getByTestId("vote-form").waitFor();
  await davi.screenshot({ path: `${SHOTS}/g3-tribunal-ia.png`, fullPage: true });
  // Davi's own project (cat photo) is on trial too, and he is the defendant there.
  await openTile(davi, "Davi", "Projeto");
  await davi.getByText("Você é o réu e não vota").waitFor();
  // The AI never annuls: Caio's study still counts in the ranking.
  await davi.goto(`${APP}/ranking`);
  const pts = Number(await davi.locator('[data-member="Caio"] [data-testid=points]').innerText());
  assert(pts >= 240, `Caio points ${pts}`);
});

await step("3 proofs confirmed by the AI judge: gavel + VERIFICADO on Today", async () => {
  const eva = await as("eva@pacto.test");
  for (const goal of ["study", "typing", "reading"]) {
    if (await eva.locator(`[data-goal=${goal}][data-state=done]`).count()) continue;
    await checkin(eva, goal, async (card) => {
      if (goal === "study") {
        await card.locator("textarea").fill("Revisei funções do segundo grau e fiz a lista inteira de exercícios.");
        await card.getByTestId("minutes").fill("60");
      }
      if (goal === "reading") await card.getByTestId("pages").fill("12");
    });
  }
  await eva.getByTestId("verified").waitFor({ timeout: 15000 });
  await eva.getByText("Verificado!").waitFor();
  await eva.waitForTimeout(1300);
  await eva.screenshot({ path: `${SHOTS}/g4-verificado.png` });
  // Seen once: on the next visit the seal is static (no replay).
  await eva.reload();
  await eva.getByTestId("verified").waitFor();
  assert(await eva.evaluate(() => Object.keys(localStorage).some((k) => /^pacto:judge:verified:[0-9a-f-]{36}:\d{4}-\d{2}-\d{2}$/.test(k))), "seen flag stored per user + day");
  await eva.waitForTimeout(800);
  const cls = await eva.getByTestId("verified").getByText("Verificado!").getAttribute("class");
  assert(!cls.includes("animate-[stamp"), "stamp animated again on a seen event");
});

await step("members cannot forge or edit AI reviews through the API", async () => {
  const token = await accessToken(ana);

  const h = { apikey: ANON, authorization: `Bearer ${token}`, "content-type": "application/json" };
  const forge = await fetch(`${SUPABASE}/rest/v1/checkin_reviews`, {
    method: "POST", headers: h, body: JSON.stringify({ checkin_id: "00000000-0000-0000-0000-000000000000", group_id: "00000000-0000-0000-0000-000000000000", verdict: "match", seen: "x", model: "x" }),
  });
  assert(forge.status === 401 || forge.status === 403, `forge ${forge.status}`);
  const edit = await fetch(`${SUPABASE}/rest/v1/checkin_reviews?verdict=eq.mismatch`, { method: "PATCH", headers: h, body: JSON.stringify({ verdict: "match" }) });
  assert(edit.status === 401 || edit.status === 403, `edit ${edit.status}`);
});

await step("reviewing again is idempotent (no extra Gemini call)", async () => {
  const before = calls().length;
  const id = new URL(caio.url()).pathname.split("/").pop();
  const r = await caio.evaluate(async (checkinId) => (await fetch("/api/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ checkinId }) })).json(), id);
  assert(r.status === "exists", JSON.stringify(r));
  assert(calls().length === before, "Gemini called again");
});

await browser.close();
done();
