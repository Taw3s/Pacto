// Copies what the video draws into public/: the app's sprites and icon, and the demo screenshots
// (demo/out, made by the "Video shots" workflow; see README.md).
import fs from "node:fs";
import path from "node:path";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const copy = (from, to) => {
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from)) if (/\.(png|json)$/.test(f)) fs.copyFileSync(path.join(from, f), path.join(to, f));
};
copy(path.join(DIR, "../../public/lowpoly"), path.join(DIR, "public/lowpoly"));
copy(path.join(DIR, "../../public/icons"), path.join(DIR, "public/icons"));
const shots = process.argv[2] ?? path.join(DIR, "demo/out");
if (!fs.existsSync(path.join(shots, "meta.json"))) throw new Error(`no screenshots in ${shots}: run the "Video shots" workflow and unzip its artifact there`);
copy(shots, path.join(DIR, "public/shots"));
console.log("public/: sprites, icons and shots ready");
