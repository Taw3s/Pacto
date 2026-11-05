// Builds the app icons from the low-poly judge (models.js: logoJudge) into public/icons.
//   node icons.mjs        (set CHROMIUM_PATH to reuse an installed browser)
// The judge is rendered large, cropped to a bust and set on the app's yellow, leaving through the bottom edge
// like a profile photo. The maskable icon keeps the face inside the 80% safe circle.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const OUT = process.env.OUT ?? path.join(DIR, "../../public/icons");
const ICONS = [
  { file: "icon-512.png", size: 512, height: 0.74 },
  { file: "icon-192.png", size: 192, height: 0.74 },
  { file: "apple-touch-icon.png", size: 180, height: 0.74 },
  { file: "icon-maskable-512.png", size: 512, height: 0.66 },
];

const server = http
  .createServer((req, res) => {
    if (req.url === "/") {
      res.writeHead(200, { "content-type": "text/html" });
      return res.end(`<!doctype html><script type="module">import { render } from "./models.js"; window.render = render; window.ready = true;</script>`);
    }
    const file = path.join(DIR, path.normalize(decodeURIComponent(req.url.split("?")[0])));
    if (!file.startsWith(DIR) || !fs.existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": file.endsWith(".js") ? "text/javascript" : "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(0);

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("pageerror", e.message));
await page.goto(`http://localhost:${server.address().port}/`);
await page.waitForFunction(() => window.ready === true);
fs.mkdirSync(OUT, { recursive: true });
for (const icon of ICONS) {
  const url = await page.evaluate(async ({ size, height }) => {
    const img = new Image();
    img.src = window.render("logoJudge", 1024);
    await img.decode();
    const src = document.createElement("canvas");
    src.width = src.height = 1024;
    const sg = src.getContext("2d");
    sg.drawImage(img, 0, 0);
    // bounding box of the figure (skip the faint blob shadow under the feet)
    const px = sg.getImageData(0, 0, 1024, 1024).data;
    let x0 = 1024, y0 = 1024, x1 = 0;
    for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) if (px[(y * 1024 + x) * 4 + 3] > 200) {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y);
    }
    let y1 = 0;
    for (let y = 1023; y >= 0 && !y1; y--) for (let x = 0; x < 1024; x++) if (px[(y * 1024 + x) * 4 + 3] > 200) { y1 = y; break; }
    // bust: head, hair and collar
    const bw = x1 - x0, bh = Math.round((y1 - y0) * 0.6);
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    g.fillStyle = "#ffcd38";
    g.fillRect(0, 0, size, size);
    // a lighter disc behind the head, like a spotlight
    g.fillStyle = "#ffdc6e";
    g.beginPath();
    g.arc(size / 2, size * 0.46, size * 0.36, 0, Math.PI * 2);
    g.fill();
    const h = size * height, w = (bw / bh) * h;
    g.imageSmoothingQuality = "high";
    g.drawImage(src, x0, y0, bw, bh, (size - w) / 2, size - h, w, h);
    return c.toDataURL("image/png");
  }, icon);
  fs.writeFileSync(path.join(OUT, icon.file), Buffer.from(url.split(",")[1], "base64"));
}
console.log(`wrote ${ICONS.length} icons into ${OUT}`);
await browser.close();
server.close();
