// Stage (a): auth + invite
import { ANON, APP, SHOTS, SUPABASE, assert, done, launch, lastMailTo, linkFromMail, newPhone, step } from "./lib.mjs";

const browser = await launch();
const ana = await newPhone(browser);
const p = ana.page;

await step("unauthenticated user is redirected to /login", async () => {
  await p.goto(`${APP}/hoje`);
  await p.waitForURL("**/login");
  await p.screenshot({ path: `${SHOTS}/a1-login.png` });
});

await step("join rejects an invalid invite code", async () => {
  await p.goto(`${APP}/join`);
  await p.fill("#code", "ERRADO");
  await p.fill("#name", "Ana");
  await p.fill("#email", "ana@pacto.test");
  await p.fill("#password", "senha123");
  await p.click("button:has-text('Entrar no grupo')");
  await p.getByText("Código de convite inválido.").waitFor();
});

await step("join with valid code + password lands on /hoje as a member", async () => {
  await p.fill("#code", "pacto2026");
  await p.click("button:has-text('Entrar no grupo')");
  await p.waitForURL("**/hoje");
  await p.getByText("Olá, Ana").waitFor();
  await p.screenshot({ path: `${SHOTS}/a2-hoje.png` });
});

await step("password login works in a fresh browser", async () => {
  const { ctx, page } = await newPhone(browser);
  await page.goto(`${APP}/login`);
  await page.fill("#email", "ana@pacto.test");
  await page.fill("#password", "errada");
  await page.click("button:text-is('Entrar')");
  await page.getByText("E-mail ou senha incorretos.").waitFor();
  await page.fill("#password", "senha123");
  await page.click("button:text-is('Entrar')");
  await page.waitForURL("**/hoje");
  await ctx.close();
});

await step("join by magic link (no password) creates the member", async () => {
  const { ctx, page } = await newPhone(browser);
  const sentAfter = Date.now() - 1000;
  await page.goto(`${APP}/join`);
  await page.fill("#code", "PACTO2026");
  await page.fill("#name", "Bia");
  await page.fill("#email", "bia@pacto.test");
  await page.click("button:has-text('Entrar no grupo')");
  await page.getByText("Confira seu e-mail").waitFor();
  const link = linkFromMail(await lastMailTo("bia@pacto.test", { after: sentAfter }));
  assert(link, "no e-mail link captured");
  await page.goto(link);
  await page.waitForURL("**/hoje");
  await page.getByText("Olá, Bia").waitFor();
  await ctx.close();
});

await step("magic link login does NOT create accounts for unknown e-mails", async () => {
  const { ctx, page } = await newPhone(browser);
  await page.goto(`${APP}/login`);
  await page.click("button:has-text('Link por e-mail')");
  await page.fill("#email", "estranho@pacto.test");
  await page.click("button:has-text('Enviar link')");
  await page.getByText("Não encontramos essa conta").waitFor();
  await ctx.close();
});

await step("magic link login works for existing member", async () => {
  const { ctx, page } = await newPhone(browser);
  const sentAfter = Date.now() - 1000;
  await page.goto(`${APP}/login`);
  await page.click("button:has-text('Link por e-mail')");
  await page.fill("#email", "ana@pacto.test");
  await page.click("button:has-text('Enviar link')");
  await page.getByText("Confira seu e-mail").waitFor();
  await page.goto(linkFromMail(await lastMailTo("ana@pacto.test", { after: sentAfter })));
  await page.waitForURL("**/hoje");
  await ctx.close();
});

await step("account without valid code has no access and is sent to /join?step=code", async () => {
  // Sign up directly through the API, bypassing the form (as an attacker would).
  const res = await fetch(`${SUPABASE}/auth/v1/signup`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON },
    body: JSON.stringify({ email: "intruso@pacto.test", password: "senha123" }),
  });
  const { access_token } = await res.json();
  const members = await fetch(`${SUPABASE}/rest/v1/members?select=*`, {
    headers: { apikey: ANON, authorization: `Bearer ${access_token}` },
  }).then((r) => r.json());
  assert(Array.isArray(members) && members.length === 0, `intruder sees members: ${JSON.stringify(members)}`);

  const { ctx, page } = await newPhone(browser);
  await page.goto(`${APP}/login`);
  await page.fill("#email", "intruso@pacto.test");
  await page.fill("#password", "senha123");
  await page.click("button:text-is('Entrar')");
  await page.waitForURL("**/join?step=code");
  await ctx.close();
});

await browser.close();
done();
