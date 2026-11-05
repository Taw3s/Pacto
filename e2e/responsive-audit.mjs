// Responsive audit, run by hand after big layout changes (not part of run.sh): every screen at 6 widths, after the
// E2E stages have filled the local database. Flags page-level horizontal scroll, elements leaving the viewport,
// clipped text, words split across lines without a hyphen and tap targets under 44 px; screen-reader-only text
// is listed apart as "sr-only (ok)". Screenshots go next to report.json: look at them too, an empty report is
// not proof that a screen is fine.
//   cd e2e && node responsive-audit.mjs /tmp/audit
import { APP, launch } from "./lib.mjs";
import { execSync } from "node:child_process";
import fs from "node:fs";

const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const WIDTHS = [320, 360, 390, 768, 1024, 1440];
const sql = (q) =>
  execSync(`PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();

const ana = sql("select id from auth.users where email = 'ana@pacto.test'");
const proof = sql(`select id from checkins where user_id = '${ana}' and goal = 'study' order by created_at desc limit 1`);
const tribunal = sql("select checkin_id from disputes order by created_at desc limit 1");
const PAGES = [
  ["login", "/login", false],
  ["join", "/join", false],
  ["hoje", "/hoje", true],
  ["feed", "/feed", true],
  ["ranking", "/ranking", true],
  ["dividas", "/dividas", true],
  ["historico", `/historico/${ana}`, true],
  ["prova", `/checkin/${proof}`, true],
  ["tribunal", `/checkin/${tribunal}`, true],
  ["config", "/config", true],
];

function check() {
  const vw = window.innerWidth;
  const out = [];
  const label = (el) => {
    const t = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 40);
    const tid = el.getAttribute("data-testid");
    return `${el.tagName.toLowerCase()}${tid ? `[${tid}]` : ""}${el.id ? `#${el.id}` : ""} "${t}"`;
  };
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || +s.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  // inside a container that scrolls or clips sideways on purpose
  const clippedByAncestor = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true;
    }
    return false;
  };
  if (document.documentElement.scrollWidth > vw + 1) out.push({ kind: "page-scroll-x", what: `scrollWidth ${document.documentElement.scrollWidth} > ${vw}` });
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el) || el.closest("[aria-hidden=true]")) continue;
    const r = el.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1) && !clippedByAncestor(el) && getComputedStyle(el).position !== "fixed")
      out.push({ kind: "off-screen", what: label(el), detail: `left ${Math.round(r.left)} right ${Math.round(r.right)}` });
    const s = getComputedStyle(el);
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    // Text for screen readers only (Tailwind sr-only: 1x1 box, clipped on purpose) is not a visual defect.
    const srOnly = r.width <= 1 && r.height <= 1 && s.position === "absolute" && s.overflow === "hidden";
    if (hasText && srOnly) out.push({ kind: "sr-only (ok)", what: label(el) });
    else if (hasText && (s.overflowX === "hidden" || s.textOverflow === "ellipsis" || s.webkitLineClamp !== "none") && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2))
      out.push({ kind: "clipped-text", what: label(el), detail: `${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight}` });
    // A word split across lines without a hyphen ("PER / FIL"): the box only grows taller, nothing is clipped.
    if (hasText && s.hyphens !== "auto") {
      for (const n of el.childNodes) {
        if (n.nodeType !== 3) continue;
        // Words are split at their own hyphens first: "e-" / "mail" on two lines is a normal break.
        for (const m of n.textContent.matchAll(/[^\s-]{2,}-?/g)) {
          const range = document.createRange();
          range.setStart(n, m.index);
          range.setEnd(n, m.index + m[0].length);
          const lines = new Set([...range.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top)));
          if (lines.size > 1) {
            out.push({ kind: "broken-word", what: label(el), detail: m[0] });
            break;
          }
        }
      }
    }
  }
  for (const el of document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=radio], summary")) {
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    // inline links inside running text are exempt (WCAG 2.5.8 inline exception)
    if (el.tagName === "A" && s.display === "inline" && el.parentElement && /^(P|LI|SPAN)$/.test(el.parentElement.tagName)) continue;
    // an input covered by a bigger label/target (file inputs, the typing test's input) is measured by its wrapper
    if (el.tagName === "INPUT" && (el.type === "file" || +s.opacity === 0)) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 43.5 || r.width < 43.5) out.push({ kind: "small-target", what: label(el), detail: `${Math.round(r.width)}x${Math.round(r.height)}` });
  }
  return out;
}

const b = await launch();
const report = {};
for (const w of WIDTHS) {
  const mobile = w < 768;
  const ctx = await b.newContext({ viewport: { width: w, height: mobile ? 780 : 900 }, isMobile: mobile, hasTouch: mobile, locale: "pt-BR" });
  const anon = await ctx.newPage();
  for (const [name, path] of PAGES.filter((p) => !p[2])) {
    await anon.goto(APP + path);
    await anon.waitForLoadState("networkidle");
    report[`${name}@${w}`] = await anon.evaluate(check);
    await anon.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: true });
  }
  await anon.goto(`${APP}/login`);
  await anon.fill("#email", "ana@pacto.test");
  await anon.fill("#password", "senha123");
  await anon.click("button:text-is('Entrar')");
  await anon.waitForURL("**/hoje");
  for (const [name, path] of PAGES.filter((p) => p[2])) {
    await anon.goto(APP + path);
    await anon.waitForLoadState("networkidle");
    await anon.waitForTimeout(300);
    report[`${name}@${w}`] = await anon.evaluate(check);
    await anon.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: true });
  }
  // someone with pending goals: the forms and the typing test
  const ctx2 = await b.newContext({ viewport: { width: w, height: mobile ? 780 : 900 }, isMobile: mobile, hasTouch: mobile, locale: "pt-BR" });
  const bia = await ctx2.newPage();
  // Someone still in the group with goals pending today (stage m takes Bia, Caio and Eva out).
  const pending = sql(`select u.email from members m join auth.users u on u.id = m.user_id
    where u.email like '%@pacto.test' and u.email <> 'ana@pacto.test' and u.encrypted_password is not null
      and (select count(distinct c.goal) from checkins c where c.user_id = m.user_id and c.day = sp_today() and c.goal <> 'project') < 3
    order by u.email limit 1`);
  if (!pending) {
    console.log(`(no member with pending goals at ${w} px: the pending view was not audited)`);
    await ctx2.close();
    await ctx.close();
    continue;
  }
  await bia.goto(`${APP}/login`);
  await bia.fill("#email", pending);
  await bia.fill("#password", "senha123");
  await bia.click("button:text-is('Entrar')");
  await bia.waitForURL("**/hoje");
  await bia.waitForLoadState("networkidle");
  report[`hoje-pendente@${w}`] = await bia.evaluate(check);
  await bia.screenshot({ path: `${OUT}/hoje-pendente-${w}.png`, fullPage: true });
  await ctx2.close();
  await ctx.close();
}
await b.close();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
// summary: each finding once, with the widths where it shows
const seen = new Map();
for (const [key, items] of Object.entries(report)) {
  const [page, w] = key.split("@");
  for (const it of items) {
    const k = `${page} | ${it.kind} | ${it.what}`;
    if (!seen.has(k)) seen.set(k, { widths: [], detail: it.detail });
    seen.get(k).widths.push(w);
  }
}
const sorted = [...seen].sort(([a], [b]) => Number(a.includes("sr-only")) - Number(b.includes("sr-only")) || a.localeCompare(b));
for (const [k, v] of sorted) console.log(`${k} | ${v.widths.join(",")} | ${v.detail ?? ""}`);
