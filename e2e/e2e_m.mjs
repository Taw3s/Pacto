// Stage (m): the owner removes a member, a member leaves, a member deletes the account (last stage: it
// takes people out of the group).
import AxeBuilder from "@axe-core/playwright";
import { APP, SHOTS, assert, done, launch, loginAs, newPhone, sql, step } from "./lib.mjs";

const browser = await launch();
// Ana's group, with Ana as its owner (the earlier stages created the group without one).
const ownerEmail = "ana@pacto.test";
const group = sql(`select m.group_id from members m join auth.users u on u.id = m.user_id where u.email = '${ownerEmail}'`);
sql(`update groups set owner_id = (select id from auth.users where email = '${ownerEmail}') where id = '${group}'`);
const idOf = (email) => sql(`select id from auth.users where email = '${email}'`);
const files = (user) => Number(sql(`select count(*) from storage.objects where bucket_id = 'media' and name like '${group}/${user}/%'`));
// Three members who sign in with a password (earlier stages use them): one is removed, one leaves, one deletes the account.
const [removed, leaver, deleter] = ["bia@pacto.test", "caio@pacto.test", "eva@pacto.test"];
const groupName = sql(`select name from groups where id = '${group}'`);
const focusedText = (p) => p.evaluate(() => document.activeElement?.textContent?.trim());
async function noAxeViolations(p) {
  const axe = await new AxeBuilder({ page: p }).include("dialog[open]").withTags(["wcag2a", "wcag2aa"]).analyze();
  assert(axe.violations.length === 0, axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`).join("; "));
}

await step("a member who is not the owner sees no 'Remover'", async () => {
  const p = await loginAs(browser, leaver);
  await p.goto(`${APP}/config`);
  await p.getByRole("button", { name: "Sair do grupo" }).waitFor();
  assert((await p.getByRole("button", { name: /^Remover / }).count()) === 0, "remove buttons for a non-owner");
  await p.context().close();
});

await step("leaving asks first (history stays, no heir for a non-owner); 'Continuar no grupo' keeps you in", async () => {
  const p = await loginAs(browser, leaver);
  await p.goto(`${APP}/config`);
  await p.getByRole("button", { name: "Sair do grupo" }).click();
  const dialog = p.locator("dialog[open]");
  await dialog.getByRole("heading", { name: `Sair de ${groupName}?` }).waitFor();
  const body = await dialog.innerText();
  assert(body.includes("Os pagamentos que você recebeu, suas acusações e seus votos continuam valendo no histórico."), body);
  assert(body.includes("Sua conta continuará existindo."), body);
  assert((await dialog.getByTestId("heir").count()) === 0, "a non-owner sees an heir");
  assert((await focusedText(p)) === "Continuar no grupo", `initial focus on ${await focusedText(p)}`);
  await noAxeViolations(p);
  await p.screenshot({ path: `${SHOTS}/m1-sair.png` });
  await dialog.getByRole("button", { name: "Continuar no grupo" }).click();
  await dialog.waitFor({ state: "detached" });
  assert((await focusedText(p)) === "Sair do grupo", `focus after cancel on ${await focusedText(p)}`);
  assert(sql(`select count(*) from members where user_id = '${idOf(leaver)}'`) === "1", "left anyway");
  await p.context().close();
});

await step("the owner removes a member: proofs and photos go, payments received stay with the name", async () => {
  const id = idOf(removed);
  const name = sql(`select display_name from members where user_id = '${id}'`);
  const received = Number(sql(`select count(*) from payments where received_by = '${id}'`));
  assert(files(id) > 0, "the member had photos");
  const p = await loginAs(browser, ownerEmail);
  await p.goto(`${APP}/config`);
  await p.getByRole("button", { name: `Remover ${name}` }).click();
  const dialog = p.locator("dialog[open]");
  await dialog.getByRole("heading", { name: `Remover ${name} do grupo?` }).waitFor();
  await dialog.getByText("Remover do grupo não exclui a conta da pessoa.").waitFor();
  assert((await focusedText(p)) === "Cancelar", `initial focus on ${await focusedText(p)}`);
  await noAxeViolations(p);
  await p.screenshot({ path: `${SHOTS}/m2-remover.png` });
  await dialog.getByRole("button", { name: "Remover do grupo" }).click();
  await p.getByText(`Você removeu ${name} do grupo.`).waitFor();
  await dialog.waitFor({ state: "detached" });
  assert(sql(`select count(*) from members where user_id = '${id}'`) === "0", "still a member");
  assert(sql(`select count(*) from auth.users where id = '${id}'`) === "1", "the account was deleted");
  assert(files(id) === 0, "photos left behind");
  assert(Number(sql(`select count(*) from payments where received_by is null and received_name = '${name.replace(/'/g, "''")}'`)) === received, "payments lost");
  await p.context().close();
});

await step("the removed member signs in and is asked for an invite code", async () => {
  const { ctx, page } = await newPhone(browser);
  await page.goto(`${APP}/login`);
  await page.fill("#email", removed);
  await page.fill("#password", "senha123");
  await page.click("button:text-is('Entrar')");
  await page.waitForURL("**/join**");
  await ctx.close();
});

await step("a member leaves the group from Configurações", async () => {
  const id = idOf(leaver);
  const p = await loginAs(browser, leaver);
  await p.goto(`${APP}/config`);
  await p.getByRole("button", { name: "Sair do grupo" }).click();
  await p.locator("dialog[open]").getByRole("button", { name: "Sair do grupo" }).click();
  await p.waitForURL("**/join**");
  assert(sql(`select count(*) from members where user_id = '${id}'`) === "0", "still a member");
  assert(files(id) === 0, "photos left behind");
  await p.context().close();
});

await step("a member deletes the account (typing EXCLUIR): the user, the photos and the name on receipts are gone", async () => {
  const id = idOf(deleter);
  // Make sure a receipt carries the person's name, so the check below is not empty.
  const name = sql(`select display_name from members where user_id = '${id}'`).replace(/'/g, "''");
  // (Bia's paid debts left with her above, so add one: Eva received Ana's Coca 3 days ago. Superuser, trigger off.)
  sql(`alter table payments disable trigger payments_before_insert;
    insert into payments (group_id, debtor_id, day, item, received_by, received_name)
    values ('${group}', (select id from auth.users where email = '${ownerEmail}'), sp_today() - 3, 'coke', '${id}', '${name}')
    on conflict do nothing;
    alter table payments enable trigger payments_before_insert;`);
  assert(sql(`select count(*) from payments where received_name = '${name}'`) !== "0", "no receipt to check");
  const p = await loginAs(browser, deleter);
  await p.goto(`${APP}/config`);
  await p.getByRole("button", { name: "Excluir minha conta" }).click();
  const dialog = p.locator("dialog[open]");
  await dialog.getByRole("heading", { name: "Excluir minha conta?" }).waitFor();
  const confirm = dialog.getByRole("button", { name: "Excluir minha conta" });
  assert(await confirm.isDisabled(), "action enabled before typing EXCLUIR");
  assert((await p.evaluate(() => document.activeElement?.textContent?.trim())) === "Cancelar", "initial focus not on Cancelar");
  // Outer spaces and case don't matter, as with the old prompt.
  await dialog.getByLabel("Digite EXCLUIR para confirmar").fill("  excluir ");
  await confirm.click();
  await p.waitForURL("**/login**");
  assert(sql(`select count(*) from auth.users where id = '${id}'`) === "0", "the account still exists");
  assert(files(id) === 0, "photos left behind");
  assert(sql(`select count(*) from payments where received_name = '${name}'`) === "0", "the name stayed on receipts");
  await p.context().close();
});

await step("the owner leaving sees who takes over: the oldest member (joined_on, created_at)", async () => {
  const heir = sql(`select display_name from members where group_id = '${group}' and user_id <> '${idOf(ownerEmail)}' order by joined_on, created_at limit 1`);
  assert(heir, "no other member left to check");
  const p = await loginAs(browser, ownerEmail);
  await p.goto(`${APP}/config`);
  await p.getByRole("button", { name: "Sair do grupo" }).click();
  const dialog = p.locator("dialog[open]");
  assert((await dialog.getByTestId("heir").innerText()) === `${heir} ficará responsável pelo grupo.`, await dialog.getByTestId("heir").innerText());
  await p.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached" });
  assert(sql(`select count(*) from members where user_id = '${idOf(ownerEmail)}'`) === "1", "left anyway");
  await p.context().close();
});

await step("the last person leaving is told the group and its history go; then it is deleted", async () => {
  // The removed member gets a group of their own, with a long name (it must wrap, not be cut).
  const id = idOf(removed);
  const name = "Grupo de estudos noturnos da turma de programação de 2026";
  const solo = sql(`insert into groups (name, invite_code, owner_id) values ('${name}', 'SOLO4242', '${id}') returning id`).split("\n")[0];
  sql(`insert into members (user_id, group_id, display_name) values ('${id}', '${solo}', 'Bia')`);
  const p = await loginAs(browser, removed);
  await p.setViewportSize({ width: 320, height: 640 });
  await p.goto(`${APP}/config`);
  await p.getByRole("button", { name: "Sair do grupo" }).click();
  const dialog = p.locator("dialog[open]");
  await dialog.getByRole("heading", { name: `Sair de ${name}?` }).waitFor();
  const body = await dialog.innerText();
  assert(body.includes("Você é a última pessoa. Ao sair, o grupo e seu histórico serão apagados."), body);
  assert(!body.includes("continuam valendo"), "says the history stays");
  assert(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "horizontal scroll at 320 px");
  await p.screenshot({ path: `${SHOTS}/m3-ultima-pessoa-320.png` });
  await dialog.getByRole("button", { name: "Sair do grupo" }).click();
  await p.waitForURL("**/join**");
  assert(sql(`select count(*) from groups where id = '${solo}'`) === "0", "the group still exists");
  await p.context().close();
});

await step("a wrong confirmation deletes nothing", async () => {
  const p = await loginAs(browser, ownerEmail);
  await p.goto(`${APP}/config`);
  await p.getByRole("button", { name: "Excluir minha conta" }).click();
  const dialog = p.locator("dialog[open]");
  const field = dialog.getByLabel("Digite EXCLUIR para confirmar");
  await field.fill("sim");
  assert(await dialog.getByRole("button", { name: "Excluir minha conta" }).isDisabled(), "action enabled with a wrong word");
  // Enter in the field never deletes by itself, even with the right word.
  await field.fill("EXCLUIR");
  await field.press("Enter");
  await p.waitForTimeout(800);
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await dialog.waitFor({ state: "detached" });
  assert(p.url().includes("/config"), "left the page");
  assert(sql(`select count(*) from auth.users where email = '${ownerEmail}'`) === "1", "deleted anyway");
  await p.context().close();
});

await browser.close();
done();
