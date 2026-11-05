// Procedural PS1/N64-style low-poly props for Pacto. Original work (no third-party assets).
import * as THREE from "./node_modules/three/build/three.module.js";
import { archiveBox, documentTray, pencilCup } from "./decor.js";
import { CROWD } from "./crowd.js";
import { BALLOT } from "./ballot.js";
import { forgottenCoffee, survivorPencil, patchedHeadphones, crookedHourglass, suspiciousLoupe, witnessPigeon, judgeSlippers, rubberGavel, goldenJudgeBust, magistrateDuck } from "./collectibles.js";

// ---- tiny pixel textures -------------------------------------------------------
function tex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function noise(g, w, h, colors, seed = 1) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    g.fillStyle = colors[Math.floor(rnd() * colors.length)];
    g.fillRect(x, y, 1, 1);
  }
}
const mat = (color, map) => new THREE.MeshStandardMaterial({ color: map ? 0xffffff : color, map: map ?? null, flatShading: true, roughness: 1, metalness: 0 });
function box(w, h, d, m) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
}
function cyl(rt, rb, h, seg, m) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
}

// ---- props ---------------------------------------------------------------------

/** Estudo: spiral notebook with a pencil. */
function notebook() {
  const g = new THREE.Group();
  const cover = tex(16, 16, (c) => {
    noise(c, 16, 16, ["#2f6fd6", "#2b66c7", "#3477e0"], 3);
    c.fillStyle = "#f2efe4";
    c.fillRect(5, 5, 7, 3);
    c.fillStyle = "#1f3f80";
    c.fillRect(6, 6, 5, 1);
  });
  const page = tex(16, 16, (c) => {
    c.fillStyle = "#f6f3ea";
    c.fillRect(0, 0, 16, 16);
    c.fillStyle = "#9fc1e8";
    for (let y = 3; y < 16; y += 3) c.fillRect(0, y, 16, 1);
    c.fillStyle = "#e58a8a";
    c.fillRect(3, 0, 1, 16);
    c.fillStyle = "#4b5563";
    c.fillRect(5, 4, 6, 1);
    c.fillRect(5, 7, 8, 1);
    c.fillRect(5, 10, 4, 1);
  });
  const base = box(1.5, 0.06, 1.1, mat(0x2f6fd6, cover));
  g.add(base);
  const pages = box(1.42, 0.08, 1.02, [mat(0xece7da), mat(0xece7da), mat(0, page), mat(0xece7da), mat(0xece7da), mat(0xece7da)]);
  pages.position.y = 0.07;
  g.add(pages);
  const ringMat = mat(0x9aa3ad);
  for (let i = 0; i < 6; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 4, 6), ringMat);
    r.rotation.y = Math.PI / 2;
    r.position.set(-0.72, 0.08, -0.42 + i * 0.17);
    g.add(r);
  }
  // pencil
  const p = new THREE.Group();
  const body = cyl(0.045, 0.045, 0.9, 6, mat(0xf2c230));
  body.rotation.z = Math.PI / 2;
  p.add(body);
  const wood = cyl(0.0, 0.045, 0.14, 6, mat(0xe8c99a));
  wood.rotation.z = -Math.PI / 2;
  wood.position.x = 0.52;
  p.add(wood);
  const lead = cyl(0.0, 0.015, 0.05, 6, mat(0x333333));
  lead.rotation.z = -Math.PI / 2;
  lead.position.x = 0.6;
  p.add(lead);
  const eraser = cyl(0.045, 0.045, 0.1, 6, mat(0xf08aa0));
  eraser.rotation.z = Math.PI / 2;
  eraser.position.x = -0.5;
  p.add(eraser);
  p.position.set(0.15, 0.16, 0.2);
  p.rotation.y = -0.6;
  g.add(p);
  return g;
}

// Hoje, "mesa de trabalho" (Astra brief of 04/11/2026): the goal props change pose with the confirmed state. Each pair
// shares one invisible frame and one shadow, so both poses sit on the same spot at the same scale.
function poseFrame(g, w, h, d, y, shadowRadius) {
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
  frame.position.y = y;
  g.add(frame);
  g.userData.shadowRadius = shadowRadius;
  g.userData.shadowCenter = new THREE.Vector3(0, 0, 0);
  return g;
}

/** Estudo: pending = the top page a little lifted at the free edge, as if about to be turned; done = the page lies flat. */
function notebookPose(lifted) {
  const g = notebook();
  if (lifted) {
    // the far corner of the top page curls up a little, as if about to be turned; same ruled paper as the page
    const ruled = tex(8, 8, (c) => {
      c.fillStyle = "#f6f3ea";
      c.fillRect(0, 0, 8, 8);
      c.fillStyle = "#9fc1e8";
      for (let y = 2; y < 8; y += 3) c.fillRect(0, y, 8, 1);
    });
    const hinge = new THREE.Group();
    hinge.position.set(0.12, 0.115, -0.22);
    hinge.rotation.y = -0.6; // the fold runs across the corner
    // the underside faces away from the light: a little emission keeps it reading as paper, not as a dark wing
    const under = new THREE.MeshStandardMaterial({ color: 0xe4dfd2, emissive: 0x8f8a80, flatShading: true, roughness: 1, metalness: 0 });
    const flap = box(0.62, 0.012, 0.62, [under, under, mat(0, ruled), under, under, under]);
    flap.position.x = 0.31;
    hinge.add(flap);
    hinge.rotation.z = 0.85;
    g.add(hinge);
  }
  return poseFrame(g, 1.62, 0.56, 1.22, 0.24, 0.92);
}

/** Leitura: pending = the book open (the existing sprite); done = closed, resting on the same spot, ribbon out. */
function bookPose(open) {
  let g;
  if (open) g = openBook();
  else {
    g = new THREE.Group();
    const coverMat = mat(0xc0392b);
    const cover = box(0.86, 0.05, 1.12, coverMat);
    cover.position.y = 0.025;
    g.add(cover);
    const pages = box(0.8, 0.12, 1.06, [mat(0xe9e0c6), mat(0xe9e0c6), mat(0xe9e0c6), mat(0xe9e0c6), mat(0xe9e0c6), mat(0xe9e0c6)]);
    pages.position.set(0.02, 0.11, 0);
    g.add(pages);
    const top = box(0.86, 0.05, 1.12, coverMat);
    top.position.y = 0.195;
    g.add(top);
    const spine = box(0.06, 0.22, 1.12, mat(0x9e2f23));
    spine.position.set(-0.43, 0.11, 0);
    g.add(spine);
    const ribbon = box(0.05, 0.02, 0.32, mat(0xf2c230));
    ribbon.position.set(0.0, 0.1, 0.66);
    ribbon.rotation.x = 0.5;
    g.add(ribbon);
    g.rotation.y = 0.12; // set down a little crooked, as it was put away
  }
  return poseFrame(g, 1.74, 0.4, 1.24, 0.18, 0.9);
}
// The camera looks down on the keyboard, so sinking alone barely shows: the pressed bar also darkens, as a key does in the
// shadow of its neighbours. Two steps (half, full); the rest frame is the plain `keyboard`.
const keyboardPress1 = () => keyboard(0.025, 0xd6cdb4);
const keyboardPress2 = () => keyboard(0.05, 0xb9b097);
const notebookPending = () => notebookPose(true);
const notebookDone = () => notebookPose(false);
const bookPending = () => bookPose(true);
const bookDone = () => bookPose(false);

/** Digitação: retro beige keyboard. */
function keyboard(press = 0, pressedTint = 0) {
  const g = new THREE.Group();
  const shell = box(2.0, 0.14, 0.8, mat(0xcfc3a5));
  g.add(shell);
  const back = box(2.0, 0.1, 0.18, mat(0xbcb093));
  back.position.set(0, 0.11, -0.31);
  g.add(back);
  const keyMat = mat(0xece4cf);
  const special = { "0,0": 0xd9534f, "3,11": 0x3aa6a0, "1,11": 0x3aa6a0 };
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 12; c++) {
      if (r === 3 && c > 2 && c < 9) continue;
      const k = box(0.12, 0.07, 0.12, special[`${r},${c}`] ? mat(special[`${r},${c}`]) : keyMat);
      k.position.set(-0.84 + c * 0.153, 0.1, -0.2 + r * 0.15);
      g.add(k);
    }
  }
  // `press` sinks the space bar (Hoje, typing done: down and back in 240 ms); it never rises above the back rim, so the
  // framing of every frame matches the resting sprite
  const space = box(0.88, 0.07, 0.12, pressedTint ? mat(pressedTint) : keyMat);
  space.position.set(-0.84 + 5.5 * 0.153, 0.1 - press, -0.2 + 3 * 0.15);
  g.add(space);
  const led = box(0.05, 0.02, 0.03, mat(0x5cf27a));
  led.position.set(0.85, 0.17, -0.31);
  g.add(led);
  g.rotation.x = 0.06;
  return g;
}

/** Leitura: open hardcover book. */
function openBook() {
  const g = new THREE.Group();
  const text = tex(16, 16, (c) => {
    c.fillStyle = "#f5eedb";
    c.fillRect(0, 0, 16, 16);
    c.fillStyle = "#6b6b6b";
    for (let y = 2; y < 15; y += 2) {
      const w = 9 + ((y * 7) % 5);
      c.fillRect(3, y, w, 1);
    }
  });
  const coverMat = mat(0xc0392b);
  for (const side of [-1, 1]) {
    const half = new THREE.Group();
    const cover = box(0.82, 0.05, 1.12, coverMat);
    cover.position.x = side * 0.41;
    half.add(cover);
    const pages = box(0.76, 0.1, 1.04, [mat(0xe9e0c6), mat(0xe9e0c6), mat(0, text), mat(0xe9e0c6), mat(0xe9e0c6), mat(0xe9e0c6)]);
    pages.position.set(side * 0.4, 0.075, 0);
    half.add(pages);
    half.rotation.z = side * -0.18;
    half.position.y = 0.06;
    g.add(half);
  }
  const ribbon = box(0.05, 0.02, 0.5, mat(0xf2c230));
  ribbon.position.set(0.02, 0.06, 0.68);
  ribbon.rotation.x = 0.4;
  g.add(ribbon);
  return g;
}

/** Projeto: beige CRT computer on a desktop case. */
function computer() {
  const g = new THREE.Group();
  const beige = mat(0xd8ccb0);
  const darker = mat(0xc2b597);
  const screen = tex(16, 12, (c) => {
    c.fillStyle = "#123b3a";
    c.fillRect(0, 0, 16, 12);
    c.fillStyle = "#3fe0a8";
    c.fillRect(2, 2, 6, 1);
    c.fillRect(2, 4, 9, 1);
    c.fillRect(4, 6, 7, 1);
    c.fillRect(2, 8, 5, 1);
    c.fillStyle = "#d3f36b";
    c.fillRect(8, 8, 2, 1);
    c.fillStyle = "#0b2727";
    for (let y = 1; y < 12; y += 2) for (let x = 0; x < 16; x += 1) if ((x + y) % 7 === 0) c.fillRect(x, y, 1, 1);
  });
  const caseBox = box(1.5, 0.35, 1.2, beige);
  caseBox.position.y = 0.175;
  g.add(caseBox);
  const slot = box(0.5, 0.04, 0.02, mat(0x3a3a3a));
  slot.position.set(0.3, 0.22, 0.61);
  g.add(slot);
  const led = box(0.06, 0.04, 0.02, mat(0x5cf27a));
  led.position.set(-0.55, 0.22, 0.61);
  g.add(led);
  const mon = box(1.2, 1.0, 0.9, beige);
  mon.position.set(0, 0.88, -0.05);
  g.add(mon);
  const backTaper = box(0.8, 0.7, 0.4, darker);
  backTaper.position.set(0, 0.86, -0.6);
  g.add(backTaper);
  const scr = box(0.98, 0.76, 0.02, [mat(0x123b3a), mat(0x123b3a), mat(0x123b3a), mat(0x123b3a), mat(0, screen), mat(0x123b3a)]);
  scr.position.set(0, 0.9, 0.41);
  g.add(scr);
  return g;
}

/** Folga: striped beach chair with a drink. */
function beachChair() {
  const g = new THREE.Group();
  const stripes = tex(8, 16, (c) => {
    for (let y = 0; y < 16; y++) {
      c.fillStyle = Math.floor(y / 2) % 2 ? "#f4efe2" : "#e0533d";
      c.fillRect(0, y, 8, 1);
    }
  });
  const wood = mat(0xb07a45);
  const seat = box(0.8, 0.04, 0.7, mat(0, stripes));
  seat.position.set(0, 0.35, 0.15);
  g.add(seat);
  const backrest = box(0.8, 0.04, 0.9, mat(0, stripes));
  backrest.position.set(0, 0.72, -0.38);
  backrest.rotation.x = -1.05;
  g.add(backrest);
  for (const x of [-0.42, 0.42]) {
    const legF = box(0.05, 0.42, 0.05, wood);
    legF.position.set(x, 0.18, 0.45);
    legF.rotation.x = 0.35;
    g.add(legF);
    const legB = box(0.05, 0.95, 0.05, wood);
    legB.position.set(x, 0.45, -0.25);
    legB.rotation.x = -0.45;
    g.add(legB);
    const arm = box(0.06, 0.04, 0.7, wood);
    arm.position.set(x, 0.55, 0.1);
    g.add(arm);
  }
  // coconut drink
  const coco = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), mat(0x6b4a2b));
  coco.position.set(0.85, 0.16, 0.35);
  g.add(coco);
  const straw = cyl(0.015, 0.015, 0.3, 4, mat(0xf08aa0));
  straw.position.set(0.88, 0.36, 0.35);
  straw.rotation.z = -0.3;
  g.add(straw);
  return g;
}

/** Dívida: soda can. */
function sodaCan() {
  const g = new THREE.Group();
  const label = tex(24, 16, (c) => {
    c.fillStyle = "#d4202a";
    c.fillRect(0, 0, 24, 16);
    c.fillStyle = "#ffffff";
    for (let x = 0; x < 24; x++) c.fillRect(x, 8 + Math.round(Math.sin(x / 3) * 2), 1, 1);
    c.fillRect(4, 4, 6, 1);
    c.fillRect(4, 5, 1, 2);
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 1.0, 10), [mat(0, label), mat(0xc8cdd2), mat(0xb9bec4)]);
  body.position.y = 0.55;
  g.add(body);
  const top = cyl(0.27, 0.33, 0.08, 10, mat(0xc8cdd2));
  top.position.y = 1.09;
  g.add(top);
  const bottom = cyl(0.33, 0.27, 0.06, 10, mat(0xaab0b6));
  bottom.position.y = 0.03;
  g.add(bottom);
  return g;
}

/** Dívida: coxinha. */
function coxinha() {
  const pts = [];
  const profile = [
    [0.0, 0.0],
    [0.3, 0.02],
    [0.42, 0.16],
    [0.4, 0.36],
    [0.28, 0.58],
    [0.14, 0.78],
    [0.04, 0.9],
    [0.0, 0.92],
  ];
  for (const [x, y] of profile) pts.push(new THREE.Vector2(x, y));
  const crust = tex(16, 16, (c) => noise(c, 16, 16, ["#d98b2b", "#c97a20", "#e6a043", "#b86a18"], 7));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 8), mat(0, crust));
  const g = new THREE.Group();
  g.add(m);
  return g;
}


// ---- debt menu items (a group picks 1 or 2; see src/lib/debt-items.ts) ------------

/** Dívida: café (mug with saucer and a little steam). */
function coffeeCup() {
  const g = new THREE.Group();
  const cream = mat(0xf1ebe0);
  const saucer = cyl(0.5, 0.42, 0.06, 10, cream);
  saucer.position.y = 0.03;
  g.add(saucer);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.5, 10, 1, true), mat(0xffffff));
  cup.position.y = 0.32;
  g.add(cup);
  const bottom = cyl(0.26, 0.26, 0.04, 10, cream);
  bottom.position.y = 0.09;
  g.add(bottom);
  const coffee = cyl(0.31, 0.31, 0.02, 10, mat(0x4a2a14));
  coffee.position.y = 0.52;
  g.add(coffee);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 4, 8, Math.PI), cream);
  handle.position.set(0.36, 0.34, 0);
  handle.rotation.z = -Math.PI / 2;
  g.add(handle);
  for (const [x, z, h] of [[-0.08, 0, 0.22], [0.08, 0.04, 0.3]]) {
    const steam = box(0.05, h, 0.05, mat(0xdfe6ea));
    steam.position.set(x, 0.62 + h / 2, z);
    g.add(steam);
  }
  return g;
}

/** Dívida: barra de chocolate, half unwrapped. */
function chocolateBar() {
  const g = new THREE.Group();
  const choc = mat(0, tex(8, 8, (c) => noise(c, 8, 8, ["#5a3218", "#4a2810", "#6b3d1f"], 3)));
  for (let r = 0; r < 3; r++)
    for (let col = 0; col < 2; col++) {
      const piece = box(0.32, 0.12, 0.26, choc);
      piece.position.set(-0.17 + col * 0.34, 0.1, -0.3 + r * 0.28);
      g.add(piece);
    }
  const wrapper = box(0.72, 0.16, 0.5, mat(0xc0262d));
  wrapper.position.set(0, 0.1, 0.42);
  g.add(wrapper);
  const foil = box(0.72, 0.02, 0.08, mat(0xd8dde2));
  foil.position.set(0, 0.17, 0.16);
  g.add(foil);
  const band = box(0.74, 0.17, 0.08, mat(0xf2c230));
  band.position.set(0, 0.1, 0.5);
  g.add(band);
  g.rotation.y = 0.35;
  return g;
}

/** Dívida: açaí na tigela, with banana and granola. */
function acaiBowl() {
  const g = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.3, 0.42, 10), mat(0xe8e2d6));
  bowl.position.y = 0.21;
  g.add(bowl);
  const acai = cyl(0.46, 0.46, 0.06, 10, mat(0, tex(8, 8, (c) => noise(c, 8, 8, ["#4b1f4f", "#3d1842", "#5c2861"], 4))));
  acai.position.y = 0.44;
  g.add(acai);
  for (const [x, z] of [[-0.18, 0.1], [0.05, 0.2], [0.2, -0.05]]) {
    const banana = cyl(0.08, 0.08, 0.04, 6, mat(0xf3e2a0));
    banana.position.set(x, 0.49, z);
    g.add(banana);
  }
  for (const [x, z] of [[-0.05, -0.18], [-0.22, -0.12], [0.12, -0.22], [0.0, 0.0]]) {
    const granola = box(0.07, 0.05, 0.07, mat(0xb07a3a));
    granola.position.set(x, 0.49, z);
    granola.rotation.y = x * 7;
    g.add(granola);
  }
  return g;
}

/** Dívida: fatia de pizza. */
function pizzaSlice() {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.55);
  shape.lineTo(0.42, 0.45);
  shape.lineTo(-0.42, 0.45);
  shape.lineTo(0, -0.55);
  const cheese = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false }), mat(0xf3c24a));
  cheese.rotation.x = -Math.PI / 2;
  cheese.position.y = 0.08;
  g.add(cheese);
  const crust = box(0.92, 0.14, 0.14, mat(0xc88a3e));
  crust.position.set(0, 0.12, -0.47);
  g.add(crust);
  for (const [x, z] of [[0, -0.2], [-0.15, -0.38], [0.17, -0.34], [0.02, 0.15]]) {
    const pep = cyl(0.08, 0.08, 0.03, 8, mat(0xb8312b));
    pep.position.set(x, 0.18, z);
    g.add(pep);
  }
  g.rotation.y = Math.PI;
  return g;
}

/** Dívida: sorvete de casquinha. */
function iceCream() {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.62, 8), mat(0, tex(8, 8, (c) => noise(c, 8, 8, ["#d8a55a", "#c38f45", "#e4b46a"], 5))));
  cone.rotation.x = Math.PI;
  cone.position.y = 0.31;
  g.add(cone);
  const scoop1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.27, 0), mat(0xf5c4d2));
  scoop1.position.y = 0.72;
  g.add(scoop1);
  const scoop2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), mat(0xf6efe0));
  scoop2.position.y = 1.0;
  g.add(scoop2);
  const cherry = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), mat(0xc8202b));
  cherry.position.y = 1.22;
  g.add(cherry);
  return g;
}

/** Dívida: Pix de R$ 5 (a coin stack with a note). */
function pixCoin() {
  const g = new THREE.Group();
  const note = box(0.86, 0.03, 0.46, mat(0, tex(16, 8, (c) => {
    c.fillStyle = "#8a6fb8";
    c.fillRect(0, 0, 16, 8);
    c.fillStyle = "#b9a5dc";
    c.fillRect(1, 1, 14, 6);
    c.fillStyle = "#5b4489";
    c.fillRect(10, 2, 3, 4);
  })));
  note.position.set(-0.08, 0.02, 0.12);
  note.rotation.y = 0.25;
  g.add(note);
  const gold = mat(0, tex(8, 8, (c) => noise(c, 8, 8, ["#e8b53a", "#d49f22", "#f2c85a"], 6)));
  for (let i = 0; i < 4; i++) {
    const coin = cyl(0.22, 0.22, 0.07, 10, gold);
    coin.position.set(0.22 + (i % 2) * 0.02, 0.07 + i * 0.075, -0.1);
    g.add(coin);
  }
  // The Pix mark: a small teal diamond on top.
  const mark = box(0.14, 0.03, 0.14, mat(0x32bcad));
  mark.position.set(0.22, 0.38, -0.1);
  mark.rotation.y = Math.PI / 4;
  g.add(mark);
  return g;
}

// ---- tribunal & ranking props ---------------------------------------------------

const woodTex = (seed, colors = ["#7a4a24", "#6b3f1e", "#85542b", "#5e3518"]) =>
  tex(16, 16, (c) => {
    noise(c, 16, 16, colors, seed);
    c.fillStyle = "#4a2a12";
    for (let y = 2; y < 16; y += 5) c.fillRect(0, y, 16, 1);
  });

/** Sound block + gavel; `angle` = how far the gavel is raised (radians), for the strike animation. */
function gavelScene(angle) {
  const g = new THREE.Group();
  const wood = mat(0, woodTex(11, ["#4a2a12", "#3d220e", "#55301a"]));
  const honey = mat(0, woodTex(5, ["#c98a45", "#b97a38", "#d69a55"]));
  const gold = mat(0xf0c040);
  // sound block
  const block = cyl(0.62, 0.66, 0.18, 12, wood);
  block.position.set(0.15, 0.09, 0);
  g.add(block);
  const ring = cyl(0.64, 0.64, 0.04, 12, gold);
  ring.position.set(0.15, 0.14, 0);
  g.add(ring);
  // gavel, pivoting around the far end of the handle (the "hand")
  const pivot = new THREE.Group();
  pivot.position.set(-1.25, 0.44, 0);
  const handle = cyl(0.07, 0.08, 1.25, 6, honey);
  handle.rotation.z = Math.PI / 2;
  handle.position.x = 0.62;
  pivot.add(handle);
  const head = cyl(0.24, 0.24, 0.7, 8, honey);
  head.rotation.x = Math.PI / 2;
  head.position.x = 1.3;
  pivot.add(head);
  for (const z of [-0.2, 0.2]) {
    const band = cyl(0.255, 0.255, 0.07, 8, gold);
    band.rotation.x = Math.PI / 2;
    band.position.set(1.3, 0, z * 1.15);
    pivot.add(band);
  }
  pivot.rotation.z = angle;
  g.add(pivot);
  // invisible frame so every animation frame shares the same camera framing
  const frame = box(2.1, 1.8, 1.2, new THREE.MeshBasicMaterial({ visible: false }));
  frame.position.set(-0.25, 0.9, 0);
  g.add(frame);
  g.userData.shadowRadius = 0.75;
  g.userData.shadowCenter = new THREE.Vector3(0.15, 0, 0);
  return g;
}
const gavel = () => gavelScene(0);
const gavelUp = () => gavelScene(0.95);
const gavelMid = () => gavelScene(0.45);

/** Tribunal: the judge's bench with the scales of justice. */
function judgeBench() {
  const g = new THREE.Group();
  const front = tex(32, 16, (c) => {
    noise(c, 32, 16, ["#6b3f1e", "#5e3518", "#74461f"], 4);
    c.fillStyle = "#4a2a12";
    c.fillRect(0, 0, 32, 1);
    c.fillRect(0, 15, 32, 1);
    for (const x of [2, 11, 21]) {
      c.fillRect(x, 3, 9, 1);
      c.fillRect(x, 12, 9, 1);
      c.fillRect(x, 3, 1, 10);
      c.fillRect(x + 8, 3, 1, 10);
    }
    // gold emblem: scales
    c.fillStyle = "#e3b23c";
    c.fillRect(15, 5, 2, 7);
    c.fillRect(12, 6, 8, 1);
    c.fillRect(12, 7, 1, 2);
    c.fillRect(19, 7, 1, 2);
    c.fillRect(11, 9, 3, 1);
    c.fillRect(18, 9, 3, 1);
    c.fillRect(14, 11, 4, 1);
  });
  const wood = mat(0, woodTex(9));
  const body = box(2.6, 1.0, 0.8, [wood, wood, wood, wood, mat(0, front), wood]);
  body.position.y = 0.5;
  g.add(body);
  const top = box(2.8, 0.1, 1.0, mat(0, woodTex(2, ["#8a5a2e", "#7a4c24", "#94643a"])));
  top.position.y = 1.05;
  g.add(top);
  // little gavel resting on the bench
  const head = cyl(0.09, 0.09, 0.3, 8, mat(0x5e3518));
  head.rotation.x = Math.PI / 2;
  head.position.set(0.8, 1.19, 0.1);
  g.add(head);
  const handle = cyl(0.03, 0.03, 0.5, 6, mat(0x8a5a2e));
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0.55, 1.15, 0.1);
  g.add(handle);
  return g;
}

/** Ranking podium cups: one model, three metals (gold is the original `trophy`). */
const METALS = {
  gold: { tones: ["#f2c230", "#e0ac1c", "#ffd84d"], plate: 0xe0ac1c },
  silver: { tones: ["#c9d0d8", "#aab3bd", "#e6ebf0"], plate: 0xaab3bd },
  bronze: { tones: ["#c98a52", "#a96d3a", "#e0a87a"], plate: 0xa96d3a },
};

/** Ranking: gold cup. */
function trophy(metal = "gold") {
  const g = new THREE.Group();
  const { tones, plate: plateColor } = METALS[metal];
  const gold = mat(0, tex(8, 8, (c) => noise(c, 8, 8, tones, 5)));
  const cupPts = [[0.05, 0.0], [0.42, 0.02], [0.5, 0.25], [0.46, 0.5], [0.34, 0.66], [0.12, 0.74], [0.1, 0.78]].map(([x, y]) => new THREE.Vector2(x, y));
  const cup = new THREE.Mesh(new THREE.LatheGeometry(cupPts.reverse(), 10), gold);
  cup.position.y = 0.62;
  g.add(cup);
  const stem = cyl(0.08, 0.12, 0.3, 8, gold);
  stem.position.y = 0.48;
  g.add(stem);
  const base = box(0.62, 0.26, 0.62, mat(0x4a2a12));
  base.position.y = 0.13;
  g.add(base);
  const plate = box(0.3, 0.1, 0.02, mat(plateColor));
  plate.position.set(0, 0.13, 0.32);
  g.add(plate);
  for (const s of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 4, 8, Math.PI), gold);
    handle.position.set(s * 0.5, 1.0, 0);
    handle.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    g.add(handle);
  }
  return g;
}

const trophySilver = () => trophy("silver");
const trophyBronze = () => trophy("bronze");

/** Tribunal / contestação: scales of justice. */
function scales() {
  const g = new THREE.Group();
  const brass = mat(0xd9a520);
  const dark = mat(0x8a6a1c);
  const base = cyl(0.3, 0.36, 0.1, 8, dark);
  base.position.y = 0.05;
  g.add(base);
  const post = cyl(0.04, 0.05, 1.2, 6, brass);
  post.position.y = 0.7;
  g.add(post);
  const beam = box(1.3, 0.05, 0.05, brass);
  beam.position.y = 1.25;
  beam.rotation.z = 0.12;
  g.add(beam);
  for (const [x, y] of [[-0.62, 1.17], [0.62, 1.33]]) {
    const string = box(0.015, 0.45, 0.015, dark);
    string.position.set(x, y - 0.24, 0);
    g.add(string);
    const pan = cyl(0.24, 0.12, 0.08, 8, brass);
    pan.position.set(x, y - 0.5, 0);
    g.add(pan);
  }
  return g;
}

/** Perfil / histórico: a chunky console memory card (no readable text). */
function memoryCard() {
  const g = new THREE.Group();
  const shell = mat(0, tex(8, 8, (c) => noise(c, 8, 8, ["#9d89cf", "#9482c6", "#a693d6"], 3)));
  const dark = mat(0x55456e);
  const body = box(0.9, 1.1, 0.16, [shell, shell, shell, dark, shell, dark]);
  body.position.y = 0.55;
  g.add(body);
  // two notches on top
  for (const x of [-0.25, 0.25]) {
    const notch = box(0.16, 0.08, 0.18, dark);
    notch.position.set(x, 1.11, 0);
    g.add(notch);
  }
  const label = box(0.62, 0.5, 0.02, mat(0, tex(8, 8, (c) => {
    c.fillStyle = "#e7d6b6"; c.fillRect(0, 0, 8, 8);
    c.fillStyle = "#9d89cf"; c.fillRect(2, 2, 1, 4); c.fillRect(3, 2, 2, 1); c.fillRect(5, 3, 1, 1); c.fillRect(3, 4, 2, 1);
  })));
  label.position.set(0, 0.68, 0.09);
  g.add(label);
  for (const x of [-0.22, 0, 0.22]) {
    const pin = box(0.12, 0.14, 0.02, mat(0xd9af4b));
    pin.position.set(x, 0.18, 0.09);
    g.add(pin);
  }
  g.rotation.y = -0.35;
  return g;
}

/** Histórico: desk calendar with a stand and two rings (no date printed). */
function calendar() {
  const g = new THREE.Group();
  const sheet = tex(12, 12, (c) => {
    c.fillStyle = "#e7d6b6"; c.fillRect(0, 0, 12, 12);
    c.fillStyle = "#6b8cb4"; c.fillRect(0, 0, 12, 3);
    c.fillStyle = "#3d4f6a";
    for (let y = 0; y < 2; y++) for (let x = 0; x < 3; x++) c.fillRect(1 + x * 4, 4 + y * 4, 2, 2);
    c.fillStyle = "#9d89cf"; c.fillRect(5, 8, 2, 2);
  });
  const blue = mat(0x6b8cb4);
  const front = box(1.2, 1.0, 0.06, [blue, blue, blue, blue, mat(0, sheet), mat(0x3d4f6a)]);
  front.position.set(0, 0.55, 0.12);
  front.rotation.x = -0.32;
  g.add(front);
  const back = box(1.2, 1.0, 0.05, mat(0x3d4f6a));
  back.position.set(0, 0.5, -0.22);
  back.rotation.x = 0.35;
  g.add(back);
  for (const x of [-0.3, 0.3]) {
    const ring = box(0.1, 0.16, 0.36, mat(0xc8cdd2));
    ring.position.set(x, 1.04, -0.04);
    g.add(ring);
  }
  return g;
}

// ---- chest & collectibles ---------------------------------------------------------

/** Treasure chest. `turn` rotates it (spin frames); `lid` opens it (radians). */
function chestScene(turn, lid, glow = false) {
  const g = new THREE.Group();
  const wood = mat(0, woodTex(13, ["#8a4f24", "#7a4520", "#955a2b", "#6b3c1b"]));
  const metal = mat(0xd9a520);
  const body = box(1.3, 0.62, 0.85, wood);
  body.position.y = 0.31;
  g.add(body);
  for (const x of [-0.5, 0.5]) {
    const band = box(0.1, 0.64, 0.87, metal);
    band.position.set(x, 0.31, 0);
    g.add(band);
  }
  const lock = box(0.18, 0.2, 0.06, metal);
  lock.position.set(0, 0.5, 0.45);
  g.add(lock);
  // lid hinged at the back
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.62, -0.42);
  const lidMesh = box(1.32, 0.3, 0.87, wood);
  lidMesh.position.set(0, 0.15, 0.42);
  hinge.add(lidMesh);
  for (const x of [-0.5, 0.5]) {
    const b = box(0.1, 0.32, 0.89, metal);
    b.position.set(x, 0.15, 0.42);
    hinge.add(b);
  }
  hinge.rotation.x = -lid;
  g.add(hinge);
  if (lid > 0) {
    const inside = box(1.2, 0.04, 0.75, mat(0x2b1a0c));
    inside.position.y = 0.6;
    g.add(inside);
  }
  if (glow) {
    const light = box(0.9, 0.5, 0.5, new THREE.MeshBasicMaterial({ color: 0xfff0b3 }));
    light.position.set(0, 0.85, 0);
    g.add(light);
    for (const [x, z] of [[-0.35, 0.1], [0.3, -0.1], [0.05, 0.2]]) {
      const ray = box(0.08, 0.7, 0.08, new THREE.MeshBasicMaterial({ color: 0xffcd38 }));
      ray.position.set(x, 1.25, z);
      g.add(ray);
    }
  }
  g.rotation.y = turn;
  const frame = box(1.45, 1.55, 1.2, new THREE.MeshBasicMaterial({ visible: false }));
  frame.position.set(0, 0.78, 0);
  g.add(frame);
  g.userData.shadowRadius = 0.85;
  g.userData.shadowCenter = new THREE.Vector3(0, 0, 0);
  return g;
}
const chest1 = () => chestScene(-0.55, 0);
const chest2 = () => chestScene(-0.15, 0);
const chest3 = () => chestScene(0.25, 0);
const chest4 = () => chestScene(0, 0.35);
const chest5 = () => chestScene(0, 0.9);
const chest6 = () => chestScene(0, 1.45, true);

/** Comum: potted plant. */
function plant() {
  const g = new THREE.Group();
  const pot = cyl(0.32, 0.24, 0.45, 8, mat(0xc0663a));
  pot.position.y = 0.22;
  g.add(pot);
  const rim = cyl(0.36, 0.36, 0.08, 8, mat(0xa9552e));
  rim.position.y = 0.46;
  g.add(rim);
  const leafMat = mat(0, tex(8, 8, (c) => noise(c, 8, 8, ["#4f9a4a", "#3f8a3e", "#5fae55"], 2)));
  for (const [x, y, z, s] of [[0, 0.85, 0, 0.32], [0.2, 0.72, 0.1, 0.24], [-0.18, 0.7, -0.08, 0.25], [0.05, 1.1, -0.05, 0.2]]) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), leafMat);
    leaf.position.set(x, y, z);
    g.add(leaf);
  }
  return g;
}

/** Comum: coffee mug. */
function mug() {
  const g = new THREE.Group();
  const body = cyl(0.3, 0.27, 0.6, 10, mat(0, tex(16, 8, (c) => {
    c.fillStyle = "#e9e2d0"; c.fillRect(0, 0, 16, 8);
    c.fillStyle = "#ffcd38"; c.fillRect(0, 3, 16, 2);
  })));
  body.position.y = 0.3;
  g.add(body);
  const coffee = cyl(0.26, 0.26, 0.02, 10, mat(0x4a2a12));
  coffee.position.y = 0.58;
  g.add(coffee);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.05, 4, 8), mat(0xe9e2d0));
  handle.position.set(0.32, 0.32, 0);
  g.add(handle);
  return g;
}

/** Comum: rubber duck. */
function duck() {
  const g = new THREE.Group();
  const yellow = mat(0xffd23f);
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), yellow);
  body.scale.set(1.15, 0.8, 0.95);
  body.position.y = 0.34;
  g.add(body);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 1), yellow);
  head.position.set(0.22, 0.78, 0);
  g.add(head);
  const beak = box(0.2, 0.08, 0.16, mat(0xf08a24));
  beak.position.set(0.5, 0.74, 0);
  g.add(beak);
  for (const z of [-0.12, 0.12]) {
    const eye = box(0.05, 0.06, 0.05, mat(0x1a1c20));
    eye.position.set(0.38, 0.86, z);
    g.add(eye);
  }
  return g;
}

/** Raro: sitting cat. */
function cat() {
  const g = new THREE.Group();
  const fur = mat(0, tex(8, 8, (c) => {
    noise(c, 8, 8, ["#f0a050", "#e8963f", "#f3ad62"], 6);
    c.fillStyle = "#c97a2a"; c.fillRect(0, 2, 8, 1); c.fillRect(0, 5, 8, 1);
  }));
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), fur);
  body.scale.set(0.9, 1.1, 0.8);
  body.position.y = 0.42;
  g.add(body);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), fur);
  head.position.set(0.05, 0.98, 0.05);
  g.add(head);
  for (const z of [-0.14, 0.14]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 4), fur);
    ear.position.set(0.05, 1.27, z);
    g.add(ear);
    const eye = box(0.04, 0.07, 0.04, mat(0x2f7a3a));
    eye.position.set(0.3, 1.02, z * 0.8);
    g.add(eye);
  }
  const tail = box(0.08, 0.08, 0.55, fur);
  tail.position.set(-0.3, 0.12, 0.25);
  tail.rotation.y = 0.6;
  g.add(tail);
  return g;
}

/** Raro: desk lamp (warm light). */
function lamp() {
  const g = new THREE.Group();
  const teal = mat(0x4a8177);
  const base = box(0.6, 0.1, 0.45, mat(0x2f514d));
  base.position.y = 0.05;
  g.add(base);
  const arm1 = box(0.07, 0.7, 0.07, teal);
  arm1.position.set(-0.12, 0.42, 0);
  arm1.rotation.z = 0.35;
  g.add(arm1);
  const arm2 = box(0.07, 0.55, 0.07, teal);
  arm2.position.set(0.05, 0.92, 0);
  arm2.rotation.z = -0.9;
  g.add(arm2);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.35, 6, 1, true), teal);
  shade.position.set(0.33, 0.95, 0);
  shade.rotation.z = 0.6;
  g.add(shade);
  const bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
  bulb.position.set(0.38, 0.86, 0);
  g.add(bulb);
  return g;
}

/** Raro: desk globe. */
function globe() {
  const g = new THREE.Group();
  const map = tex(16, 8, (c) => {
    c.fillStyle = "#3f7fc4"; c.fillRect(0, 0, 16, 8);
    c.fillStyle = "#5fae55";
    for (const [x, y, w, h] of [[1, 2, 3, 3], [6, 1, 2, 2], [7, 4, 3, 3], [12, 2, 3, 2], [13, 5, 2, 2]]) c.fillRect(x, y, w, h);
  });
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), mat(0, map));
  ball.position.y = 0.78;
  ball.rotation.z = 0.4;
  g.add(ball);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 4, 12, Math.PI), mat(0xd9a520));
  ring.position.y = 0.78;
  ring.rotation.z = 0.4 + Math.PI / 2;
  g.add(ring);
  const stem = cyl(0.04, 0.04, 0.3, 6, mat(0xd9a520));
  stem.position.y = 0.22;
  g.add(stem);
  const base = cyl(0.25, 0.3, 0.1, 8, mat(0x4a2a12));
  base.position.y = 0.05;
  g.add(base);
  return g;
}

/** Lendário: golden book standing on a small stand. */
function goldBook() {
  const g = new THREE.Group();
  const gold = mat(0, tex(8, 8, (c) => noise(c, 8, 8, ["#f2c230", "#e0ac1c", "#ffd84d", "#c99510"], 9)));
  const book = new THREE.Group();
  const front = box(0.75, 1.0, 0.07, gold);
  front.position.z = 0.17;
  book.add(front);
  const back = box(0.75, 1.0, 0.07, gold);
  back.position.z = -0.17;
  book.add(back);
  const spine = box(0.08, 1.0, 0.41, gold);
  spine.position.x = -0.37;
  book.add(spine);
  const pages = box(0.7, 0.94, 0.28, mat(0xf6f0dc));
  pages.position.x = 0.02;
  book.add(pages);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), mat(0xd94a6a));
  gem.position.set(0.02, 0.05, 0.23);
  book.add(gem);
  book.position.y = 0.62;
  book.rotation.y = 0.5;
  book.rotation.z = -0.12;
  g.add(book);
  const stand = box(0.8, 0.1, 0.55, mat(0x4a2a12));
  stand.position.y = 0.05;
  g.add(stand);
  return g;
}

/** Lendário: crown. */
function crown() {
  const g = new THREE.Group();
  const gold = mat(0, tex(8, 8, (c) => noise(c, 8, 8, ["#f2c230", "#e0ac1c", "#ffd84d"], 4)));
  const band = cyl(0.5, 0.45, 0.32, 10, gold);
  band.position.y = 0.16;
  g.add(band);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.38, 4), gold);
    spike.position.set(Math.cos(a) * 0.45, 0.5, Math.sin(a) * 0.45);
    g.add(spike);
    const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), mat(i % 2 ? 0x4a8fe0 : 0xd94a6a));
    jewel.position.set(Math.cos(a) * 0.5, 0.18, Math.sin(a) * 0.5);
    g.add(jewel);
  }
  return g;
}


// ---- the judge (mascot) --------------------------------------------------------------------
// Short, big head, simple geometry, expressive eyebrows. Wine robe, cream collar, wood gavel.
// Every frame is built from the same parts (head, brows, arms, props) with one shared camera
// and frame, so animations never jump. Frames are listed in JUDGE_FRAMES below.
const ROBE_C = ["#682f3c", "#5f2a36", "#6f3442"], COLLAR = 0xe9dcc3, GAVEL = 0x936039, SKIN = 0xe8b48a, HAIR = 0xd9d4cc, BROW = 0x3b302c;

const paperTex = (stamped) =>
  tex(8, 10, (c) => {
    c.fillStyle = "#f2ead6";
    c.fillRect(0, 0, 8, 10);
    c.fillStyle = "#9a8f7a";
    for (const y of [2, 4, 6]) c.fillRect(1, y, 6, 1);
    if (stamped) {
      c.fillStyle = "#2f9e5a";
      c.fillRect(2, 5, 5, 4);
      c.fillStyle = "#f2ead6";
      c.fillRect(3, 6, 1, 1);
      c.fillRect(4, 7, 1, 1);
      c.fillRect(5, 6, 1, 1);
    }
  });

/**
 * p: { brows: flat|happy|angry|raised, mouth: flat|smile|frown|o, eyes: open|closed, tilt, sink,
 *      r: [rx, rz, hold], l: [rx, rz, hold],
 *      paper: null | { hand: "l"|"r", tilt, lift, stamped, at: [x, y, z] (fixed spot instead of the hand) } }
 * rx swings an arm forward (negative), rz swings it outward. hold: gavel|magnifier|finger|stamp|null.
 */
function judgeScene(p) {
  const { brows = "flat", mouth = "flat", eyes = "open", tilt = 0, sink = 0, r = [-0.2, 0.12, "gavel"], l = [-0.1, 0.15, null], paper = null } = p;
  const g = new THREE.Group();
  const robe = mat(0, tex(8, 8, (c) => noise(c, 8, 8, ROBE_C, 7)));
  const skin = mat(SKIN);
  const dark = mat(BROW);
  const body = cyl(0.4, 0.6, 0.85, 8, robe);
  body.position.y = 0.42;
  g.add(body);
  const collar = cyl(0.34, 0.42, 0.12, 8, mat(COLLAR));
  collar.position.y = 0.86;
  g.add(collar);
  const jabot = box(0.18, 0.28, 0.06, mat(COLLAR));
  jabot.position.set(0, 0.72, 0.4);
  jabot.rotation.x = -0.25;
  g.add(jabot);

  // the head is one group, so it tilts as a whole
  const head = new THREE.Group();
  head.position.set(0, 1.48 - sink, 0);
  head.rotation.z = tilt;
  g.add(head);
  const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.64, 1), skin);
  skull.scale.set(1.05, 0.95, 0.95);
  head.add(skull);
  for (const x of [-0.62, 0.62]) {
    const tuft = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), mat(HAIR));
    tuft.position.set(x, -0.06, -0.08);
    tuft.scale.set(0.9, 1.25, 1.1);
    head.add(tuft);
  }
  const FZ = 0.6;
  const nose = box(0.15, 0.17, 0.14, mat(0xd99a72));
  nose.position.set(0, -0.08, FZ);
  head.add(nose);
  for (const x of [-0.21, 0.21]) {
    const eye = eyes === "closed" ? box(0.13, 0.04, 0.04, dark) : box(0.11, 0.13, 0.04, dark);
    eye.position.set(x, eyes === "closed" ? 0.03 : 0.06, FZ - 0.03);
    head.add(eye);
  }
  const browTilt = { flat: [0, 0], happy: [-0.3, 0.3], angry: [0.5, -0.5], raised: [-0.1, -0.4] }[brows];
  const browLift = { flat: [0, 0], happy: [0.05, 0.05], angry: [-0.03, -0.03], raised: [0, 0.11] }[brows];
  [-0.22, 0.22].forEach((x, i) => {
    const b = box(0.3, 0.09, 0.07, mat(0x4a3c36));
    b.position.set(x, 0.23 + browLift[i], FZ - 0.05);
    b.rotation.z = browTilt[i];
    head.add(b);
  });
  const m = mat(0x7a2f2f);
  if (mouth === "o") {
    const o = box(0.13, 0.13, 0.04, m);
    o.position.set(0, -0.3, FZ - 0.06);
    head.add(o);
  } else {
    const curve = mouth === "smile" ? 0.3 : mouth === "frown" ? -0.3 : 0;
    for (const side of [-1, 1]) {
      const seg = box(0.15, 0.055, 0.04, m);
      seg.position.set(side * 0.07, -0.3, FZ - 0.06);
      seg.rotation.z = side * curve;
      head.add(seg);
    }
  }

  const wood = mat(GAVEL);
  const HOLD = {
    // the gavel continues the arm; its head lies across it (strikes face-down when the arm is level)
    gavel(pivot) {
      const handle = cyl(0.04, 0.04, 0.42, 6, wood);
      handle.position.y = -0.72;
      pivot.add(handle);
      const h = cyl(0.12, 0.12, 0.38, 8, wood);
      h.rotation.x = Math.PI / 2;
      h.position.y = -0.95;
      pivot.add(h);
      for (const z of [-0.13, 0.13]) {
        const band = cyl(0.128, 0.128, 0.04, 8, mat(0xe3b23c));
        band.rotation.x = Math.PI / 2;
        band.position.set(0, -0.95, z);
        pivot.add(band);
      }
    },
    magnifier(pivot) {
      const handle = cyl(0.03, 0.03, 0.22, 6, mat(0x3b302c));
      handle.position.y = -0.66;
      pivot.add(handle);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 4, 10), mat(0xe3b23c));
      ring.position.y = -0.92;
      pivot.add(ring);
      const glass = cyl(0.15, 0.15, 0.01, 10, new THREE.MeshStandardMaterial({ color: 0x9fd3f0, transparent: true, opacity: 0.6, flatShading: true }));
      glass.rotation.x = Math.PI / 2;
      glass.position.y = -0.92;
      pivot.add(glass);
    },
    finger(pivot) {
      const f = box(0.06, 0.18, 0.06, skin);
      f.position.y = -0.64;
      pivot.add(f);
    },
    // rubber stamp: wooden knob and a green-inked base at the end of the arm
    stamp(pivot) {
      const knob = cyl(0.07, 0.05, 0.16, 6, wood);
      knob.position.y = -0.62;
      pivot.add(knob);
      const base = box(0.26, 0.08, 0.2, mat(0x6b3f1e));
      base.position.y = -0.74;
      pivot.add(base);
      const ink = box(0.24, 0.02, 0.18, mat(0x2f9e5a));
      ink.position.y = -0.79;
      pivot.add(ink);
    },
  };
  const pivots = {};
  for (const [name, side, pose] of [["r", 1, r], ["l", -1, l]]) {
    const [rx, rz, hold] = pose;
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.42, 0.78, 0.05);
    const sleeve = cyl(0.11, 0.13, 0.46, 6, robe);
    sleeve.position.y = -0.23;
    pivot.add(sleeve);
    const hand = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), skin);
    hand.position.y = -0.5;
    pivot.add(hand);
    if (hold) HOLD[hold](pivot);
    pivot.rotation.set(rx, 0, side * rz);
    g.add(pivot);
    pivots[name] = pivot;
  }
  // the paper sits in a hand, facing the camera (placed in world space, so it never twists)
  if (paper) {
    g.updateMatrixWorld(true);
    const at = paper.at ? new THREE.Vector3(...paper.at) : pivots[paper.hand].localToWorld(new THREE.Vector3(0, -0.55, 0));
    const sheet = box(0.42, 0.54, 0.02, [mat(0xf2ead6), mat(0xf2ead6), mat(0xf2ead6), mat(0xf2ead6), mat(0, paperTex(paper.stamped)), mat(0xf2ead6)]);
    sheet.position.copy(at).add(paper.at ? new THREE.Vector3() : new THREE.Vector3(paper.hand === "l" ? 0.12 : -0.12, 0.12 + (paper.lift ?? 0), 0.08));
    sheet.rotation.set(-(paper.tilt ?? 0.2), 0, paper.hand === "l" ? 0.12 : -0.12);
    g.add(sheet);
  }
  // shared invisible frame: every judge sprite has the same scale and position
  const frame = box(2.4, 2.2, 0.6, new THREE.MeshBasicMaterial({ visible: false }));
  frame.position.set(0, 1.1, 0);
  g.add(frame);
  g.userData.shadowRadius = 0.6;
  g.userData.shadowCenter = new THREE.Vector3(0, 0, 0);
  g.userData.camDir = new THREE.Vector3(0.22, 0.18, 1);
  return g;
}

const GAVEL_REST = [-0.2, 0.12, "gavel"];
const ARM_REST = [-0.1, 0.15, null];
const PAPER_L = { hand: "l", tilt: 0.25 };
// paper lying in front of the right hand, where the stamp lands
const DESK = { at: [0.4, 0.44, 0.72], tilt: 1.05 };

/** Every judge frame, by action. The app plays them in order (src/lib/judge.ts). */
const JUDGE_FRAMES = {
  // repouso: blink and a small posture shift
  idle1: {},
  idle2: { eyes: "closed" },
  idle3: { tilt: 0.07, sink: 0.02, r: [-0.25, 0.14, "gavel"] },
  // analisando: holds the paper and brings the magnifier close to the face (loops)
  think1: { brows: "raised", l: [-0.9, 0.35, null], paper: PAPER_L, r: [-1.0, 0.3, "magnifier"] },
  think2: { brows: "raised", l: [-1.15, 0.3, null], paper: { hand: "l", tilt: 0.2, lift: 0.1 }, r: [-1.25, 0.28, "magnifier"], tilt: -0.04 },
  think3: { brows: "raised", l: [-1.35, 0.25, null], paper: { hand: "l", tilt: 0.1, lift: 0.25 }, r: [-1.5, 0.3, "magnifier"], tilt: -0.08, mouth: "o" },
  think4: { brows: "flat", l: [-1.45, 0.22, null], paper: { hand: "l", tilt: 0.05, lift: 0.35 }, r: [-1.6, 0.34, "magnifier"], tilt: -0.08, mouth: "o" },
  think5: { brows: "raised", l: [-1.3, 0.26, null], paper: { hand: "l", tilt: 0.12, lift: 0.2 }, r: [-1.4, 0.36, "magnifier"], tilt: 0.02 },
  think6: { brows: "raised", l: [-1.0, 0.34, null], paper: PAPER_L, r: [-1.15, 0.33, "magnifier"], tilt: 0.04 },
  // inconclusivo: tilts the head and lowers the paper
  unsure1: { brows: "raised", l: [-0.9, 0.35, null], paper: PAPER_L, r: GAVEL_REST, tilt: 0.06 },
  unsure2: { brows: "raised", l: [-0.6, 0.3, null], paper: { hand: "l", tilt: 0.4 }, r: GAVEL_REST, tilt: 0.14, mouth: "o" },
  unsure3: { brows: "raised", l: [-0.35, 0.6, null], paper: { hand: "l", tilt: 0.6 }, r: [-0.3, 0.7, null], tilt: 0.2, mouth: "o" },
  unsure4: { brows: "raised", l: [-0.4, 1.2, null], r: [-0.4, 1.2, null], tilt: 0.22, mouth: "o" },
  // verificado: approves and stamps the paper (impact on stamp5)
  stamp1: { l: [-1.2, -0.45, null], paper: DESK, r: [-0.3, 0.2, "stamp"] },
  stamp2: { l: [-1.2, -0.45, null], paper: DESK, r: [-1.5, 0.15, "stamp"], brows: "raised" },
  stamp3: { l: [-1.2, -0.45, null], paper: DESK, r: [-2.2, 0.15, "stamp"], brows: "angry" },
  stamp4: { l: [-1.2, -0.45, null], paper: DESK, r: [-1.75, 0.08, "stamp"], brows: "angry", mouth: "o" },
  stamp5: { l: [-1.2, -0.45, null], paper: { ...DESK, stamped: true }, r: [-1.2, 0.05, "stamp"], sink: 0.03 },
  stamp6: { l: [-1.2, -0.45, null], paper: { ...DESK, stamped: true }, r: [-1.6, 0.1, "stamp"], brows: "happy" },
  stamp7: { l: [-1.3, 0.35, null], paper: { hand: "l", tilt: 0.3, stamped: true }, r: [-0.5, 0.2, "stamp"], brows: "happy", mouth: "smile" },
  stamp8: { l: [-1.5, 0.3, null], paper: { hand: "l", tilt: 0.05, stamped: true, lift: 0.1 }, r: [-0.25, 0.15, "stamp"], brows: "happy", mouth: "smile" },
  // contestação aberta: straightens the paper and presents the evidence (ends pointing)
  present1: { l: [-0.9, 0.35, null], paper: PAPER_L, r: [-0.9, 0.05, null], brows: "flat" },
  present2: { l: [-1.1, 0.35, null], paper: { hand: "l", tilt: 0.1 }, r: [-1.1, 0.05, null], sink: 0.02 },
  present3: { l: [-0.8, 0.35, null], paper: { hand: "l", tilt: 0.35 }, r: [-0.8, 0.05, null] },
  present4: { l: [-1.4, 0.45, null], paper: { hand: "l", tilt: 0 }, r: [-0.6, 0.4, null], brows: "angry" },
  present5: { l: [-1.5, 0.5, null], paper: { hand: "l", tilt: 0 }, r: [-0.6, 1.0, "finger"], brows: "angry", mouth: "frown" },
  present6: { l: [-1.5, 0.5, null], paper: { hand: "l", tilt: 0 }, r: [-0.5, 1.45, "finger"], brows: "angry", mouth: "frown" },
  // decisão do júri: raises and strikes the gavel (impact on gavel6)
  gavel1: { r: GAVEL_REST, l: ARM_REST },
  gavel2: { r: [-1.2, 0.3, "gavel"], l: ARM_REST, brows: "flat" },
  gavel3: { r: [-2.1, 0.5, "gavel"], l: ARM_REST, brows: "angry" },
  gavel4: { r: [-2.6, 0.6, "gavel"], l: ARM_REST, brows: "angry", mouth: "o" },
  gavel5: { r: [-1.9, 0.4, "gavel"], l: ARM_REST, brows: "angry" },
  gavel6: { r: [-1.15, 0.25, "gavel"], l: ARM_REST, brows: "flat", sink: 0.03 },
  gavel7: { r: [-1.4, 0.3, "gavel"], l: ARM_REST, brows: "flat" },
  gavel8: { r: [-1.15, 0.25, "gavel"], l: ARM_REST, brows: "flat" },
};
const JUDGE = Object.fromEntries(Object.entries(JUDGE_FRAMES).map(([k, p]) => [`judge-${k}`, () => judgeScene(p)]));

/** The judge's bench seen from the front (the judge sprite stands behind it in the courtroom). */
function benchFront() {
  const g = judgeBench();
  // drop the little gavel on top: the judge holds his own
  g.children.slice(-2).forEach((m) => g.remove(m));
  const frame = box(2.9, 2.9, 0.8, new THREE.MeshBasicMaterial({ visible: false }));
  frame.position.set(0, 1.45, 0);
  g.add(frame);
  g.userData.shadowRadius = 0.01;
  g.userData.camDir = new THREE.Vector3(0, 0.12, 1);
  return g;
}

/** Provas: a wine evidence folder with two cream sheets peeking out and a raised tab (no text). */
function evidenceFolder() {
  const g = new THREE.Group();
  const wine = mat(0, tex(8, 8, (c) => noise(c, 8, 8, ["#7a2e3a", "#712a35", "#83333f"], 5)));
  const wineDark = mat(0x4f1c25);
  const paper = mat(0, tex(8, 8, (c) => {
    c.fillStyle = "#f5f1e6"; c.fillRect(0, 0, 8, 8);
    c.fillStyle = "#b9b2a0"; c.fillRect(1, 2, 5, 1); c.fillRect(1, 4, 6, 1); c.fillRect(1, 6, 3, 1);
  }));
  const paperEdge = mat(0xe6dfcd);
  const back = box(1.5, 0.05, 1.05, [wineDark, wineDark, wine, wineDark, wineDark, wineDark]);
  g.add(back);
  // the tab rises from the back cover's far edge
  const tab = box(0.5, 0.05, 0.22, wine);
  tab.position.set(-0.35, 0.0, -0.62);
  g.add(tab);
  // two sheets, offset so their corners show past the front cover
  for (const [x, z, r, y] of [[0.1, -0.12, 0.1, 0.05], [-0.06, -0.16, -0.07, 0.08]]) {
    const sheet = box(1.3, 0.025, 0.95, [paperEdge, paperEdge, paper, paperEdge, paperEdge, paperEdge]);
    sheet.position.set(x, y, z);
    sheet.rotation.y = r;
    g.add(sheet);
  }
  // front cover a little shorter, so the papers peek out at the top
  const front = box(1.5, 0.05, 0.72, [wineDark, wineDark, wine, wineDark, wineDark, wineDark]);
  front.position.set(0, 0.12, 0.17);
  g.add(front);
  // brown spine along the left edge
  const spine = box(0.08, 0.17, 1.05, mat(0x5e4527));
  spine.position.set(-0.76, 0.06, 0);
  g.add(spine);
  g.rotation.set(0.45, 0.3, 0);
  return g;
}

/** App icon: the group's judge, one brow raised (suspicious of your proof), gavel at rest. Framed by icons.mjs. */
const logoJudge = () => judgeScene({ brows: "raised", mouth: "flat", r: [-0.9, 0.3, "gavel"] });

export const MODELS = { notebook, keyboard, keyboardPress1, keyboardPress2, openBook, notebookPending, notebookDone, bookPending, bookDone, computer, beachChair, sodaCan, coxinha, coffeeCup, chocolateBar, acaiBowl, pizzaSlice, iceCream, pixCoin, gavel, gavelMid, gavelUp, judgeBench, trophy, trophySilver, trophyBronze, scales, memoryCard, calendar, chest1, chest2, chest3, chest4, chest5, chest6, plant, mug, duck, cat, lamp, globe, goldBook, crown, forgottenCoffee, survivorPencil, patchedHeadphones, crookedHourglass, suspiciousLoupe, witnessPigeon, judgeSlippers, rubberGavel, goldenJudgeBust, magistrateDuck, benchFront, evidenceFolder, archiveBox, documentTray, pencilCup, ...CROWD, ...BALLOT, ...JUDGE, logoJudge };

// ---- render --------------------------------------------------------------------
export function render(name, size) {
  const renderer = new THREE.WebGLRenderer({ antialias: name.startsWith("logo"), alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x3a3f46, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(3, 5, 2);
  scene.add(sun);

  // Logos are seen large and face the viewer: smooth edges and a soft front light keep the colours true.
  if (name.startsWith("logo")) {
    const fill = new THREE.DirectionalLight(0xfff6e8, 1.3);
    fill.position.set(0.6, 0.8, 3);
    scene.add(fill);
  }
  const obj = MODELS[name]();
  scene.add(obj);
  const bbox = new THREE.Box3().setFromObject(obj);
  const center = bbox.getCenter(new THREE.Vector3());
  const radius = bbox.getBoundingSphere(new THREE.Sphere()).radius;
  // blob shadow under the object
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(obj.userData.shadowRadius ?? radius * 0.62, 10),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  const sc = obj.userData.shadowCenter ?? center;
  shadow.position.set(sc.x, bbox.min.y - 0.01, sc.z);
  scene.add(shadow);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  const dir = (obj.userData.camDir ?? new THREE.Vector3(1, 0.85, 1.25)).clone().normalize();
  // Fit tightly: project the bounding box (incl. shadow) and pull the camera in until it fills ~88% of the frame.
  const corners = [];
  scene.updateMatrixWorld(true);
  for (const o of [obj, shadow]) {
    o.traverse((m) => {
      if (!m.isMesh) return;
      const pos = m.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) corners.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
    });
  }
  const fitCenter = new THREE.Box3().setFromPoints(corners).getCenter(new THREE.Vector3());
  let dist = radius / Math.sin(THREE.MathUtils.degToRad(14));
  for (let i = 0; i < 6; i++) {
    camera.position.copy(fitCenter).addScaledVector(dir, dist);
    camera.lookAt(fitCenter);
    camera.updateMatrixWorld();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const c of corners) {
      const p = c.clone().project(camera);
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    // recentre on the projected silhouette, then scale to fill ~88% of the frame
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const halfH = Math.tan(THREE.MathUtils.degToRad(14)) * dist;
    fitCenter.addScaledVector(right, ((minX + maxX) / 2) * halfH).addScaledVector(up, ((minY + maxY) / 2) * halfH);
    const m = Math.max(maxX - minX, maxY - minY) / 2;
    dist *= m / 0.88;
  }
  camera.position.copy(fitCenter).addScaledVector(dir, dist);
  camera.lookAt(fitCenter);
  camera.updateMatrixWorld();
  // Sit every prop on the bottom of the frame, so they all "stand" on the same shelf.
  let minY = Infinity;
  for (const c of corners) minY = Math.min(minY, c.clone().project(camera).y);
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const halfH = Math.tan(THREE.MathUtils.degToRad(14)) * dist;
  const shift = up.multiplyScalar((minY + 0.94) * halfH);
  camera.position.add(shift);
  fitCenter.add(shift);
  camera.lookAt(fitCenter);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");
  renderer.dispose();
  return url;
}
