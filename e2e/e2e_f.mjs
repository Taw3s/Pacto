// Patch: numbers, projects, day-off check-ins, monthly ranking
import { PREV_MONTH, T, monthKey, monthName, TODAY } from "./dates.mjs";
import { APP, FIXTURE, SHOTS, assert, done, launch, loginAs, sql, step } from "./lib.mjs";

const browser = await launch();
const as = (email) => loginAs(browser, email);
const typingPts = (like) =>
  Math.round(Math.min(Number(sql(`select coalesce(max(t.score), 0) from typing_tests t join members m using (user_id) where m.display_name like '${like}' and t.day = sp_today()`)), 240));
const pts = async (p, name) => Number(await p.locator(`[data-member="${name}"] [data-testid=points]`).innerText());

const ana = await as("ana@pacto.test");
await step("Ana registers a project (optional card, title required)", async () => {
  const card = ana.locator("[data-goal=project]");
  await card.getByTestId("proof-photo-input").setInputFiles(FIXTURE);
  const btn = card.getByRole("button", { name: "Registrar projeto" });
  assert(await btn.isDisabled(), "needs title");
  await card.getByTestId("title").fill("Calculadora em Python");
  await card.getByTestId("project-url").fill("https://github.com/Taw3s/pactus");
  await btn.click();
  await ana.locator("[data-goal=project][data-state=done]").waitFor();
  await ana.locator("[data-goal=project]").getByText("Calculadora em Python").waitFor();
  assert((await ana.locator("[data-goal=project]").getByTestId("attachment-input").count()) === 0, "second project form still shown");
  await ana.screenshot({ path: `${SHOTS}/f1-hoje-projeto.png`, fullPage: true });
});

await step("feed shows numbers and the project", async () => {
  await ana.goto(`${APP}/feed`);
  const card = ana.locator('[data-member^="Ana"]');
  await card.getByText("95 min").waitFor();
  await card.getByText("23 páginas").waitFor();
  await card.getByText("Projeto: Calculadora em Python").waitFor();
  await card.getByText("Dia cumprido").waitFor();
});

await step("monthly ranking: points, medals, ties and highlights", async () => {
  await ana.goto(`${APP}/ranking`);
  await ana.getByText(monthName(monthKey(TODAY))).waitFor();
  const name = sql("select display_name from members where display_name like 'Ana%'");
  // Only this month's days score: a seeded complete day = 90 min + 20 pages×2 + 20 (day).
  const seededDay = 90 + 40 + 20;
  const inMonth = (days) => days.filter((d) => monthKey(d) === monthKey(TODAY)).length;
  const expected = {
    // + today's best typing test (wpm × accuracy, made in stage b)
    [name]: inMonth([T(-5), T(-4), T(-3), T(-2), T(-1)]) * seededDay + (95 + 46 + 20) + 10 + typingPts("Ana%"),
    Bia: inMonth([T(-3)]) * seededDay, // her typing today was annulled by the tribunal
    Fab: 10, // 5 pages kept by the tribunal
    Caio: 0,
    Davi: 0,
    Eva: 0,
  };
  for (const [who, pts_] of Object.entries(expected)) assert((await pts(ana, who)) === pts_, `${who} ${await pts(ana, who)} != ${pts_}`);
  // Competition ranking ("1, 2, 2, 4"); medals only for points > 0.
  const MEDAL = ["text-gold", "text-silver", "text-bronze"];
  for (const [who, p] of Object.entries(expected)) {
    const position = 1 + Object.values(expected).filter((o) => o > p).length;
    assert((await ana.locator(`[data-member="${who}"]`).getAttribute("data-position")) === String(position), `${who} position`);
    if (p > 0 && position === 1) continue; // the leader shows the trophy instead of "1º"
    const medal = p > 0 && position <= 3 ? MEDAL[position - 1] : null;
    for (const cls of MEDAL) {
      const has = (await ana.locator(`[data-member="${who}"] .${cls}`).count()) > 0;
      assert(has === (cls === medal), `${who} ${cls} ${has ? "shown" : "missing"}`);
    }
  }
  const zeros = await ana.locator('[data-testid=points]:text-is("0")').count();
  assert(zeros === Object.values(expected).filter((p) => p === 0).length, `members tied at 0: ${zeros}`);
  await ana.screenshot({ path: `${SHOTS}/f2-ranking.png`, fullPage: true });
});

await step("check-ins on the day off are allowed and score, without obligations", async () => {
  // Make today Eva's day off (effective long ago).
  sql("update day_off_changes set weekday = extract(dow from (now() at time zone 'America/Sao_Paulo'))::int where user_id = (select user_id from members where display_name = 'Eva')");
  const eva = await as("eva@pacto.test");
  await eva.getByText("Hoje é sua folga").waitFor();
  assert((await eva.getByTestId("progress").count()) === 0, "no obligation scoreboard on day off");
  assert((await eva.getByTestId("deadline").count()) === 0, "no countdown on day off");
  const card = eva.locator("[data-goal=reading]");
  await card.getByTestId("proof-photo-input").setInputFiles(FIXTURE);
  await card.getByTestId("pages").fill("12");
  await card.getByRole("button", { name: "Enviar prova" }).click();
  await eva.locator("[data-goal=reading][data-state=done]").waitFor();
  await eva.goto(`${APP}/ranking`);
  assert((await pts(eva, "Eva")) === 24, `Eva ${await pts(eva, "Eva")}`);
  await eva.screenshot({ path: `${SHOTS}/f3-folga.png`, fullPage: true });
});

await step("previous month is browsable; no future months", async () => {
  await ana.goto(`${APP}/ranking`);
  assert((await ana.getByLabel("Próximo mês").count()) === 0, "future month link");
  await ana.getByLabel("Mês anterior").click();
  await ana.getByRole("heading", { name: monthName(PREV_MONTH) }).waitFor();
});

await browser.close();
done();
