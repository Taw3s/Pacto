// Collectibles from the Astra cosmetics brief of 30/10/2026 (shelf objects, no gameplay effect); kept apart from models.js so helper names cannot collide.
import * as THREE from "./node_modules/three/build/three.module.js";
const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:1,metalness:0,flatShading:true});
function add(g,geo,c,x=0,y=0,z=0){const m=new THREE.Mesh(geo,c.isMaterial?c:mat(c));m.position.set(x,y,z);g.add(m);return m;}
// Gold with light and dark specks, so it never reads as one flat yellow block.
function goldMat(seed){
 const c=document.createElement("canvas");c.width=c.height=8;const x=c.getContext("2d");let s=seed;
 const tones=["#ffcd38","#e0ac1c","#ffe07a","#c89d35","#b8862a"];
 for(let i=0;i<64;i++){s=(s*9301+49297)%233280;x.fillStyle=tones[Math.floor(s/233280*tones.length)];x.fillRect(i%8,i>>3,1,1);}
 const t=new THREE.CanvasTexture(c);t.magFilter=t.minFilter=THREE.NearestFilter;t.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshStandardMaterial({map:t,roughness:1,metalness:0,flatShading:true});
}

/** Comum: a short, much-used yellow pencil: big wooden tip, eraser half gone. */
export function survivorPencil(){
 const g=new THREE.Group(),p=new THREE.Group();
 // Built along +X, then laid on the floor at a diagonal. Long enough to read as a pencil, not a crayon (Astra, 30/10).
 add(p,new THREE.CylinderGeometry(.19,.19,.58,6),0xffcd38,0).rotation.z=Math.PI/2;
 add(p,new THREE.CylinderGeometry(.2,.2,.12,6),0x9aa3ad,-.35).rotation.z=Math.PI/2;
 // Worn eraser: short and tapered, wider at the ferrule.
 add(p,new THREE.CylinderGeometry(.13,.19,.1,6),0xb66b74,-.46).rotation.z=Math.PI/2;
 add(p,new THREE.CylinderGeometry(0,.19,.42,6),0xc9935e,.5).rotation.z=-Math.PI/2;
 add(p,new THREE.CylinderGeometry(0,.07,.15,6),0x26292e,.64).rotation.z=-Math.PI/2;
 // Roll first, then yaw: the pencil lies flat on a face instead of pointing up.
 p.rotation.order="YXZ";p.position.y=.17;p.rotation.x=Math.PI/6;p.rotation.y=.95;
 g.add(p);
 return g;
}

/** Raro: a big magnifying glass, open rim and readable lens; decorative, not the judge's review tool. */
export function suspiciousLoupe(){
 const g=new THREE.Group(),l=new THREE.Group();
 // Built facing +Z: lens up-left, handle down-right at 45°.
 add(l,new THREE.CylinderGeometry(.44,.44,.05,12),0xa3caff,0,0,0).rotation.x=Math.PI/2;
 add(l,new THREE.BoxGeometry(.09,.3,.02),0xe6f0ff,-.17,.08,.035).rotation.z=-.6;
 add(l,new THREE.TorusGeometry(.47,.07,4,12),0xc89d35);
 const h=new THREE.Group();
 add(h,new THREE.CylinderGeometry(.09,.09,.16,6),0xc89d35,0,-.6);
 add(h,new THREE.CylinderGeometry(.1,.085,.62,6),0x7a2e3a,0,-.99);
 add(h,new THREE.CylinderGeometry(.06,.1,.08,6),0x7a2e3a,0,-1.33);
 h.rotation.z=Math.PI/4;l.add(h);
 l.rotation.y=.68;l.rotation.x=-.18;
 g.add(l);
 g.userData.shadowRadius=.42;g.userData.shadowCenter=new THREE.Vector3(.1,0,-.1);
 return g;
}

/** Raro: a puffed-up pigeon holding a folded blank paper. A collectible only: no speech, vote or proof. */
export function witnessPigeon(){
 const g=new THREE.Group();
 const body=add(g,new THREE.IcosahedronGeometry(.42,1),0x8d95a0,0,.48);body.scale.set(1.25,.95,.9);
 // Puffed chest, pushed forward.
 add(g,new THREE.IcosahedronGeometry(.3,0),0x9aa2ad,.3,.55).scale.set(.9,1.1,1.1);
 for(const z of [-.33,.33]){const w=add(g,new THREE.IcosahedronGeometry(.3,0),0x59616d,-.1,.52,z);w.scale.set(1.5,.75,.35);w.rotation.z=-.25;}
 const tail=add(g,new THREE.BoxGeometry(.4,.07,.3),0x59616d,-.62,.5);tail.rotation.z=.35;
 add(g,new THREE.IcosahedronGeometry(.19,0),0x536b66,.32,.85).scale.set(1,.9,1.15);
 add(g,new THREE.IcosahedronGeometry(.2,1),0x8d95a0,.42,1.05);
 add(g,new THREE.ConeGeometry(.06,.18,4),0xc9935e,.66,1.02).rotation.z=-Math.PI/2;
 for(const z of [-.12,.12]){add(g,new THREE.BoxGeometry(.06,.06,.05),0xd98c3a,.53,1.1,z*1.1);add(g,new THREE.BoxGeometry(.03,.04,.06),0x1a1c20,.555,1.1,z*1.1);}
 // Folded blank paper in the beak (no writing on it).
 const pa=add(g,new THREE.BoxGeometry(.3,.02,.24),0xf5f1e6,.83,.96);pa.rotation.z=-.5;
 const pb=add(g,new THREE.BoxGeometry(.3,.02,.24),0xe4dcc8,.83,.93);pb.rotation.z=-.2;
 for(const z of [-.12,.12]){add(g,new THREE.BoxGeometry(.05,.22,.05),0xb66b74,.05,.11,z);add(g,new THREE.BoxGeometry(.16,.03,.1),0xb66b74,.1,.015,z);}
 return g;
}

/** Lendário: the judge's slippers, cream with wine lining, a dark brow on each toe (one raised). */
export function judgeSlippers(){
 const g=new THREE.Group();
 const slipper=(raised)=>{
  const s=new THREE.Group();
  add(s,new THREE.BoxGeometry(.95,.08,.44),0x8a6a45,0,.04);
  // Low walls and a raised lining, so the wine opening shows from the shelf camera.
  add(s,new THREE.BoxGeometry(.48,.04,.34),0x7a2e3a,-.2,.12);
  add(s,new THREE.BoxGeometry(.07,.1,.42),0xf5f1e6,-.44,.13);
  for(const z of [-.19,.19])add(s,new THREE.BoxGeometry(.48,.08,.06),0xf5f1e6,-.2,.12,z);
  const toe=add(s,new THREE.SphereGeometry(.3,6,4,0,Math.PI*2,0,Math.PI/2),0xf5f1e6,.2,.08);toe.scale.set(1.15,1.1,.78);
  // Brow near the tip of the toe, with cream between it and the opening (~6 px wide, ~2 px thick at 48 px).
  const brow=add(s,new THREE.BoxGeometry(.07,.06,.24),0x443127,.32,.38);
  brow.rotation.z=-.55;if(raised){brow.rotation.x=.3;brow.position.y=.4;}
  return s;
 };
 // Seen from the side (opening behind, toe in front), each turned on its own; a ~2 px gap, the back one a little ahead so its brow shows.
 const a=slipper(false);a.position.set(-.12,0,-.3);a.rotation.y=.12;g.add(a);
 const b=slipper(true);b.position.set(.18,0,.2);b.rotation.y=-.12;g.add(b);
 return g;
}

/** Comum: a low wine cup of coffee gone cold, a biscuit leaning on the rim. No steam. */
export function forgottenCoffee(){
 const g=new THREE.Group();
 // Low and wide, so it never reads as the existing mug.
 add(g,new THREE.CylinderGeometry(.44,.3,.36,10),0x7a2e3a,0,.18);
 add(g,new THREE.CylinderGeometry(.4,.4,.02,10),0x3b2418,0,.365);
 add(g,new THREE.TorusGeometry(.43,.045,4,10),0xf5f1e6,0,.37).rotation.x=Math.PI/2;
 const h=add(g,new THREE.TorusGeometry(.13,.045,4,8),0x7a2e3a,.47,.2);h.scale.set(1,1.15,1);
 const b=new THREE.Group();
 // Half dipped in the coffee, leaning on the rim at the left of the view and facing the camera, so it reads as a flat biscuit, not a lid knob.
 add(b,new THREE.CylinderGeometry(.18,.18,.07,8),0xd6ad68).rotation.x=Math.PI/2;
 b.rotation.order="YXZ";b.position.set(-.3,.44,.2);b.rotation.y=.68;b.rotation.x=-.35;
 g.add(b);
 return g;
}

/** Comum: wide headphones, one side held together with yellow tape. Headphones only, no listening device. */
export function patchedHeadphones(){
 const g=new THREE.Group(),h=new THREE.Group();
 // Built facing +Z: a clear upside-down U.
 add(h,new THREE.TorusGeometry(.5,.07,4,10,Math.PI),0x444951,0,.32);
 // Lighter cups and a narrow lit strip on the band keep the shape off the dark background at 48 px (Astra, 30/10).
 add(h,new THREE.TorusGeometry(.53,.03,3,10,Math.PI),0x7a808a,0,.32,.04);
 for(const x of [-.5,.5]){
  add(h,new THREE.BoxGeometry(.1,.16,.1),0x59616d,x,.26);
  add(h,new THREE.CylinderGeometry(.22,.22,.16,8),0x59616d,x,.2).rotation.z=Math.PI/2;
  add(h,new THREE.CylinderGeometry(.18,.18,.06,8),0x1a1c20,x*.79,.2).rotation.z=Math.PI/2;
 }
 // Tape on one side only: two crossed strips around the band.
 for(const r of [.5,-.5]){const t=add(h,new THREE.BoxGeometry(.26,.07,.2),0xffcd38,.43,.6);t.rotation.z=-.9+r*.35;}
 h.rotation.y=.68;
 g.add(h);
 return g;
}

/** Raro: an hourglass leaning a little, steady on its base. No counter or deadline: time is only a joke here. */
export function crookedHourglass(){
 const g=new THREE.Group(),a=new THREE.Group();
 const glass=new THREE.MeshStandardMaterial({color:0xa3caff,roughness:1,metalness:0,flatShading:true,transparent:true,opacity:.55,depthWrite:false});
 for(const y of [.05,1.05])add(a,new THREE.CylinderGeometry(.36,.36,.1,6),0x8a6a45,0,y);
 for(let i=0;i<3;i++){const t=i/3*Math.PI*2+.5;add(a,new THREE.CylinderGeometry(.03,.03,.9,5),0x5e4527,Math.cos(t)*.28,.55,Math.sin(t)*.28);}
 // Sand first, glass after (transparent), so the sand shows through.
 add(a,new THREE.CylinderGeometry(.08,.24,.16,6),0xffcd38,0,.18);
 add(a,new THREE.CylinderGeometry(.06,.18,.08,6),0xffcd38,0,.74);
 add(a,new THREE.CylinderGeometry(.015,.015,.3,4),0xffcd38,0,.4);
 for(const [y,rt,rb] of [[.3,.05,.25],[.8,.25,.05]]){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,.4,6),glass);m.position.y=y;a.add(m);}
 a.rotation.z=-.22;a.rotation.y=.3;
 g.add(a);
 return g;
}

/** Lendário: a toy rubber gavel lying on its side. Exaggerated and soft, never the court's gavel; no sounding block. */
export function rubberGavel(){
 const g=new THREE.Group(),m=new THREE.Group();
 add(m,new THREE.CylinderGeometry(.3,.3,.66,8),0xffcd38,0,.3).rotation.z=Math.PI/2;
 for(const x of [-.38,.38])add(m,new THREE.CylinderGeometry(.33,.33,.12,8),0xf5f1e6,x,.3).rotation.z=Math.PI/2;
 // Short handle angled down to the floor from the middle of the head.
 const hd=new THREE.Group();
 add(hd,new THREE.CylinderGeometry(.075,.075,.62,6),0x8a6a45,0,0,.31).rotation.x=Math.PI/2;
 add(hd,new THREE.CylinderGeometry(.1,.1,.08,6),0x8a6a45,0,0,.62).rotation.x=Math.PI/2;
 hd.position.y=.3;hd.rotation.x=.42;m.add(hd);
 m.rotation.y=-.35;
 g.add(m);
 return g;
}

/** Lendário: a gilded bust of the judge on a low wooden plinth, one brow up. Vanity, not a trophy: no cup, plate or podium. */
export function goldenJudgeBust(){
 const g=new THREE.Group(),b=new THREE.Group();
 // Speckled gold on the shoulders; a plain faceted gold head, so the face is not lost in the noise.
 const gold=goldMat(5),face=0xe8b52a,deep=0x5e4527;
 add(g,new THREE.BoxGeometry(1.3,.16,1),0x8a6a45,0,.08);
 add(g,new THREE.BoxGeometry(1.36,.05,1.06),0x5e4527,0,.185);
 // Wide shoulders and collar, then the same head proportions as the app icon.
 add(b,new THREE.CylinderGeometry(.42,.62,.42,8),gold,0,.21);
 add(b,new THREE.CylinderGeometry(.34,.42,.1,8),gold,0,.46);
 add(b,new THREE.BoxGeometry(.18,.2,.06),gold,0,.34,.45);
 const head=new THREE.Group();head.position.y=1.06;b.add(head);
 add(head,new THREE.IcosahedronGeometry(.64,1),face).scale.set(1.05,.95,.95);
 for(const x of [-.62,.62])add(head,new THREE.IcosahedronGeometry(.24,0),gold,x,-.06,-.08).scale.set(.9,1.25,1.1);
 add(head,new THREE.BoxGeometry(.15,.17,.14),face,0,-.08,.64);
 for(const x of [-.21,.21])add(head,new THREE.BoxGeometry(.11,.13,.06),deep,x,.06,.6);
 // Asymmetric brows: the right one raised, as on the icon.
 [[-.22,-.1,0],[.22,-.4,.11]].forEach(([x,t,l])=>{const w=add(head,new THREE.BoxGeometry(.3,.09,.08),deep,x,.23+l,.58);w.rotation.z=t;});
 for(const side of [-1,1])add(head,new THREE.BoxGeometry(.15,.055,.06),deep,side*.07,-.3,.57);
 b.position.y=.21;b.rotation.y=.55;g.add(b);
 return g;
}

/** Lendário: the shelf's rubber duck promoted to the bench: wine robe, big cream collar, two cloth tabs at the hem. Nothing else. */
export function magistrateDuck(){
 const g=new THREE.Group();
 const yellow=0xffd23f;
 // Same head, beak and eyes as the common duck, so it is recognisably the same character.
 // Body slimmer than the common duck's: it sits inside the robe and must not poke through.
 const body=add(g,new THREE.IcosahedronGeometry(.42,1),yellow,0,.34);body.scale.set(.92,.8,.85);
 add(g,new THREE.IcosahedronGeometry(.26,1),yellow,.22,.82);
 add(g,new THREE.BoxGeometry(.2,.08,.16),0xf08a24,.5,.78);
 for(const z of [-.12,.12])add(g,new THREE.BoxGeometry(.05,.06,.05),0x1a1c20,.38,.9,z);
 add(g,new THREE.CylinderGeometry(.36,.5,.56,8),0x7a2e3a,.02,.3);
 add(g,new THREE.CylinderGeometry(.33,.4,.11,8),0xf5f1e6,.06,.6);
 // Hem tabs on the side facing the camera, a shade darker so they separate from the robe.
 for(const z of [-.1,.1]){const t=add(g,new THREE.BoxGeometry(.05,.22,.13),0x5f2430,.5,.12,z+.18);t.rotation.z=.2;t.rotation.y=-.68;}
 return g;
}
