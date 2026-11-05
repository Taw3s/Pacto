// Stage (e): PWA
import { APP, SHOTS, assert, done, launch, newPhone, step } from "./lib.mjs";

const browser = await launch();
const { ctx, page } = await newPhone(browser);

await step("manifest is linked and complete", async () => {
  await page.goto(`${APP}/login`);
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const m = await (await fetch(`${APP}${href}`)).json();
  assert(m.display === "standalone" && m.start_url === "/hoje", "display/start_url");
  for (const i of m.icons) assert((await fetch(`${APP}${i.src}`)).status === 200, `icon ${i.src}`);
  assert(m.icons.some((i) => i.purpose === "maskable"), "maskable icon");
});

await step("iOS meta tags (apple-touch-icon, standalone, theme-color)", async () => {
  assert(await page.locator('link[rel="apple-touch-icon"]').count(), "apple-touch-icon");
  assert(await page.locator('meta[name="mobile-web-app-capable"], meta[name="apple-mobile-web-app-capable"]').count(), "web-app-capable");
  assert((await page.locator('meta[name="theme-color"]').getAttribute("content")) === "#26292e", "theme-color");
});

await step("service worker registers and controls the page", async () => {
  await page.evaluate(() => navigator.serviceWorker.ready);
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.scope);
  assert(scope === `${APP}/`, `scope ${scope}`);
});

await step("Chromium reports no installability errors", async () => {
  const cdp = await ctx.newCDPSession(page);
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.ready);
  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
  // Playwright contexts are incognito, where Chrome never offers install: not an app defect.
  const real = installabilityErrors.filter((e) => e.errorId !== "in-incognito");
  assert(real.length === 0, JSON.stringify(real));
  await page.screenshot({ path: `${SHOTS}/e1-login.png` });
});

await browser.close();
done();
