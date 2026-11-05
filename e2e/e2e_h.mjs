// Stage (h): automated accessibility (axe, WCAG 2.1 AA) on every screen + offline page.
import { spawn } from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
import { APP, APP_DIR, SHOTS, assert, done, launch, newPhone, step } from "./lib.mjs";

const browser = await launch();
const { page } = await newPhone(browser);

async function scan(name) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  // axe cannot compute contrast over a background image and silently skips it ("incomplete").
  // Replace the 2×2 dither with its lightest pixel (#26292e + 2.5% white): the worst case.
  await page.addStyleTag({ content: "body{background-image:none!important;background-color:#2a2d32!important}" });
  const { violations, incomplete } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const unsure = incomplete.find((v) => v.id === "color-contrast");
  if (unsure) console.log(`    [axe review] ${name}: color-contrast not computable on ${unsure.nodes.length} element(s): ${unsure.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
  const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  for (const v of violations) {
    console.log(`    [axe ${v.impact}] ${name}: ${v.id} (${v.nodes.length}) ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`);
  }
  assert(bad.length === 0, `${name}: ${bad.map((v) => `${v.id}×${v.nodes.length}`).join(", ")}`);
}

await step("axe: login and join (logged out)", async () => {
  await page.goto(`${APP}/login`);
  await scan("login");
  await page.goto(`${APP}/join`);
  await scan("join");
});

await step("privacy policy, terms and the support page open without an account, axe clean", async () => {
  await page.goto(`${APP}/login`);
  await page.getByRole("link", { name: "Privacidade" }).click();
  await page.getByRole("heading", { name: "Política de privacidade" }).waitFor();
  await scan("privacidade");
  await page.getByRole("link", { name: "termos de uso" }).click();
  await page.getByRole("heading", { name: "Termos de uso" }).waitFor();
  await scan("termos");
  await page.goto(`${APP}/apoiar`);
  await page.getByRole("heading", { name: "Apoiar o Pacto" }).waitFor();
  await scan("apoiar");
});

await step("axe: every screen of a member with data", async () => {
  await page.goto(`${APP}/login`);
  await page.fill("#email", "ana@pacto.test");
  await page.fill("#password", "senha123");
  await page.click("button:text-is('Entrar')");
  await page.waitForURL("**/hoje");
  const failures = [];
  for (const path of ["/hoje", "/feed", "/ranking", "/dividas", "/config"]) {
    await page.goto(`${APP}${path}`);
    try { await scan(path); } catch (e) { failures.push(e.message); }
  }
  await page.getByRole("link", { name: "Perfil" }).click();
  await page.waitForURL("**/historico/**");
  try { await scan("historico"); } catch (e) { failures.push(e.message); }
  await page.goto(`${APP}/feed`);
  await page.locator('[data-member=Bia] a[href^="/checkin/"]').first().click();
  await page.waitForURL("**/checkin/**");
  try { await scan("tribunal"); } catch (e) { failures.push(e.message); }
  await page.getByRole("tab", { name: /Votos/ }).click();
  try { await scan("tribunal-votos"); } catch (e) { failures.push(e.message); }
  assert(failures.length === 0, failures.join(" / "));
});

await step("desktop (1920 px): side navigation + group column, axe clean; phones never fetch the column", async () => {
  const wide = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const d = await wide.newPage();
  await d.goto(`${APP}/login`);
  await d.fill("#email", "fab@pacto.test");
  await d.fill("#password", "senha123");
  await d.click("button:text-is('Entrar')");
  await d.waitForURL("**/hoje");
  const nav = d.getByRole("navigation", { name: "Principal" });
  const box = await nav.boundingBox();
  assert(box && box.x === 0 && box.height >= 1000 && box.width < 300, `side nav box ${JSON.stringify(box)}`);
  const side = d.getByTestId("group-sidebar");
  // One title over the three blocks, the tribunal first; the column scrolls with the page (not sticky).
  await side.getByRole("heading", { level: 2, name: "O grupo hoje" }).waitFor();
  const blocks = await side.getByRole("heading", { level: 3 }).allTextContents();
  assert(blocks.map((b) => b.trim()).join("|") === "Tribunal|Progresso|Ranking", `blocks: ${blocks.join("|")}`);
  assert((await side.evaluate((el) => getComputedStyle(el).position)) !== "sticky", "the group column is sticky");
  await side.locator('a[href^="/historico/"]').first().waitFor();
  assert((await side.locator('a[href^="/historico/"]').count()) === 6, "6 members in the group column");
  await side.getByText(/Ranking/).waitFor();
  await d.screenshot({ path: `${SHOTS}/h2-desktop-hoje.png` });
  await d.addStyleTag({ content: "body{background-image:none!important;background-color:#2a2d32!important}" });
  const { violations } = await new AxeBuilder({ page: d }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  assert(bad.length === 0, bad.map((v) => `${v.id}×${v.nodes.length}`).join(", "));
  await wide.close();

  const { ctx: phone, page: m } = await newPhone(browser);
  let calls = 0;
  m.on("request", (r) => r.url().includes("/api/group-summary") && calls++);
  await m.goto(`${APP}/login`);
  await m.fill("#email", "fab@pacto.test");
  await m.fill("#password", "senha123");
  await m.click("button:text-is('Entrar')");
  await m.waitForURL("**/hoje");
  await m.waitForLoadState("networkidle");
  assert(calls === 0, `phone fetched the desktop column ${calls}×`);
  assert(!(await m.getByTestId("group-sidebar").isVisible()), "group column visible on a phone");
  await phone.close();
});

await step("offline: a failed navigation shows the 'Sem conexão' page, not a browser error", async () => {
  // Playwright's setOffline does not reach service-worker fetches, so run a second app server
  // and really stop it: the worker's network request then fails like on a phone without signal.
  const PORT = 3100;
  const srv = spawn("npx", ["next", "start", "-p", String(PORT)], { cwd: APP_DIR, stdio: "ignore", detached: true });
  try {
    for (let i = 0; i < 60; i++) {
      if (await fetch(`http://localhost:${PORT}/login`).then((r) => r.ok, () => false)) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    const { page: p } = await newPhone(browser);
    await p.goto(`http://localhost:${PORT}/login`);
    await p.evaluate(() => navigator.serviceWorker.ready);
    await p.reload();
    await p.waitForFunction(() => !!navigator.serviceWorker.controller);
    await p.waitForFunction(async () => !!(await caches.match("/offline.html")));
    // SIGKILL, not SIGTERM: a graceful stop keeps already-open keep-alive connections answering,
    // so the browser could still get a real response (a redirect) instead of a network error.
    process.kill(-srv.pid, "SIGKILL");
    for (let i = 0; i < 40; i++) {
      if (!(await fetch(`http://localhost:${PORT}/login`).then(() => true, () => false))) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    await p.goto(`http://localhost:${PORT}/feed`);
    await p.getByRole("heading", { name: "Sem conexão" }).waitFor({ timeout: 15000 }).catch(async (e) => {
      throw new Error(`${e.message.split("\n")[0]} — page was ${p.url()}: ${(await p.locator("body").innerText()).slice(0, 120)}`);
    });
    assert(await p.locator("img").evaluate((img) => img.naturalWidth > 0), "offline sprite comes from the cache");
    await p.screenshot({ path: `${SHOTS}/h1-offline.png` });
    const { violations } = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa"]).analyze();
    assert(!violations.some((v) => v.impact === "serious" || v.impact === "critical"), JSON.stringify(violations.map((v) => v.id)));
  } finally {
    try { process.kill(-srv.pid, "SIGKILL"); } catch {}
  }
});

await browser.close();
done();
