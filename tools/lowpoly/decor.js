// Decorative props from the Astra brief of 29/10/2026 (archive box, document tray, pencil cup); kept apart from models.js so helper names cannot collide.
import * as THREE from "./node_modules/three/build/three.module.js";
const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:1,flatShading:true});
function part(g,w,h,d,c,x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c));m.position.set(x,y,z);g.add(m);return m;}
export function archiveBox(){
 const g=new THREE.Group();
 part(g,1.55,.14,1.12,0x363a41,0,.07);
 part(g,1.55,.8,.1,0x444951,0,.45,-.51);
 for(const x of [-.72,.72])part(g,.1,.64,1.12,0x444951,x,.38);
 for(let i=0;i<3;i++){part(g,1.28,.66,.12,i===1?0x7a2e3a:0xbdb7a8,0,.48,-.26+i*.26);part(g,.4,.14,.12,0x7a2e3a,-.35+i*.32,.87,-.26+i*.26);}
 part(g,1.55,.48,.1,0x363a41,0,.3,.51);
 part(g,.62,.18,.025,0xf5f1e6,0,.34,.575);
 part(g,.34,.045,.035,0x26292e,0,.34,.594);
 return g;
}
export function documentTray(){
 const g=new THREE.Group();
 part(g,1.8,.12,1.25,0x68472f,0,.06);
 for(const x of [-.85,.85])part(g,.1,.24,1.25,0x8d6744,x,.18);
 part(g,1.8,.24,.1,0x8d6744,0,.18,-.575);
 part(g,1.8,.10,.10,0x8d6744,0,.11,.575);
 // Empty tray intentionally: no fabricated pending or approved documents.
 part(g,.46,.04,.15,0xb7a68b,0,.13,.54);
 return g;
}
export function pencilCup(){
 const g=new THREE.Group();
 const cup=new THREE.Mesh(new THREE.CylinderGeometry(.34,.29,.72,6,1,true),mat(0x7a2e3a));cup.position.y=.36;g.add(cup);
 const inside=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.04,6),mat(0x3c222a));inside.position.y=.67;g.add(inside);
 for(let i=0;i<3;i++){
  const pencil=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.9,6),mat([0xffcd38,0xbdb7a8,0x444951][i]));pencil.add(body);
  const tip=new THREE.Mesh(new THREE.ConeGeometry(.055,.15,6),mat(0xdcb78a));tip.position.y=.525;pencil.add(tip);
  const lead=new THREE.Mesh(new THREE.ConeGeometry(.022,.06,6),mat(0x26292e));lead.position.y=.615;pencil.add(lead);
  pencil.position.set((i-1)*.15,.86,(i%2)*.13);pencil.rotation.z=(i-1)*.13;g.add(pencil);
 }
 return g;
}
