// Stage (o): a brand-new challenge — "Primeiros passos" on Hoje and the invite link (/join?convite=CODE)
// through e-mail sign-up, the login and Google. Runs after (m) and (n): Caio and Bia have no group by then.
import AxeBuilder from "@axe-core/playwright";
import { APP, SHOTS, assert, done, launch, newPhone, sql, step } from "./lib.mjs";

const browser = await launch();
const OWNER = { name: "Lia", email: "lia@pacto.test" };
let code = "";
let link = "";
// Lia's phone, kept across steps: what "Primeiros passos" remembers lives in this browser's storage.
let lia;

const focused = (p) => p.evaluate(() => document.activeElement?.id || document.activeElement?.textContent?.trim());
const card = (p) => p.getByTestId("first-steps");
const step3 = (p) => card(p).locator("[data-step=proof]");

async function signIn(email) {
  const { ctx, page } = await newPhone(browser);
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: APP });
  await page.goto(`${APP}/login`);
  await page.fill("#email", email);
  await page.fill("#password", "senha123");
  await page.click("button:text-is('Entrar')");
  return page;
}

await step("a new challenge opens on Hoje with 'Seu grupo começa aqui' (alone, the real menu, the full link)", async () => {
  const { ctx, page: p } = await newPhone(browser);
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: APP });
  await p.goto(`${APP}/join?criar=1`);
  await p.fill("#name", OWNER.name);
  await p.fill("#email", OWNER.email);
  await p.fill("#password", "senha123");
  await p.getByRole("button", { name: "Criar conta" }).click();
  await p.waitForURL("**/join?step=code&criar=1");
  await p.fill("#group", "Desafio da Lia com um nome bem comprido para quebrar a linha");
  await p.getByRole("button", { name: "Criar desafio" }).click();
  await p.waitForURL("**/hoje");
  code = sql(`select g.invite_code from groups g join members m on m.group_id = g.id where m.display_name = '${OWNER.name}'`);
  link = `${APP}/join?convite=${code}`;
  await card(p).getByRole("heading", { name: "Seu grupo começa aqui" }).waitFor();
  // The welcome (0029) opens the card once, with the group's name as stored (the field keeps 40 characters).
  const groupName = sql(`select g.name from groups g join members m on m.group_id = g.id where m.display_name = '${OWNER.name}'`);
  assert(groupName.length >= 30, `group name too short: ${groupName}`);
  const welcome = card(p).getByTestId("welcome");
  await welcome.getByText("Bem-vindo ao Pacto").waitFor();
  await welcome.getByText(groupName, { exact: true }).waitFor();
  await card(p).getByText("Por enquanto, só você está aqui.").waitFor();
  assert((await p.getByTestId("invite-link").inputValue()) === link, await p.getByTestId("invite-link").inputValue());
  assert((await card(p).getByText("A fazer").count()) === 3, "three steps to do");
  const axe = await new AxeBuilder({ page: p }).include("[data-testid=first-steps]").withTags(["wcag2a", "wcag2aa"]).analyze();
  assert(axe.violations.length === 0, axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`).join("; "));
  for (const [w, h] of [[320, 640], [360, 780], [1024, 768], [1440, 900]]) {
    await p.setViewportSize({ width: w, height: h });
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sideways scroll at ${w}`);
    const small = await p.evaluate(() =>
      [...document.querySelectorAll("[data-testid=first-steps] a, [data-testid=first-steps] button")]
        .filter((e) => e.getClientRects().length && e.getBoundingClientRect().height < 44)
        .map((e) => e.textContent.trim()),
    );
    assert(small.length === 0, `targets under 44 px at ${w}: ${small.join(", ")}`);
    await p.screenshot({ path: `${SHOTS}/o1-primeiros-passos-${w}.png`, fullPage: w >= 1024 });
  }
  await p.setViewportSize({ width: 390, height: 844 });

  // Seen once, on any device: gone after a reload and on a new phone with the same account.
  for (let i = 0; i < 20 && sql(`select count(*) from welcome_seen w join members m using (user_id) where m.display_name = '${OWNER.name}'`) !== "1"; i++) await p.waitForTimeout(250);
  await p.reload();
  await card(p).getByRole("heading", { name: "Seu grupo começa aqui" }).waitFor();
  assert((await card(p).getByTestId("welcome").count()) === 0, "welcome again after reload");
  const other = await signIn(OWNER.email);
  await other.waitForURL("**/hoje");
  await card(other).getByRole("heading", { name: "Seu grupo começa aqui" }).waitFor();
  assert((await card(other).getByTestId("welcome").count()) === 0, "welcome again on another device");
  await other.context().close();

  // The group's empty screens say how they fill up, without making anything up.
  await p.goto(`${APP}/feed`);
  await p.getByTestId("feed-empty").getByText("As primeiras provas vão aparecer aqui. Envie a sua na tela Hoje.").waitFor();
  await p.goto(`${APP}/ranking`);
  await p.getByText("O ranking começa com as primeiras atividades. Cumpra as metas para começar a pontuar.").waitFor();
  lia = p;
});

await step("copying the link marks 'Link copiado' (not 'invited'); the deal is confirmed by a button; goals get the focus", async () => {
  const p = lia;
  await p.goto(`${APP}/hoje`);
  await card(p).getByRole("button", { name: "Copiar link" }).click();
  await card(p).getByText("Link copiado. Agora envie para seus amigos.").waitFor();
  assert((await p.evaluate(() => navigator.clipboard.readText())) === link, "clipboard");
  await card(p).locator("[data-step=invite]").getByText("Link copiado").first().waitFor();
  assert((await card(p).getByText(/convidad/i).count()) === 0, "says friends were invited");

  await card(p).getByRole("button", { name: /Entenda o combinado/ }).click();
  await card(p).getByTestId("first-steps-menu").getByText("1 Coca + 1 salgado").waitFor();
  const rules = card(p).getByRole("button", { name: "Ver regras e folga" });
  await rules.click();
  await p.locator("dialog[open]").getByTestId("guide-answer").getByText("1 dia de folga por semana").waitFor();
  await p.keyboard.press("Escape");
  assert((await focused(p)) === "Ver regras e folga", `focus after the guide: ${await focused(p)}`);
  await card(p).getByRole("button", { name: "Entendi o combinado" }).click();
  await card(p).locator("[data-step=rules]").getByText("Combinado entendido").waitFor();

  await card(p).getByRole("button", { name: /Envie sua primeira prova/ }).click();
  await card(p).getByRole("button", { name: "Ir para minhas metas" }).click();
  assert((await focused(p)) === "metas", `focus after 'Ir para minhas metas': ${await focused(p)}`);
});

await step("'Continuar depois' folds the card (focus on it) and this device remembers it per person and group", async () => {
  const p = lia;
  await p.goto(`${APP}/hoje`);
  await card(p).getByRole("button", { name: "Continuar depois" }).click();
  const folded = p.getByTestId("first-steps-collapsed");
  await folded.waitFor();
  assert((await focused(p)) === "Primeiros passos", `focus after folding: ${await focused(p)}`);
  await p.reload();
  await folded.waitFor();
  // Steps 1 and 2 stayed done on this device.
  await folded.click();
  await card(p).locator("[data-step=invite][data-done=true]").waitFor();
  await card(p).locator("[data-step=rules][data-done=true]").waitFor();
  // Another device (a fresh browser) starts over: nothing is synced, and that is what the card promises.
  const other = await signIn(OWNER.email);
  await other.waitForURL("**/hoje");
  await card(other).locator("[data-step=invite][data-done=false]").waitFor();
  await other.context().close();
});

await step("the first proof comes from the server: a project does not count, a reading does", async () => {
  const insert = (goal, extra) =>
    sql(`alter table checkins disable trigger user;
      insert into checkins (user_id, group_id, day, goal, photo_path, ${goal === "project" ? "project_url, " : ""}${extra.cols})
      select m.user_id, m.group_id, sp_today(), '${goal}', m.group_id || '/' || m.user_id || '/e2e-${goal}.jpg', ${goal === "project" ? "'https://github.com/Taw3s/pactus', " : ""}${extra.vals}
      from members m where m.display_name = '${OWNER.name}';
      alter table checkins enable trigger user;`);
  insert("project", { cols: "title, minutes", vals: "'Meu projeto', 30" });
  const p = lia;
  await p.goto(`${APP}/hoje`);
  await step3(p).getByText("A fazer").waitFor();
  insert("reading", { cols: "pages", vals: "12" });
  await p.reload();
  await step3(p).getByText("Primeira prova enviada.").first().waitFor();
  await card(p).getByText("Tudo pronto para começar. Agora é manter o pacto.").waitFor();
  await card(p).getByRole("button", { name: "Fechar primeiros passos" }).click();
  await card(p).waitFor({ state: "detached" });
  await p.reload();
  await p.getByRole("heading", { level: 1, name: "Hoje" }).waitFor();
  assert((await card(p).count()) === 0, "the card came back after closing");
  // The guide brings it back.
  await p.getByTestId("judge-guide").click();
  await p.locator("dialog[open]").getByTestId("reopen-first-steps").click();
  await p.waitForURL("**/hoje?primeiros=1");
  await card(p).getByRole("heading", { name: "Seu grupo começa aqui" }).waitFor();
  await p.context().close();
});

await step("an invite link fills the code (checked by the server) and an e-mail sign-up lands in the group", async () => {
  const { ctx, page: p } = await newPhone(browser);
  await p.goto(link);
  assert((await p.locator("#code").inputValue()) === code, await p.locator("#code").inputValue());
  await p.getByText("Código do convite preenchido.").waitFor();
  await p.fill("#name", "Téo");
  await p.fill("#email", "teo@pacto.test");
  await p.fill("#password", "senha123");
  await p.getByRole("button", { name: "Entrar no grupo" }).click();
  await p.waitForURL("**/hoje");
  const groupOf = (n) => sql(`select g.invite_code from groups g join members m on m.group_id = g.id where m.display_name = '${n}'`);
  assert(groupOf("Téo") === code, `Téo is in ${groupOf("Téo")}`);
  // Not alone any more: the card does not say so.
  await card(p).getByRole("heading", { name: "Seu grupo começa aqui" }).waitFor();
  assert((await card(p).getByText("Por enquanto, só você está aqui.").count()) === 0, "still says alone");
  await ctx.close();
});

await step("a wrong invite says so; the URL never carries an e-mail or an id", async () => {
  const { ctx, page: p } = await newPhone(browser);
  await p.goto(`${APP}/join?convite=ZZZZ9999`);
  await p.getByText("Este convite não é válido. Confira o link ou peça um novo.").waitFor();
  assert(!/@|[0-9a-f]{8}-[0-9a-f]{4}/.test(link), link);
  await ctx.close();
});

await step("signed in without a group, the invite link skips the sign-up and keeps the code", async () => {
  const p = await signIn("caio@pacto.test");
  await p.waitForURL("**/join**");
  await p.goto(link);
  await p.waitForURL(`**/join?step=code&convite=${code}`);
  assert((await p.locator("#code").inputValue()) === code, "code lost");
  await p.fill("#name", "Caio");
  await p.getByRole("button", { name: "Entrar no grupo" }).click();
  await p.waitForURL("**/hoje");
  await p.context().close();
});

await step("'Fazer login' from an invite keeps the code through the login", async () => {
  const { ctx, page: p } = await newPhone(browser);
  await p.goto(link);
  await p.getByRole("link", { name: "Fazer login" }).click();
  await p.waitForURL("**/login?next=**");
  await p.fill("#email", "bia@pacto.test");
  await p.fill("#password", "senha123");
  await p.click("button:text-is('Entrar')");
  await p.waitForURL(`**/join?step=code&convite=${code}`);
  assert((await p.locator("#code").inputValue()) === code, "code lost");
  await ctx.close();
});

await step("Google from an invite comes back to the code step with the code", async () => {
  const { ctx, page: p } = await newPhone(browser);
  await p.goto(link);
  const google = p.getByTestId("google-login");
  await google.waitFor();
  const [req] = await Promise.all([p.waitForRequest((r) => r.url().includes("/auth/v1/authorize")), google.click()]);
  const back = new URL(new URL(req.url()).searchParams.get("redirect_to"));
  assert(back.pathname === "/auth/confirm" && back.searchParams.get("next") === `/join?step=code&convite=${code}`, back.toString());
  await ctx.close();
});

await browser.close();
done();
