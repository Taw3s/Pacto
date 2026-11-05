// Stage (n): the public presentation at "/". Runs last: it only reads, and uses who is left after (m).
import AxeBuilder from "@axe-core/playwright";
import { APP, SHOTS, assert, done, launch, loginAs, step } from "./lib.mjs";

const browser = await launch();
const TITLE = "Pacto — seu compromisso com o grupo";

async function visitorPage(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log("  [pageerror]", e.message));
  return p;
}

await step("a visitor opens / without signing in: promise, goals, deadline, consequence and the two ways in", async () => {
  const p = await visitorPage(360, 780);
  await p.goto(`${APP}/`);
  assert(new URL(p.url()).pathname === "/", `redirected to ${p.url()}`);
  assert((await p.title()) === TITLE, await p.title());
  await p.getByRole("heading", { level: 1, name: "Combinou com o grupo? Cumpra o pacto." }).waitFor();
  await p.getByText("Registre suas provas até 23:59, no horário de São Paulo.").waitFor();
  await p.getByText("O Pacto registra a dívida; não cobra dinheiro.").waitFor();
  const href = async (name) => p.getByRole("link", { name, exact: true }).first().getAttribute("href");
  assert((await href("Criar um desafio")) === "/join?criar=1", await href("Criar um desafio"));
  assert((await href("Tenho um código de convite")) === "/join", await href("Tenho um código de convite"));
  assert((await href("Já tenho conta")) === "/login", await href("Já tenho conta"));
  assert((await p.getByRole("link", { name: "Ir para meu desafio" }).count()) === 0, "a visitor is sent to a challenge");
  // No minimum times from old docs: the page never states a duration of study, typing or reading.
  assert(!/\d+\s*(min|minutos|páginas|palavras)/i.test(await p.locator("main").innerText()), "the page states a minimum");
  const axe = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa"]).analyze();
  assert(axe.violations.length === 0, axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`).join("; "));
  await p.context().close();
});

await step("the presentation fits 320, 360, 1024 and 1440 px: no sideways scroll, every target ≥ 44 px", async () => {
  for (const [w, h] of [[320, 640], [360, 780], [1024, 768], [1440, 900]]) {
    const p = await visitorPage(w, h);
    await p.goto(`${APP}/`);
    await p.getByRole("heading", { level: 1 }).waitFor();
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sideways scroll at ${w}`);
    const small = await p.evaluate(() =>
      [...document.querySelectorAll("a, button")].filter((e) => e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim()),
    );
    assert(small.length === 0, `targets under 44 px at ${w}: ${small.join(", ")}`);
    await p.screenshot({ path: `${SHOTS}/n-apresentacao-${w}.png`, fullPage: true });
    await p.context().close();
  }
});

await step("making / public opens nothing else: app screens and APIs still send a visitor to the login", async () => {
  const p = await visitorPage(360, 780);
  for (const path of ["/hoje", "/feed", "/ranking", "/dividas", "/config", "/historico/x", "/checkin/x"]) {
    await p.goto(`${APP}${path}`);
    assert(new URL(p.url()).pathname === "/login", `${path} -> ${p.url()}`);
  }
  const api = await p.request.post(`${APP}/api/membership`, { data: { action: "leave" }, maxRedirects: 0 });
  assert(api.status() === 307 || api.status() === 401, `/api/membership answered ${api.status()} to a visitor`);
  await p.context().close();
});

await step("'Criar um desafio' opens the join page in create mode", async () => {
  const p = await visitorPage(360, 780);
  await p.goto(`${APP}/`);
  await p.getByRole("link", { name: "Criar um desafio" }).first().click();
  await p.waitForURL("**/join?criar=1");
  await p.context().close();
});

await step("a member sees 'Ir para meu desafio' (no new challenge: one person, one group) and it opens Hoje", async () => {
  const p = await loginAs(browser, "ana@pacto.test");
  await p.goto(`${APP}/`);
  assert((await p.getByRole("link", { name: "Criar um desafio" }).count()) === 0, "a member is offered a new challenge");
  assert((await p.getByRole("link", { name: "Já tenho conta" }).count()) === 0, "a member is offered the login");
  await p.getByRole("link", { name: "Ir para meu desafio" }).first().click();
  await p.waitForURL("**/hoje");
  await p.context().close();
});

await step("signed in without a group (left in stage m): create and invite skip the sign-up", async () => {
  const p = await visitorPage(360, 780);
  await p.goto(`${APP}/login`);
  await p.fill("#email", "caio@pacto.test");
  await p.fill("#password", "senha123");
  await p.click("button:text-is('Entrar')");
  await p.waitForURL("**/join**");
  await p.goto(`${APP}/`);
  const href = async (name) => p.getByRole("link", { name, exact: true }).first().getAttribute("href");
  assert((await href("Criar um desafio")) === "/join?step=code&criar=1", await href("Criar um desafio"));
  assert((await href("Tenho um código de convite")) === "/join?step=code", await href("Tenho um código de convite"));
  await p.context().close();
});

await browser.close();
done();
