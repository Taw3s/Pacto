// Renders the low-poly models (models.js) in headless Chromium and saves 48×48 PNG sprites.
//   node render.mjs                      -> every model into public/lowpoly
//   node render.mjs judge- bench         -> only names starting with these prefixes
// Set CHROMIUM_PATH to reuse an installed browser; otherwise Playwright's own is used.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const OUT = process.env.OUT ?? path.join(DIR, "../../public/lowpoly");
const SIZE = Number(process.env.SIZE ?? 48);
const only = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });

const server = http
  .createServer((req, res) => {
    if (req.url === "/") {
      res.writeHead(200, { "content-type": "text/html" });
      return res.end(`<!doctype html><script type="module">import { render, MODELS } from "./models.js"; window.render = render; window.names = Object.keys(MODELS); window.ready = true;</script>`);
    }
    const file = path.join(DIR, path.normalize(decodeURIComponent(req.url.split("?")[0])));
    if (!file.startsWith(DIR) || !fs.existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": file.endsWith(".js") ? "text/javascript" : "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(0);
const port = server.address().port;

// Software WebGL, so the output is the same on any machine.
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("pageerror", e.message));
await page.goto(`http://localhost:${port}/`);
await page.waitForFunction(() => window.ready === true);
const names = (await page.evaluate(() => window.names)).filter((n) => only.length === 0 || only.some((o) => n.startsWith(o)));
for (const name of names) {
  const url = await page.evaluate(([n, s]) => window.render(n, s), [name, SIZE]);
  fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(url.split(",")[1], "base64"));
}
console.log(`rendered ${names.length} sprite(s) into ${OUT}`);
await browser.close();
server.close();
