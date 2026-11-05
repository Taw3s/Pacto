// Shared helpers for the end-to-end stages. Everything environment-specific comes from env vars
// (see e2e/README.md); defaults match `supabase start` + `next start` on this machine.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

export const DIR = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURE = path.join(DIR, "fixtures", "big.png");
export const APP = process.env.APP_URL || "http://localhost:3000";
export const APP_DIR = process.env.APP_DIR || path.join(DIR, "..");
export const SUPABASE = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
export const ANON = process.env.SUPABASE_ANON_KEY;
export const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const CRON_HEADERS = process.env.CRON_SECRET ? { authorization: `Bearer ${process.env.CRON_SECRET}` } : {};
export const MAIL = process.env.MAIL_URL || "http://127.0.0.1:54324";
export const SHOTS = path.join(DIR, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
if (!ANON || !SERVICE) throw new Error("Set SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY (see e2e/README.md)");

export async function launch() {
  // CHROMIUM_PATH lets a machine reuse a preinstalled browser; CI uses Playwright's own.
  return chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
}

export async function newPhone(browser) {
  const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("  [pageerror]", e.message));
  page.on("console", (m) => m.type() === "error" && console.log("  [console]", m.text()));
  return { ctx, page };
}

/** Logs in with the shared test password and waits for Today. */
export async function loginAs(browser, email) {
  const s = await newPhone(browser);
  s.page.on("dialog", (d) => d.accept());
  await s.page.goto(`${APP}/login`);
  await s.page.fill("#email", email);
  await s.page.fill("#password", "senha123");
  await s.page.click("button:text-is('Entrar')");
  await s.page.waitForURL("**/hoje");
  return s.page;
}

/** Runs SQL as the database owner (psql reads PGHOST/PGPORT/PGUSER/PGPASSWORD). */
export function sql(query) {
  return execFileSync("psql", ["-v", "ON_ERROR_STOP=1", "-tAc", query], {
    env: { PGHOST: "127.0.0.1", PGPORT: "54322", PGUSER: "postgres", PGPASSWORD: "postgres", PGDATABASE: "postgres", ...process.env },
  })
    .toString()
    .trim();
}

/** The access token of the session stored in the page's Supabase cookie. */
export function accessToken(page) {
  return page.evaluate(() => {
    const raw = document.cookie
      .split("; ")
      .filter((c) => c.startsWith("sb-"))
      .map((c) => c.split("=").slice(1).join("="))
      .join("");
    const json = raw.startsWith("base64-") ? atob(raw.slice(7).replace(/-/g, "+").replace(/_/g, "/")) : decodeURIComponent(raw);
    return JSON.parse(json).access_token;
  });
}

/**
 * Latest e-mail sent to `email` by the local Supabase mail catcher (HTML body), waiting for it.
 * Supports Mailpit (current Supabase CLI) and Inbucket (older CLI versions).
 */
export async function lastMailTo(email, { after = 0 } = {}) {
  for (let i = 0; i < 40; i++) {
    const html = (await fromMailpit(email, after)) ?? (await fromInbucket(email, after));
    if (html) return html;
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

async function fromMailpit(email, after) {
  const list = await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`).then(
    (r) => (r.ok ? r.json() : null),
    () => null,
  );
  const msg = list?.messages?.find((m) => Date.parse(m.Created) > after);
  if (!msg) return null;
  const full = await fetch(`${MAIL}/api/v1/message/${msg.ID}`).then((r) => r.json());
  return full.HTML || full.Text;
}

async function fromInbucket(email, after) {
  const box = email.split("@")[0];
  const list = await fetch(`${MAIL}/api/v1/mailbox/${box}`).then(
    (r) => (r.ok ? r.json() : null),
    () => null,
  );
  const msg = Array.isArray(list) ? list.filter((m) => Date.parse(m.date) > after).at(-1) : null;
  if (!msg) return null;
  const full = await fetch(`${MAIL}/api/v1/mailbox/${box}/${msg.id}`).then((r) => r.json());
  return full.body?.html || full.body?.text;
}

export function linkFromMail(html) {
  const m = html?.replace(/=\r?\n/g, "").replace(/=3D/g, "=").match(/href="([^"]+)"/);
  return m?.[1].replace(/&amp;/g, "&");
}

let failures = 0;
export async function step(name, fn) {
  try {
    await fn();
    console.log(`✔ ${name}`);
  } catch (e) {
    failures++;
    const detail = e.message.split("\n").slice(0, 12);
    console.log(`✘ ${name}\n    ${detail.join("\n    ")}`);
    // On GitHub Actions, also publish the failure as an annotation shown on the pull request.
    if (process.env.GITHUB_ACTIONS) {
      const stage = path.basename(process.argv[1] ?? "e2e");
      const esc = (t) => t.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
      console.log(`::error title=${esc(`${stage}: ${name}`).replace(/[:,]/g, " ")}::${esc(detail.join("\n"))}`);
    }
  }
}

export function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

export function done() {
  console.log(failures ? `${failures} FAILURE(S)` : "ALL STEPS PASSED");
  process.exitCode = failures ? 1 : 0;
}

/** Downloads a stored photo with the service key (bypasses RLS; tests only). */
export async function storedFile(objectPath) {
  const r = await fetch(`${SUPABASE}/storage/v1/object/media/${objectPath}`, { headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}` } });
  return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
}

/** Width and height of a baseline/progressive JPEG (reads the SOF marker), or null. */
export function jpegSize(buf) {
  if (!buf || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  for (let i = 2; i < buf.length - 9; ) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

/**
 * Takes the in-app typing test inside `card` (3 seconds in the test database, see setup.sql):
 * types the shown words at a human pace until the test ends.
 */
export async function typingTest(page, card) {
  await card.getByRole("button", { name: "Começar teste" }).click();
  const input = card.getByTestId("typing-input");
  await input.waitFor();
  while ((await card.getAttribute("data-state").catch(() => null)) !== null && (await card.getByTestId("typing-test").getAttribute("data-phase").catch(() => "gone")) === "running") {
    const word = await card.getByTestId("typing-word-current").innerText().catch(() => "");
    if (!word) break;
    await input.pressSequentially(`${word} `, { delay: 90 }).catch(() => {});
  }
}

