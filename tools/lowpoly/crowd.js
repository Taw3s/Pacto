// Courtroom crowd (Astra brief of 04/11/2026, "salão cheio"): one generic person seen from behind, from the waist up, in
// six variants that the page repeats over three rows. Scenery, never the group's members: no faces, no gestures, no
// yellow (the judge and the actions keep it). The benches in front of each row are drawn by the page, so the sprite
// stops at the waist. An invisible frame keeps every variant on the same scale and baseline.
import * as THREE from "./node_modules/three/build/three.module.js";

const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, metalness: 0, flatShading: true });
const boxG = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// Clothes stay in the app's greys with one wine and two muted tones; heads in muted/paper; hair in dark browns.
const SURFACE = 0x363a41, RAISED = 0x4a4f58, FOLDER = 0x7a2e3a, SLATE = 0x3f4c57, CLAY = 0x5c4d42, MOSS = 0x47503f;
const MUTED = 0xbdb7a8, PAPER = 0xd9d3c4, TAN = 0xa88b6e;
const HAIR = { dark: 0x2a2522, brown: 0x4a3b30, grey: 0x8a8580, black: 0x1f1d1c };

// Silhouettes differ in width, height, head shape and a little turn of the head; no two neighbours should match.
const VARIANTS = [
  { cloth: SURFACE, hair: HAIR.dark, skin: MUTED, wide: 1.0, tall: 1.0, turn: 0.1, bun: false },
  { cloth: FOLDER, hair: HAIR.brown, skin: PAPER, wide: 0.9, tall: 1.08, turn: -0.15, bun: true },
  { cloth: SLATE, hair: HAIR.grey, skin: PAPER, wide: 1.12, tall: 0.94, turn: 0, bun: false },
  { cloth: CLAY, hair: HAIR.black, skin: TAN, wide: 0.96, tall: 1.04, turn: 0.2, bun: false },
  { cloth: RAISED, hair: HAIR.brown, skin: MUTED, wide: 1.06, tall: 0.98, turn: -0.08, bun: true },
  { cloth: MOSS, hair: HAIR.dark, skin: TAN, wide: 0.92, tall: 1.02, turn: 0.05, bun: false },
];

/**
 * One seated person from behind, waist up (faces -z, towards the judge). `pose` shifts the body for the settling movement:
 * `lean` tilts the torso sideways, `rise` lifts it a little off the seat, `look` turns the head further. Rest is all zero.
 */
function person({ cloth, hair, skin, wide, tall, turn, bun }, { lean = 0, rise = 0, look = 0 } = {}) {
  const root = new THREE.Group();
  const g = new THREE.Group(); // the body: it leans and rises; the frame below stays put, so every pose shares the camera
  g.position.y = rise;
  g.rotation.z = lean;
  root.add(g);
  const add = (geo, c, x, y, z, parent = g) => {
    const m = new THREE.Mesh(geo, mat(c));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  // torso: a tapered six-sided block, shoulders wider than the waist
  const torso = add(new THREE.CylinderGeometry(0.3 * wide, 0.25 * wide, 0.5 * tall, 6), cloth, 0, 0.25 * tall, 0);
  torso.rotation.y = Math.PI / 6;
  add(boxG(0.66 * wide, 0.12, 0.3), cloth, 0, 0.47 * tall, 0);
  // arms hanging at the sides, a shade darker so the outline reads at 48 px
  for (const s of [-1, 1]) {
    const arm = add(boxG(0.12, 0.42 * tall, 0.18), cloth, 0.33 * wide * s, 0.27 * tall, 0.02);
    arm.material.color.multiplyScalar(0.82);
  }
  // neck and head: faceted, hair covering the back, ears on the sides
  add(boxG(0.12, 0.08, 0.12), skin, 0, 0.56 * tall, 0);
  const head = new THREE.Group();
  head.position.set(0, 0.74 * tall, 0);
  head.rotation.y = turn + look;
  g.add(head);
  add(new THREE.IcosahedronGeometry(0.2, 0), skin, 0, 0, 0, head);
  const back = add(new THREE.IcosahedronGeometry(0.207, 0), hair, 0, 0.035, 0.035, head);
  back.scale.set(1, 0.96, 0.9);
  for (const s of [-1, 1]) add(boxG(0.05, 0.08, 0.06), skin, 0.19 * s, -0.02, -0.02, head);
  if (bun) add(new THREE.IcosahedronGeometry(0.08, 0), hair, 0, 0.12, 0.17, head);

  // invisible frame: same box for every variant, so the scale and the baseline match across the crowd
  const frame = new THREE.Mesh(boxG(0.82, 1.06, 0.5), new THREE.MeshBasicMaterial({ visible: false }));
  frame.position.set(0, 0.53, 0);
  root.add(frame);
  root.userData.shadowRadius = 0.001; // the bench in front hides the waist: no blob shadow
  root.userData.shadowCenter = new THREE.Vector3(0, 0, 0);
  // Seen from the room, behind and a little above, like the rest of the scene.
  root.userData.camDir = new THREE.Vector3(0, 0.45, 1.25);
  return root;
}

// Settling movement (Astra brief of 04/11): `a` = shifting in the seat (leaning, a little up, looking aside), `b` = almost
// settled (a small counter-lean). Rest is the plain sprite. Odd variants lean the other way, so neighbours never mirror.
const POSES = {
  a: (i) => ({ lean: (i % 2 ? -1 : 1) * 0.12, rise: 0.05, look: (i % 2 ? 1 : -1) * 0.35 }),
  b: (i) => ({ lean: (i % 2 ? 1 : -1) * 0.05, rise: 0.015, look: (i % 2 ? 1 : -1) * 0.12 }),
};

export const CROWD = Object.fromEntries(
  VARIANTS.flatMap((v, i) => [
    [`crowd${i + 1}`, () => person(v)],
    ...Object.entries(POSES).map(([k, pose]) => [`crowd${i + 1}${k}`, () => person(v, pose(i))]),
  ]),
);
