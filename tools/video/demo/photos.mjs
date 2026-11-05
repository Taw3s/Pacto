// Draws the two demo "photos" of the video's proofs (a notebook page and an open book) as 1600×1200 JPEGs.
// They are illustrations made here, not photos of anyone: run once and commit the output (demo/photos/).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const font = (p) => `file://${path.join(DIR, "..", "node_modules", p)}`;

const desk = `
  background:
    repeating-linear-gradient(92deg, rgba(0,0,0,.05) 0 3px, transparent 3px 19px),
    repeating-linear-gradient(88deg, rgba(255,255,255,.04) 0 2px, transparent 2px 41px),
    linear-gradient(160deg, #8a5a33, #6e4426 55%, #5a361d);`;

const base = `
  @font-face { font-family: Hand; src: url(${font("@fontsource/caveat/files/caveat-latin-500-normal.woff2")}); }
  @font-face { font-family: Hand; font-weight: 700; src: url(${font("@fontsource/caveat/files/caveat-latin-700-normal.woff2")}); }
  * { box-sizing: border-box; margin: 0; }
  body { width: 1600px; height: 1200px; overflow: hidden; ${desk} position: relative; }
  .shadow { box-shadow: 0 30px 60px rgba(0,0,0,.45), 0 8px 16px rgba(0,0,0,.3); }
`;

const notebook = `<style>${base}
  .page { position: absolute; left: 330px; top: 70px; width: 900px; height: 1080px; transform: rotate(-3deg);
    background: repeating-linear-gradient(#fdfbf4 0 58px, #b9cde6 58px 60px), #fdfbf4; border-left: 3px solid #e7a0a0; padding: 90px 70px 0 110px;
    font-family: Hand; color: #233a7a; font-size: 46px; line-height: 60px; }
  .page::before { content: ""; position: absolute; left: 70px; top: 0; bottom: 0; width: 3px; background: #e7a0a0; }
  h1 { font-size: 66px; font-weight: 700; line-height: 60px; margin-bottom: 60px; text-decoration: underline; text-decoration-thickness: 3px; }
  .red { color: #b3323a; }
  .box { display: inline-block; border: 3px solid #233a7a; padding: 0 18px; border-radius: 6px; line-height: 50px; }
  .pencil { position: absolute; right: 120px; top: 260px; width: 26px; height: 620px; transform: rotate(18deg);
    background: linear-gradient(90deg, #e9b22a, #f6cd46 50%, #d39a17); border-radius: 4px; }
  .pencil::before { content: ""; position: absolute; top: -58px; left: 0; border-left: 13px solid transparent; border-right: 13px solid transparent; border-bottom: 58px solid #e8c79c; }
  .pencil::after { content: ""; position: absolute; bottom: -40px; left: 0; width: 26px; height: 40px; background: #d9787a; border-radius: 0 0 6px 6px; }
</style>
<div class="page shadow">
  <h1>Funções do 2º grau</h1>
  <p>f(x) = ax² + bx + c</p>
  <p><span class="box">Δ = b² − 4ac</span></p>
  <p>x = (−b ± √Δ) / 2a</p>
  <p class="red">a &gt; 0 → parábola para cima</p>
  <p>Ex. 12: x² − 5x + 6 = 0</p>
  <p>Δ = 25 − 24 = 1 → x = 2 ou x = 3 ✓</p>
  <p>Ex. 13: vértice (2,5; −0,25)</p>
</div>
<div class="pencil shadow"></div>`;

const lorem = [
  "Quando chegou à estação, a cidade ainda dormia. Havia no ar aquele cheiro de chuva que não chega a cair, e as luzes da praça se apagavam uma a uma, como se alguém fosse desligando a noite aos poucos.",
  "Ele guardou o bilhete no bolso do casaco e ficou parado diante do quadro de horários. Nenhum trem partiria antes das sete. Tinha tempo, então, para decidir se voltava para casa ou se seguia adiante.",
  "Do outro lado da praça, um homem abria a banca de jornais. Empilhava as revistas com cuidado, alisando as capas, como quem arruma a casa para receber uma visita que talvez nem venha.",
  "Lembrou-se da carta que nunca respondera. Três linhas, escritas às pressas, que pediam apenas uma resposta: sim ou não. Durante meses, achou que o silêncio também fosse uma forma de responder.",
];
const book = `<style>${base}
  .book { position: absolute; overflow: visible; left: 150px; top: 120px; width: 1300px; height: 960px; transform: rotate(1.5deg); display: flex;
    background: #3b2a1e; padding: 14px; border-radius: 10px; }
  .pg { flex: 1; background: linear-gradient(90deg, #f3ead6, #fbf6ea 12%, #fbf6ea 88%, #efe4cc); padding: 80px 70px;
    font-family: Georgia, "DejaVu Serif", serif; font-size: 25px; line-height: 40px; overflow: hidden; color: #2b2620; text-align: justify; position: relative; }
  .pg + .pg { background: linear-gradient(270deg, #f3ead6, #fbf6ea 12%, #fbf6ea 88%, #efe4cc); }
  .pg p { text-indent: 40px; margin-bottom: 8px; }
  .ch { text-align: center; text-transform: uppercase; letter-spacing: 6px; font-size: 24px; margin-bottom: 40px; color: #6b5b48; }
  .n { position: absolute; bottom: 34px; font-size: 22px; color: #6b5b48; }
  .ribbon { position: absolute; left: 50%; top: -20px; width: 30px; height: 700px; margin-left: -15px; background: #8f2232; }
</style>
<div class="book shadow">
  <div class="pg"><div class="ch">Capítulo 4</div>${lorem.slice(0, 2).map((t) => `<p>${t}</p>`).join("")}<span class="n" style="left:70px">48</span></div>
  <div class="pg">${lorem.slice(2).map((t) => `<p>${t}</p>`).join("")}<span class="n" style="right:70px">49</span></div>
  <div class="ribbon"></div>
</div>`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
for (const [name, html] of Object.entries({ study: notebook, reading: book })) {
  // A file:// page (not setContent's about:blank) so the local font files load.
  const file = path.join(os.tmpdir(), `pacto-photo-${name}.html`);
  fs.writeFileSync(file, `<!doctype html><meta charset="utf-8">${html}`);
  await page.goto(`file://${file}`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(DIR, "photos", `${name}.jpg`), type: "jpeg", quality: 85 });
}
await browser.close();
console.log("demo/photos: study.jpg, reading.jpg");
