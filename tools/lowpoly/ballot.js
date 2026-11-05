// Ballot box for the tribunal (Astra brief of 04/11/2026, "tribunal vivo", PR 2): after the server confirms the viewer's
// vote, a blank ballot drops into the box in 4 frames (`ballot1`…`ballot3`, then the plain `ballotBox`). The ballot never
// shows the option chosen: plain paper, no colour, no mark. Kept apart from models.js like decor.js and crowd.js.
import * as THREE from "./node_modules/three/build/three.module.js";

const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, metalness: 0, flatShading: true });
function part(g, w, h, d, c, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

// Wood like the courtroom bench, a wine band like the folders, paper like the receipts.
const WOOD = 0x8a6a45, WOOD_DARK = 0x5e4527, WOOD_TOP = 0x9c7a51, FOLDER = 0x7a2e3a, SLOT = 0x26292e, PAPER = 0xe9e0c6, PAPER_EDGE = 0xcfc5ab;

/** `drop` = how far the ballot has gone into the slot: null (no ballot, at rest), 0 (above it) … 1 (almost in). */
function ballotBox(drop) {
  const g = new THREE.Group();
  // the box: body, a wine band, a lighter lid with a dark slot across it
  part(g, 1.1, 0.78, 0.8, WOOD, 0, 0.39);
  part(g, 1.12, 0.12, 0.82, FOLDER, 0, 0.5);
  part(g, 1.16, 0.08, 0.86, WOOD_TOP, 0, 0.82);
  part(g, 0.56, 0.03, 0.08, SLOT, 0, 0.865);
  for (const x of [-0.5, 0.5]) part(g, 0.08, 0.06, 0.76, WOOD_DARK, x, 0.03);
  if (drop !== null) {
    // the ballot stands upright over the slot and sinks into it; the box's lid hides the part already inside
    const h = 0.62;
    const y = 0.87 + h / 2 + 0.22 - drop * (h * 0.85 + 0.22);
    part(g, 0.46, h, 0.025, PAPER, 0, y, 0);
    part(g, 0.46, 0.03, 0.03, PAPER_EDGE, 0, y + h / 2, 0); // a folded top edge, so it reads as paper at 48 px
  }
  // invisible frame: the ballot's highest position, so every frame shares the camera
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.85, 0.9), new THREE.MeshBasicMaterial({ visible: false }));
  frame.position.set(0, 0.925, 0);
  g.add(frame);
  g.userData.shadowRadius = 0.7;
  g.userData.shadowCenter = new THREE.Vector3(0, 0, 0);
  g.userData.camDir = new THREE.Vector3(0.55, 0.6, 1.25);
  return g;
}

export const BALLOT = {
  ballot1: () => ballotBox(0),
  ballot2: () => ballotBox(0.45),
  ballot3: () => ballotBox(0.85),
  ballotBox: () => ballotBox(null),
};
