// Stage (j): retaking a proof condemned by the tribunal (same day only) and extra study sessions.
import AxeBuilder from "@axe-core/playwright";
import { APP, FIXTURE, SHOTS, assert, done, launch, loginAs, sql, step, typingTest } from "./lib.mjs";

const browser = await launch();
const davi = await loginAs(browser, "davi@pacto.test");

/** Fills and sends a goal form found by its data-state ("pending", "retake" or "extra"). */
async function send(goal, state, fill = async () => {}) {
  const card = davi.locator(`[data-goal=${goal}][data-state=${state}]`);
  if (goal === "typing") {
    await typingTest(davi, card);
    return card.waitFor({ state: "detached" });
  }
  await card.getByTestId("proof-photo-input").setInputFiles(FIXTURE);
  await fill(card);
  await card.getByRole("button", { name: /Enviar prova|Enviar nova prova|Somar sessão/ }).click();
  await card.waitFor({ state: "detached" });
}

/** Annuls a proof as if the group had voted (the vote flow itself is covered in stage e). */
function annul(photoLike) {
  sql(`
    insert into public.disputes (checkin_id, reason, by_ai)
    select id, 'Juiz IA: teste de refazer', true from public.checkins where photo_path like '${photoLike}';
    alter table public.dispute_votes disable trigger dispute_votes_before_insert;
    insert into public.dispute_votes (dispute_id, voter_id, upheld, reason)
    select d.id, m.user_id, true, 'Culpado no teste'
    from public.disputes d join public.checkins c on c.id = d.checkin_id
    join public.members m on m.group_id = c.group_id and m.user_id <> c.user_id
    where c.photo_path like '${photoLike}';
    alter table public.dispute_votes enable trigger dispute_votes_before_insert;`);
}

const daviId = sql("select user_id from public.members where display_name = 'Davi'");
let firstTyping;

await step("Davi sends typing; the tribunal condemns it; Hoje offers a retake until 23:59", async () => {
  await send("typing", "pending");
  firstTyping = sql(`select photo_path from public.checkins where user_id = '${daviId}' and goal = 'typing' and day = public.sp_today()`);
  annul(firstTyping);
  await davi.reload();
  const retake = davi.locator("[data-goal=typing][data-state=retake]");
  await retake.getByText(/até 23:59/).waitFor();
  await davi.locator("[data-goal=typing][data-state=annulled]").waitFor();
  await davi.screenshot({ path: `${SHOTS}/j1-refazer.png`, fullPage: true });
  // Same contrast workaround as stage h (axe skips text over the dithered background).
  await davi.addStyleTag({ content: "body{background-image:none!important;background-color:#2a2d32!important}" });
  const axe = await new AxeBuilder({ page: davi }).include("[data-goal=typing]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const bad = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  assert(bad.length === 0, bad.map((v) => `${v.id}×${v.nodes.length}`).join(", "));
});

await step("the retake counts: typing is done again and the tribunal links to the new proof", async () => {
  await send("typing", "retake");
  await davi.locator("[data-goal=typing][data-state=done]").waitFor();
  assert((await davi.locator("[data-goal=typing]").count()) === 1, "only the latest typing proof is listed");
  const oldId = sql(`select id from public.checkins where photo_path = '${firstTyping}'`);
  await davi.goto(`${APP}/checkin/${oldId}`);
  await davi.getByTestId("retake-link").getByText("refez esta prova").click();
  await davi.waitForURL((u) => !u.pathname.endsWith(oldId));
  await davi.getByText("Digitação (refeita)").waitFor();
});

await step("a second retake of a proof that stands is refused", async () => {
  await davi.goto(`${APP}/hoje`);
  assert((await davi.locator("[data-goal=typing][data-state=retake]").count()) === 0, "no retake form for a valid proof");
});

await step("extra study sessions add minutes, need the study proof and show in the feed", async () => {
  assert((await davi.getByRole("button", { name: "Sessão extra de estudo" }).count()) === 0, "extra before the study proof");
  await send("study", "pending", async (card) => {
    await card.getByTestId("minutes").fill("60");
    await card.locator("textarea").fill("Estudei limites e derivadas com exercícios resolvidos do livro.");
  });
  await davi.getByRole("button", { name: "Sessão extra de estudo" }).click();
  await send("study", "extra", async (card) => card.getByTestId("minutes").fill("45"));
  const extras = davi.getByTestId("extra-sessions");
  await extras.getByText("Sessão extra", { exact: true }).waitFor();
  await extras.getByText("45 min").waitFor();
  await davi.screenshot({ path: `${SHOTS}/j2-sessao-extra.png`, fullPage: true });
  await davi.goto(`${APP}/feed`);
  await davi.locator('[data-member="Davi"]').getByText("60 min + 45 extra").waitFor();
});

await browser.close();
done();
