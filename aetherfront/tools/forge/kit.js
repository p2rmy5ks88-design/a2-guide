// AETHERFRONT model forge kit — builds rigid-rig, animated, vertex-coloured PBR models
// that are exported to GLB (see forge.html). Node/clip naming contract (artists keep it
// when replacing a model): root "rig"; optional "turret" (engine-yawed), "muzzle" (empty
// socket), "flash" (glow popped by the fire clip). Clips: idle, move, fire, hit, die.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const MATS = {
  body: new THREE.MeshStandardMaterial({ name: 'AF_Body', vertexColors: true, metalness: 0.3, roughness: 0.4 }),
  metal: new THREE.MeshStandardMaterial({ name: 'AF_Metal', vertexColors: true, metalness: 0.9, roughness: 0.26 }),
  glow: new THREE.MeshBasicMaterial({ name: 'AF_Glow', vertexColors: true, toneMapped: false }),
  skin: new THREE.MeshStandardMaterial({ name: 'AF_Skin', vertexColors: true, metalness: 0.0, roughness: 0.62, side: THREE.DoubleSide }),
};

const D = THREE.MathUtils.degToRad;
const tmpColor = new THREE.Color();

function prep(geo) {
  let g = geo;
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  if (!g.index) g = mergeVertices(g, 1e-4);
  return g;
}

export const G = {
  box: (w, h, d, r = 0.02) => (r > 0 ? new RoundedBoxGeometry(w, h, d, Math.max(w, h, d) > 0.2 ? 2 : 1, Math.min(r, w / 2.2, h / 2.2, d / 2.2)) : new THREE.BoxGeometry(w, h, d)),
  cyl: (rt, rb, h, s = 14) => new THREE.CylinderGeometry(rt, rb, h, s),
  hex: (r, h) => new THREE.CylinderGeometry(r, r, h, 6),
  sph: (r, ws = 14, hs = 10) => new THREE.SphereGeometry(r, ws, hs),
  sphPart: (r, ps, pl, ts, tl, ws = 28, hs = 16) => new THREE.SphereGeometry(r, ws, hs, ps, pl, ts, tl),
  hemi: (r, ws = 14, hs = 7) => new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, 0, Math.PI / 2),
  cap: (r, len, s = 10) => new THREE.CapsuleGeometry(r, len, 3, s),
  cone: (r, h, s = 12) => new THREE.ConeGeometry(r, h, s),
  torus: (R, t, rs = 8, ts = 24, arc = Math.PI * 2) => new THREE.TorusGeometry(R, t, rs, ts, arc),
  oct: (r) => new THREE.OctahedronGeometry(r, 0),
  ico: (r, d = 1) => new THREE.IcosahedronGeometry(r, d),
  lathe: (pts, s = 16) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), s),
  hexShield: (r, depth) => {
    const shape = new THREE.Shape();
    for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; const x = Math.cos(a) * r, y = Math.sin(a) * r * 1.18; i ? shape.lineTo(x, y) : shape.moveTo(x, y); }
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * 0.4, bevelSize: r * 0.06, bevelSegments: 1 });
  },
};

export class Rig {
  constructor(id) {
    this.id = id;
    this.scene = new THREE.Group(); this.scene.name = id;
    this.root = new THREE.Group(); this.root.name = 'rig'; this.scene.add(this.root);
    this.nodes = { rig: this.root };
    this.parts = new Map();
    this.clips = [];
  }
  node(name, parent = 'rig', pos = [0, 0, 0], rot = null) {
    const n = new THREE.Group(); n.name = name; n.position.set(...pos);
    if (rot) n.rotation.set(...rot);
    this.nodes[parent].add(n); this.nodes[name] = n; return n;
  }
  empty(name, parent, pos) { return this.node(name, parent, pos); }
  add(nodeName, geo, color, bucket = 'body', { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = {}) {
    const g = prep(geo.clone ? geo : geo);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scale));
    g.applyMatrix4(m);
    tmpColor.set(color);
    const n = g.attributes.position.count, arr = new Uint16Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = tmpColor.r * 65535; arr[i * 3 + 1] = tmpColor.g * 65535; arr[i * 3 + 2] = tmpColor.b * 65535; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3, true));
    const key = nodeName + '|' + bucket;
    if (!this.parts.has(key)) this.parts.set(key, []);
    this.parts.get(key).push(g);
    return this;
  }
  build() {
    for (const [key, geos] of this.parts) {
      const [nodeName, bucket] = key.split('|');
      const merged = mergeGeometries(geos, false);
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, MATS[bucket]);
      mesh.name = `${nodeName}_${bucket}`;
      mesh.castShadow = bucket !== 'glow';
      this.nodes[nodeName].add(mesh);
    }
    this.scene.animations = this.clips;
    return this.scene;
  }
  // tracks: [node, 'r'|'p'|'s', times[], values[[x,y,z]...]]
  clip(name, duration, tracks) {
    const kts = [];
    for (const [node, prop, times, values] of tracks) {
      if (!this.nodes[node]) throw new Error(`${this.id}: clip ${name} references missing node ${node}`);
      if (prop === 'r') {
        const q = new THREE.Quaternion(), flat = [];
        for (const v of values) { q.setFromEuler(new THREE.Euler(v[0], v[1], v[2])); flat.push(q.x, q.y, q.z, q.w); }
        kts.push(new THREE.QuaternionKeyframeTrack(`${node}.quaternion`, times, flat));
      } else {
        kts.push(new THREE.VectorKeyframeTrack(`${node}.${prop === 'p' ? 'position' : 'scale'}`, times, values.flat()));
      }
    }
    this.clips.push(new THREE.AnimationClip(name, duration, kts));
  }
  base(node) { const n = this.nodes[node]; return { p: n.position.toArray(), r: [n.rotation.x, n.rotation.y, n.rotation.z], s: n.scale.toArray() }; }
}

const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---------------------------------------------------------------- shared FX nodes
function muzzle(rig, parent, pos, color, size = 0.09) {
  rig.empty('muzzle', parent, pos);
  rig.node('flash', parent, pos);
  rig.add('flash', G.oct(size), color, 'glow', { scale: [1, 1, 1.8] });
  rig.add('flash', G.sph(size * 0.55, 8, 6), '#ffffff', 'glow');
  rig.nodes.flash.scale.set(0.001, 0.001, 0.001);
}
const flashTrack = (dur) => ['flash', 's', [0, dur * 0.12, dur * 0.45, dur], [[0.001, 0.001, 0.001], [1.3, 1.3, 1.3], [0.4, 0.4, 0.4], [0.001, 0.001, 0.001]]];

// ---------------------------------------------------------------- humanoid v3 (heroic stylised proportions)
// opts: {armor, armor2, trim, glow, skin, hair, hat, eyes, lips, bulk, slim, long,
//        head:'helm'|'commander'|'hair'|'crown'|'hood'|'goggles'|'beret', weapon, shield, shieldGlow, cape, backpack}
function limb(rig, node, rt, rb, len, color, bucket, pos, rot = [0, 0, 0]) {
  // tapered limb with rounded ends, hanging down from pos along -Y (then rotated)
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot));
  const at = (y) => new THREE.Vector3(0, y, 0).applyQuaternion(q).add(new THREE.Vector3(...pos)).toArray();
  rig.add(node, G.cyl(rt, rb, len, 16), color, bucket, { pos: at(-len / 2), rot });
  rig.add(node, G.sph(rt, 14, 10), color, bucket, { pos: at(0) });
  rig.add(node, G.sph(rb, 14, 10), color, bucket, { pos: at(-len) });
}
const front = (w) => Math.PI / 2 - w / 2; // SphereGeometry phiStart centred on +Z

export function humanoid(rig, o) {
  const b = o.bulk ?? 1, slim = o.slim ? 0.8 : 1, W = b * slim, fem = !!o.slim;
  const skinB = 'skin';
  rig.node('hips', 'rig', [0, 0.45, 0]);
  rig.add('hips', G.sph(0.12, 16, 10), o.armor2, 'body', { scale: [1.15 * W, 0.7, 0.85 * b] });
  rig.add('hips', G.torus(0.125 * W, 0.022, 8, 24), o.trim, 'metal', { pos: [0, 0.035, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 0.8 * b / W, 1] });
  rig.add('hips', G.box(0.07, 0.05, 0.03, 0.01), o.glow, 'glow', { pos: [0, 0.035, 0.105 * b] });
  for (const s of [-1, 1]) rig.add('hips', G.box(0.09 * W, 0.12, 0.03, 0.012), o.armor, 'body', { pos: [s * 0.08 * W, -0.06, 0.08 * b], rot: [0.15, 0, s * -0.1] });
  for (const s of [-1, 1]) {
    const nm = s < 0 ? 'legL' : 'legR';
    rig.node(nm, 'hips', [s * 0.075 * W, -0.03, 0], [0, 0, s * 0.06]);
    limb(rig, nm, 0.07 * b, 0.058 * b, 0.17, o.armor2, 'body', [0, 0, 0]);
    rig.add(nm, G.box(0.11 * b, 0.13, 0.07, 0.03), o.armor, 'body', { pos: [0, -0.08, 0.04 * b], rot: [-0.05, 0, 0] });
    rig.add(nm, G.sph(0.055 * b, 12, 8), o.trim, 'metal', { pos: [0, -0.19, 0.045 * b], scale: [1, 0.9, 0.7] });
    limb(rig, nm, 0.06 * b, 0.05 * b, 0.15, o.armor2, 'body', [0, -0.19, 0]);
    rig.add(nm, G.box(0.11 * b, 0.15, 0.08 * b, 0.035), o.armor, 'body', { pos: [0, -0.27, 0.04 * b] });
    rig.add(nm, G.box(0.025, 0.08, 0.01, 0.004), o.glow, 'glow', { pos: [0, -0.27, 0.085 * b] });
    rig.add(nm, G.box(0.125 * b, 0.08, 0.17 * b, 0.035), o.armor2, 'body', { pos: [0, -0.385, 0.025] });
    rig.add(nm, G.sph(0.065 * b, 12, 8), o.armor, 'body', { pos: [0, -0.39, 0.09 * b], scale: [1, 0.65, 1] });
    rig.add(nm, G.box(0.13 * b, 0.025, 0.18 * b, 0.008), o.trim, 'metal', { pos: [0, -0.345, 0.025] });
  }
  rig.node('torso', 'hips', [0, 0.04, 0]);
  rig.add('torso', G.sph(0.11, 16, 10), o.armor2, 'body', { pos: [0, 0.07, 0], scale: [1.15 * W, 0.9, 0.85 * b] });
  for (let i = 0; i < 3; i++) rig.add('torso', G.box(0.13 * W, 0.035, 0.03, 0.012), o.armor, 'body', { pos: [0, 0.03 + i * 0.045, 0.09 * b] });
  rig.add('torso', G.sph(0.17, 20, 14), o.armor, 'body', { pos: [0, 0.25, 0], scale: [1.18 * W, fem ? 0.82 : 0.88, 0.78 * b] });
  rig.add('torso', G.box(0.24 * W, 0.15, 0.07, 0.04), o.armor, 'body', { pos: [0, 0.25, 0.11 * b], rot: [-0.1, 0, 0] });
  rig.add('torso', G.box(0.2 * W, 0.02, 0.075, 0.008), o.trim, 'metal', { pos: [0, 0.33, 0.115 * b], rot: [-0.1, 0, 0] });
  rig.add('torso', G.hex(0.034, 0.02), o.glow, 'glow', { pos: [0, 0.26, 0.15 * b], rot: [Math.PI / 2 - 0.1, 0, 0] });
  rig.add('torso', G.torus(0.035, 0.008, 6, 16), o.trim, 'metal', { pos: [0, 0.26, 0.152 * b], rot: [-0.1, 0, 0] });
  for (const s of [-1, 1]) rig.add('torso', G.box(0.012, 0.09, 0.012, 0.004), o.glow, 'glow', { pos: [s * 0.09 * W, 0.23, 0.13 * b], rot: [-0.1, 0, s * 0.25] });
  rig.add('torso', G.torus(0.075, 0.025, 8, 20), o.armor2, 'body', { pos: [0, 0.39, 0], rot: [Math.PI / 2, 0, 0] });
  if (o.backpack !== false) {
    rig.add('torso', G.box(0.24 * W, 0.22, 0.1, 0.04), o.armor2, 'body', { pos: [0, 0.25, -0.15 * b] });
    for (const s of [-1, 1]) { rig.add('torso', G.cyl(0.032, 0.032, 0.2, 12), o.trim, 'metal', { pos: [s * 0.075, 0.25, -0.21 * b] }); rig.add('torso', G.cyl(0.024, 0.024, 0.14, 10), o.glow, 'glow', { pos: [s * 0.075, 0.25, -0.235 * b] }); }
  }
  if (o.cape) {
    rig.node('cape', 'torso', [0, 0.36, -0.13 * b]);
    rig.add('cape', G.box(0.36 * W, 0.56, 0.02, 0.008), o.cape, 'skin', { pos: [0, -0.28, -0.03], rot: [0.14, 0, 0] });
    rig.add('cape', G.box(0.37 * W, 0.025, 0.03, 0.008), o.trim, 'metal', { pos: [0, -0.56, -0.07], rot: [0.14, 0, 0] });
    rig.add('cape', G.box(0.36 * W, 0.04, 0.05, 0.01), o.trim, 'metal', { pos: [0, 0, 0] });
  }
  // ---------------- head
  rig.node('head', 'torso', [0, 0.41, 0.01]);
  rig.nodes.head.scale.setScalar(o.headScale ?? 1.25);
  rig.add('head', G.cyl(0.042, 0.05, 0.06, 12), fem || o.head === 'hood' || o.head === 'goggles' ? o.skin : o.armor2, fem ? skinB : 'body', { pos: [0, 0.0, 0] });
  const hd = o.head || 'helm';
  if (hd === 'helm' || hd === 'commander') {
    rig.add('head', G.sph(0.115, 22, 16), o.armor, 'body', { pos: [0, 0.11, 0], scale: [1, 1.03, 1.08] });
    rig.add('head', G.sphPart(0.117, front(2.1), 2.1, Math.PI * 0.43, Math.PI * 0.13), o.glow, 'glow', { pos: [0, 0.11, 0], scale: [1, 1.03, 1.08] });
    rig.add('head', G.sph(0.085, 16, 10), o.armor2, 'body', { pos: [0, 0.06, 0.04], scale: [1, 0.7, 1] });
    rig.add('head', G.box(0.03, 0.04, 0.02, 0.008), o.glow, 'glow', { pos: [0, 0.04, 0.115] });
    rig.add('head', G.box(0.035, 0.03, 0.2, 0.012), o.trim, 'metal', { pos: [0, 0.225, -0.01], rot: [0.15, 0, 0] });
    for (const s of [-1, 1]) {
      rig.add('head', G.cyl(0.04, 0.04, 0.03, 16), o.armor2, 'body', { pos: [s * 0.115, 0.1, -0.01], rot: [0, 0, Math.PI / 2] });
      rig.add('head', G.torus(0.032, 0.007, 6, 16), o.glow, 'glow', { pos: [s * 0.13, 0.1, -0.01], rot: [0, Math.PI / 2, 0] });
    }
    if (hd === 'commander') {
      rig.add('head', G.cyl(0.005, 0.005, 0.22, 5), o.trim, 'metal', { pos: [0.12, 0.24, -0.04] });
      rig.add('head', G.sph(0.018, 8, 6), o.glow, 'glow', { pos: [0.12, 0.35, -0.04] });
      for (const s of [-1, 1]) rig.add('head', G.cone(0.025, 0.11, 6), o.trim, 'metal', { pos: [s * 0.08, 0.2, -0.04], rot: [-0.5, 0, s * -0.7] });
    }
  } else {
    // ---- stylised face
    rig.add('head', G.sph(0.095, 22, 16), o.skin, skinB, { pos: [0, 0.105, 0.012], scale: [0.92, 1.04, 0.96] });
    rig.add('head', G.sph(0.06, 14, 10), o.skin, skinB, { pos: [0, 0.055, 0.035], scale: [1.05, 0.85, 1] }); // jaw/cheeks
    for (const s of [-1, 1]) {
      rig.add('head', G.sph(0.022, 12, 8), '#f6f8ff', 'skin', { pos: [s * 0.034, 0.1, 0.084], scale: [1.25, 0.95, 0.45] });
      rig.add('head', G.sph(0.0145, 12, 8), o.eyes || '#5fd3ff', 'glow', { pos: [s * 0.033, 0.099, 0.093], scale: [1, 1.1, 0.4] });
      rig.add('head', G.sph(0.0068, 8, 6), '#10131c', 'skin', { pos: [s * 0.033, 0.099, 0.0985], scale: [1, 1.1, 0.4] });
      rig.add('head', G.sph(0.004, 6, 4), '#ffffff', 'glow', { pos: [s * 0.029, 0.105, 0.1] });
      rig.add('head', G.box(0.038, 0.007, 0.01, 0.003), o.brows || o.hair, 'skin', { pos: [s * 0.035, 0.13, 0.088], rot: [0, 0, s * -0.18] });
      rig.add('head', G.box(0.03, 0.004, 0.006, 0.002), '#141824', 'skin', { pos: [s * 0.036, 0.113, 0.092], rot: [0, 0, s * -0.1] }); // lashes
    }
    rig.add('head', G.sph(0.011, 8, 6), o.skin, skinB, { pos: [0, 0.078, 0.098], scale: [0.8, 1, 0.9] });
    rig.add('head', G.sph(0.016, 10, 6), o.lips || '#d9707e', skinB, { pos: [0, 0.052, 0.087], scale: [1.35, 0.45, 0.5] });
    for (const s of [-1, 1]) rig.add('head', G.sph(0.018, 8, 6), o.skin, skinB, { pos: [s * 0.087, 0.1, 0.0], scale: [0.5, 1, 0.8] });
    const hairMat = 'skin';
    const hairCap = () => {
      rig.add('head', G.sphPart(0.108, 0, Math.PI * 2, 0, Math.PI * 0.36), o.hair, hairMat, { pos: [0, 0.11, 0.0], scale: [1.04, 1.06, 1.12] });
      rig.add('head', G.sphPart(0.108, front(Math.PI * 2 - 2.0) + Math.PI, Math.PI * 2 - 2.0, 0, Math.PI * 0.82), o.hair, hairMat, { pos: [0, 0.11, -0.005], scale: [1.06, 1.06, 1.12] });
      for (let i = 0; i < 5; i++) { const x = -0.06 + i * 0.03; rig.add('head', G.cap(0.018, 0.05, 6), o.hair, hairMat, { pos: [x, 0.165, 0.082], rot: [0.9, 0, (x) * -6] }); }
      for (const s of [-1, 1]) rig.add('head', G.cap(0.022, o.long ? 0.2 : 0.11, 8), o.hair, hairMat, { pos: [s * 0.088, o.long ? 0.02 : 0.07, 0.03], rot: [0.08, 0, s * 0.08] });
    };
    if (hd === 'hair' || hd === 'crown') {
      hairCap();
      if (o.long) for (let i = 0; i < 4; i++) rig.add('head', G.cap(0.035, 0.26, 8), o.hair, hairMat, { pos: [-0.06 + i * 0.04, 0.0, -0.08], rot: [0.18, 0, (i - 1.5) * 0.08] });
    }
    if (hd === 'crown') {
      rig.add('head', G.torus(0.1, 0.01, 6, 28, Math.PI * 1.2), o.trim, 'metal', { pos: [0, 0.19, 0.0], rot: [Math.PI / 2 - 0.35, 0, Math.PI * 0.4] });
      rig.add('head', G.oct(0.028), o.glow, 'glow', { pos: [0, 0.215, 0.095], scale: [0.8, 1.5, 0.6] });
      for (const s of [-1, 1]) { rig.add('head', G.cone(0.014, 0.09, 5), o.trim, 'metal', { pos: [s * 0.05, 0.235, 0.075], rot: [0.2, 0, s * -0.25] }); rig.add('head', G.cone(0.012, 0.12, 5), o.trim, 'metal', { pos: [s * 0.095, 0.21, 0.0], rot: [0, 0, s * -0.9] }); }
    }
    if (hd === 'beret') {
      hairCap();
      rig.add('head', G.sph(0.125, 18, 10), o.hat, 'skin', { pos: [0.015, 0.195, -0.01], scale: [1.08, 0.42, 1.1], rot: [0.12, 0, -0.18] });
      rig.add('head', G.torus(0.105, 0.012, 6, 24), o.trim, 'metal', { pos: [0.005, 0.175, 0.0], rot: [Math.PI / 2 + 0.12, 0, -0.12] });
      rig.add('head', G.box(0.03, 0.03, 0.03, 0.008), o.glow, 'glow', { pos: [0.1, 0.13, 0.03] });
      rig.add('head', G.cyl(0.03, 0.03, 0.02, 12), '#2a2342', 'body', { pos: [0.105, 0.1, 0.0], rot: [0, 0, Math.PI / 2] });
    }
    if (hd === 'hood' || hd === 'goggles') {
      if (hd === 'goggles') hairCap();
      rig.add('head', G.sphPart(0.135, front(Math.PI * 2 - 1.7) + Math.PI, Math.PI * 2 - 1.7, 0, Math.PI * 0.75), o.hood || o.hair, 'skin', { pos: [0, 0.11, -0.01], scale: [1.05, 1.1, 1.12] });
      rig.add('head', G.torus(0.1, 0.018, 8, 24, Math.PI * 1.25), o.hood || o.hair, 'skin', { pos: [0, 0.12, 0.05], rot: [0.3, 0, -Math.PI * 0.125 + Math.PI / 2 - Math.PI / 2], scale: [1.05, 1.1, 1] });
      rig.add('head', G.box(0.26, 0.12, 0.14, 0.05), o.hood || o.hair, 'skin', { pos: [0, -0.02, -0.04] });
      if (hd === 'hood') rig.add('head', G.sphPart(0.1, front(1.9), 1.9, Math.PI * 0.42, Math.PI * 0.1), o.glow, 'glow', { pos: [0, 0.105, 0.012], scale: [0.95, 1.04, 0.99] });
      if (hd === 'goggles') for (const s of [-1, 1]) {
        rig.add('head', G.torus(0.022, 0.007, 8, 18), o.trim, 'metal', { pos: [s * 0.034, 0.1, 0.1] });
        rig.add('head', G.cyl(0.02, 0.02, 0.004, 16), '#ffcf7a', 'glow', { pos: [s * 0.034, 0.1, 0.101], rot: [Math.PI / 2, 0, 0] });
      }
    }
  }
  // ---------------- arms (pre-posed holding weapon)
  for (const s of [-1, 1]) {
    const nm = s < 0 ? 'armL' : 'armR';
    rig.node(nm, 'torso', [s * 0.205 * W, 0.33, 0], [-0.95, s * -0.15, s * -0.14]);
    rig.add(nm, G.sph(0.098 * b, 18, 12), o.armor, 'body', { pos: [s * 0.03, 0.02, 0], scale: [1.12, 0.95, 1.08] });
    rig.add(nm, G.sph(0.085 * b, 14, 10), o.armor2, 'body', { pos: [s * 0.04, 0.06, 0], scale: [1.1, 0.6, 1.1] });
    rig.add(nm, G.torus(0.088 * b, 0.011, 6, 24), o.trim, 'metal', { pos: [s * 0.03, -0.015, 0], rot: [Math.PI / 2, 0, 0], scale: [1.12, 1.08, 1] });
    rig.add(nm, G.box(0.02, 0.06, 0.012, 0.004), o.glow, 'glow', { pos: [s * 0.15 * b, 0.01, 0.0], rot: [0, 0, s * 0.4] });
    limb(rig, nm, 0.048 * b, 0.044 * b, 0.12, o.armor2, fem ? skinB : 'body', [0, -0.04, 0]);
    rig.add(nm, G.sph(0.05 * b, 10, 8), o.trim, 'metal', { pos: [0, -0.16, 0] });
    limb(rig, nm, 0.066 * b, 0.056 * b, 0.12, o.armor, 'body', [0, -0.18, 0]);
    rig.add(nm, G.box(0.012, 0.08, 0.02, 0.004), o.glow, 'glow', { pos: [s * 0.06 * b, -0.24, 0.0] });
    rig.add(nm, G.sph(0.05 * b, 12, 8), o.armor2, 'body', { pos: [0, -0.33, 0.01], scale: [1, 1.1, 1.05] });
  }
  rig.node('weapon', 'torso', [0.06 * W, 0.2, 0.22]);
  o.weapon?.(rig);
  if (o.shield) {
    rig.node('shield', 'torso', [-0.27 * W, 0.18, 0.16], [0, 0.4, 0]);
    rig.add('shield', G.hexShield(0.2 * o.shield, 0.035), o.armor2, 'body', { rot: [0, Math.PI, 0] });
    rig.add('shield', G.hexShield(0.165 * o.shield, 0.03), o.shieldGlow || '#3fb4ff', 'glow', { pos: [0, 0, 0.012], rot: [0, Math.PI, 0] });
    for (let i = 0; i < 7; i++) { const a = (i / 6) * Math.PI * 2, rr = i ? 0.09 * o.shield : 0; rig.add('shield', G.hex(0.05 * o.shield, 0.012), o.armor2, 'body', { pos: [Math.cos(a) * rr, Math.sin(a) * rr, 0.025], rot: [Math.PI / 2, 0, 0], scale: [0.85, 1, 0.85] }); }
    rig.add('shield', G.box(0.42 * o.shield, 0.025, 0.03, 0.01), o.trim, 'metal', { pos: [0, 0, 0.035] });
  }
  humanoidClips(rig, !!o.cape, !!o.shield);
}

function humanoidClips(rig, cape, shield) {
  const T = (n) => rig.base(n);
  const aL = T('armL').r, aR = T('armR').r, w = T('weapon').p, hp = T('hips').p, to = T('torso').r;
  const extra = [];
  rig.clip('idle', 2.4, [
    ['hips', 'p', [0, 1.2, 2.4], [hp, add3(hp, [0, -0.01, 0]), hp]],
    ['torso', 'r', [0, 1.2, 2.4], [to, [0.03, 0.04, 0], to]],
    ['head', 'r', [0, 0.8, 1.6, 2.4], [[0, 0, 0], [0, 0.18, 0], [0, -0.12, 0], [0, 0, 0]]],
    ['weapon', 'p', [0, 1.2, 2.4], [w, add3(w, [0, 0.008, 0]), w]],
    ...(cape ? [['cape', 'r', [0, 1.2, 2.4], [[0, 0, 0], [0.12, 0, 0.02], [0, 0, 0]]]] : []),
  ]);
  const sw = 0.65;
  rig.clip('move', 0.72, [
    ['legL', 'r', [0, 0.18, 0.36, 0.54, 0.72], [[sw, 0, 0], [0, 0, 0], [-sw, 0, 0], [0, 0, 0], [sw, 0, 0]]],
    ['legR', 'r', [0, 0.18, 0.36, 0.54, 0.72], [[-sw, 0, 0], [0, 0, 0], [sw, 0, 0], [0, 0, 0], [-sw, 0, 0]]],
    ['hips', 'p', [0, 0.18, 0.36, 0.54, 0.72], [hp, add3(hp, [0, 0.03, 0]), hp, add3(hp, [0, 0.03, 0]), hp]],
    ['torso', 'r', [0, 0.36, 0.72], [[0.12, 0.06, 0], [0.12, -0.06, 0], [0.12, 0.06, 0]]],
    ...(cape ? [['cape', 'r', [0, 0.36, 0.72], [[0.35, 0, 0], [0.5, 0, 0.04], [0.35, 0, 0]]]] : []),
  ]);
  rig.clip('fire', 0.36, [
    ['weapon', 'p', [0, 0.05, 0.36], [w, add3(w, [0, 0.015, -0.07]), w]],
    ['torso', 'r', [0, 0.05, 0.36], [to, [-0.09, 0, 0], to]],
    ['armR', 'r', [0, 0.05, 0.36], [aR, [aR[0] - 0.15, aR[1], aR[2]], aR]],
    ['armL', 'r', [0, 0.05, 0.36], [aL, [aL[0] - 0.12, aL[1], aL[2]], aL]],
    flashTrack(0.36),
  ]);
  rig.clip('hit', 0.3, [
    ['torso', 'r', [0, 0.06, 0.3], [to, [-0.25, 0.1, 0.05], to]],
    ['head', 'r', [0, 0.06, 0.3], [[0, 0, 0], [-0.3, 0, 0], [0, 0, 0]]],
  ]);
  rig.clip('die', 1.1, [
    ['rig', 'r', [0, 0.25, 0.8, 1.1], [[0, 0, 0], [-0.25, 0, 0.05], [-1.45, 0, 0.1], [-1.5, 0, 0.1]]],
    ['rig', 'p', [0, 0.25, 0.8, 1.1], [[0, 0, 0], [0, 0.05, -0.05], [0, 0.04, -0.35], [0, -0.02, -0.38]]],
    ['legL', 'r', [0, 0.8], [[0, 0, 0], [0.4, 0, 0]]],
    ['armR', 'r', [0, 0.8], [aR, [-2.6, 0, -0.5]]],
    ['armL', 'r', [0, 0.8], [aL, [-2.6, 0, 0.5]]],
  ]);
}

// --------------------------------------------------------------- weapons
export const W = {
  rifle: (glow, body = '#2b3547', trim = '#c9d4e6', len = 0.46) => (rig) => {
    rig.add('weapon', G.box(0.075, 0.09, len, 0.02), body, 'body', { pos: [0, 0, len * 0.2] });
    rig.add('weapon', G.box(0.05, 0.04, len * 0.55, 0.01), trim, 'metal', { pos: [0, 0.06, len * 0.15] });
    rig.add('weapon', G.cyl(0.025, 0.025, len * 0.45, 10), trim, 'metal', { pos: [0, 0.0, len * 0.6], rot: [Math.PI / 2, 0, 0] });
    rig.add('weapon', G.box(0.08, 0.025, len * 0.5, 0.01), glow, 'glow', { pos: [0.0, -0.035, len * 0.18] });
    rig.add('weapon', G.box(0.04, 0.1, 0.05, 0.01), body, 'body', { pos: [0, -0.08, 0.04] });
    rig.add('weapon', G.torus(0.032, 0.01, 6, 12), glow, 'glow', { pos: [0, 0, len * 0.82] });
    muzzle(rig, 'weapon', [0, 0, len * 0.88], glow);
  },
  sniper: (glow) => (rig) => {
    rig.add('weapon', G.box(0.06, 0.08, 0.5, 0.02), '#1f2a3a', 'body', { pos: [0, 0, 0.12] });
    rig.add('weapon', G.cyl(0.018, 0.018, 0.55, 8), '#c9d4e6', 'metal', { pos: [0, 0.01, 0.6], rot: [Math.PI / 2, 0, 0] });
    rig.add('weapon', G.cyl(0.03, 0.03, 0.18, 10), '#30405a', 'body', { pos: [0, 0.08, 0.1], rot: [Math.PI / 2, 0, 0] });
    rig.add('weapon', G.cyl(0.024, 0.024, 0.01, 10), glow, 'glow', { pos: [0, 0.08, 0.195], rot: [Math.PI / 2, 0, 0] });
    rig.add('weapon', G.box(0.012, 0.02, 0.4, 0.003), glow, 'glow', { pos: [0.035, 0, 0.3] });
    muzzle(rig, 'weapon', [0, 0.01, 0.9], glow, 0.07);
  },
  gatling: (glow) => (rig) => {
    rig.add('weapon', G.box(0.14, 0.14, 0.26, 0.03), '#3a3f4b', 'body', { pos: [0, 0, 0.05] });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; rig.add('weapon', G.cyl(0.016, 0.016, 0.34, 6), '#c9d4e6', 'metal', { pos: [Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0.3], rot: [Math.PI / 2, 0, 0] }); }
    rig.add('weapon', G.torus(0.06, 0.012, 6, 14), glow, 'glow', { pos: [0, 0, 0.42] });
    rig.add('weapon', G.box(0.06, 0.12, 0.12, 0.02), glow, 'glow', { pos: [0.08, 0, 0.0] });
    muzzle(rig, 'weapon', [0, 0, 0.5], glow, 0.12);
  },
  flamer: (glow) => (rig) => {
    rig.add('weapon', G.box(0.09, 0.1, 0.3, 0.03), '#3b2d2a', 'body', { pos: [0, 0, 0.06] });
    rig.add('weapon', G.cyl(0.045, 0.03, 0.2, 10), '#c9a46e', 'metal', { pos: [0, 0, 0.3], rot: [Math.PI / 2, 0, 0] });
    rig.add('weapon', G.cap(0.04, 0.12, 8), glow, 'glow', { pos: [0, -0.08, 0.02], rot: [Math.PI / 2, 0, 0] });
    muzzle(rig, 'weapon', [0, 0, 0.42], glow, 0.11);
  },
  lance: (glow) => (rig) => {
    rig.add('weapon', G.cyl(0.018, 0.018, 0.95, 8), '#e9d9a6', 'metal', { pos: [0, 0, 0.2], rot: [Math.PI / 2, 0, 0] });
    rig.add('weapon', G.oct(0.07), glow, 'glow', { pos: [0, 0, 0.72], scale: [0.6, 0.6, 2.3] });
    rig.add('weapon', G.torus(0.06, 0.012, 6, 14), '#ffd36e', 'metal', { pos: [0, 0, 0.55] });
    rig.add('weapon', G.torus(0.085, 0.006, 4, 18), glow, 'glow', { pos: [0, 0, 0.55] });
    muzzle(rig, 'weapon', [0, 0, 0.9], glow, 0.12);
  },
  tool: (glow) => (rig) => {
    rig.add('weapon', G.box(0.06, 0.06, 0.22, 0.02), '#5b4a3a', 'body', { pos: [0, 0, 0.05] });
    rig.add('weapon', G.torus(0.05, 0.018, 6, 12, Math.PI * 1.4), '#c9d4e6', 'metal', { pos: [0, 0, 0.2], rot: [0, Math.PI / 2, 0] });
    rig.add('weapon', G.sph(0.03, 8, 6), glow, 'glow', { pos: [0, 0, 0.21] });
    muzzle(rig, 'weapon', [0, 0, 0.25], glow, 0.07);
  },
};

// ---------------------------------------------------------------- tower base
export function towerBase(rig, c) {
  rig.node('base', 'rig');
  rig.add('base', G.hex(0.46, 0.1), '#1b2436', 'body', { pos: [0, 0.05, 0] });
  rig.add('base', G.hex(0.48, 0.03), c.trim || '#d6a548', 'metal', { pos: [0, 0.1, 0] });
  rig.add('base', G.hex(0.38, 0.1), '#273249', 'body', { pos: [0, 0.15, 0] });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; rig.add('base', G.box(0.1, 0.02, 0.03, 0.005), c.glow, 'glow', { pos: [Math.sin(a) * 0.42, 0.075, Math.cos(a) * 0.42], rot: [0, a, 0] }); }
  rig.add('base', G.cyl(0.2, 0.26, 0.16, 12), '#323e58', 'body', { pos: [0, 0.27, 0] });
  rig.add('base', G.torus(0.21, 0.015, 6, 20), c.glow, 'glow', { pos: [0, 0.3, 0], rot: [Math.PI / 2, 0, 0] });
}

export function towerClips(rig, opts = {}) {
  const tracks = [];
  if (rig.nodes.spin) tracks.push(['spin', 'r', [0, 1.5, 3], [[0, 0, 0], [0, Math.PI, 0], [0, Math.PI * 2 - 0.001, 0]]]);
  if (rig.nodes.bob) { const p = rig.base('bob').p; tracks.push(['bob', 'p', [0, 1.5, 3], [p, add3(p, [0, 0.05, 0]), p]]); }
  if (rig.nodes.turret && !tracks.length) tracks.push(['turret', 's', [0, 1.5, 3], [[1, 1, 1], [1, 1.01, 1], [1, 1, 1]]]);
  rig.clip('idle', 3, tracks);
  rig.clip('move', 3, tracks);
  const ft = [flashTrack(opts.fireDur || 0.4)];
  if (rig.nodes.barrel) { const p = rig.base('barrel').p; ft.push(['barrel', 'p', [0, 0.05, opts.fireDur || 0.4], [p, add3(p, opts.recoil || [0, 0, -0.1]), p]]); }
  if (rig.nodes.bob) { const p = rig.base('bob').p; ft.push(['bob', 's', [0, 0.06, 0.4], [[1, 1, 1], [1.2, 1.2, 1.2], [1, 1, 1]]]); }
  rig.clip('fire', opts.fireDur || 0.4, ft);
  rig.clip('hit', 0.25, [['base', 'p', [0, 0.05, 0.25], [[0, 0, 0], [0.02, -0.02, 0], [0, 0, 0]]]]);
  rig.clip('die', 1.0, [['rig', 's', [0, 0.3, 1], [[1, 1, 1], [1.08, 0.7, 1.08], [0.9, 0.05, 0.9]]], ['rig', 'r', [0, 1], [[0, 0, 0], [0.2, 0.4, 0.15]]]]);
}

// ---------------------------------------------------------------- legged walkers
export function walker(rig, c) {
  const n = c.legs || 4, H = c.height || 0.45, sc = c.scale || 1;
  rig.node('body', 'rig', [0, H * sc, 0]);
  c.bodyFn(rig, sc);
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n) * Math.PI * 2 + (c.legPhase || 0);
    const nm = 'leg' + i;
    const leg = rig.node(nm, 'body', [Math.sin(a) * c.hip * sc, -0.02 * sc, Math.cos(a) * c.hip * sc], [0, a, 0]);
    rig.add(nm, G.sph(0.06 * sc, 8, 6), c.joint, 'metal');
    rig.add(nm, G.box(0.1 * sc, 0.09 * sc, c.thigh * 1.1 * sc, 0.03 * sc), c.armor, 'body', { pos: [0, 0.1 * sc, c.thigh * 0.5 * sc], rot: [-0.45, 0, 0] });
    rig.add(nm, G.sph(0.065 * sc, 8, 6), c.joint, 'metal', { pos: [0, 0.18 * sc, c.thigh * 0.95 * sc] });
    rig.add(nm, G.box(0.1 * sc, H * sc * 1.05, 0.1 * sc, 0.03 * sc), c.armor2, 'body', { pos: [0, -H * 0.3 * sc, c.thigh * 1.0 * sc], rot: [0.12, 0, 0] });
    rig.add(nm, G.box(0.03 * sc, H * sc * 0.5, 0.02 * sc, 0.008), c.glow, 'glow', { pos: [0, -H * 0.25 * sc, c.thigh * 1.0 * sc + 0.05 * sc], rot: [0.12, 0, 0] });
    rig.add(nm, G.cone(0.05 * sc, 0.12 * sc, 6), c.joint, 'metal', { pos: [0, -H * 0.85 * sc, c.thigh * 0.98 * sc], rot: [Math.PI, 0, 0] });
    rig.add(nm, G.sph(0.018 * sc, 6, 4), c.glow, 'glow', { pos: [0, 0.07 * sc, c.thigh * 0.55 * sc] });
  }
  const bp = rig.base('body').p;
  const legs = (amp, phase) => Array.from({ length: n }, (_, i) => {
    const r0 = rig.base('leg' + i).r, off = (i % 2 ? Math.PI : 0) + phase;
    return ['leg' + i, 'r', [0, 0.15, 0.3, 0.45, 0.6], [0, 1, 2, 3, 4].map((k) => [r0[0] + Math.sin(off + (k * Math.PI) / 2) * amp, r0[1], r0[2] + Math.cos(off + (k * Math.PI) / 2) * amp * 0.5])];
  });
  rig.clip('idle', 2, [['body', 'p', [0, 1, 2], [bp, add3(bp, [0, -0.02 * sc, 0]), bp]]]);
  const md = c.moveDur || 0.6;
  rig.clip('move', md, [
    ...legs(0.3, 0).map((t) => [t[0], t[1], t[2].map((x) => (x * md) / 0.6), t[3]]),
    ['body', 'p', [0, md / 4, md / 2, (md * 3) / 4, md], [bp, add3(bp, [0, 0.025 * sc, 0]), bp, add3(bp, [0, 0.025 * sc, 0]), bp]],
  ]);
  const fire = [flashTrack(0.4), ['body', 'p', [0, 0.05, 0.4], [bp, add3(bp, [0, 0, -0.05 * sc]), bp]]];
  rig.clip('fire', 0.4, fire);
  rig.clip('hit', 0.3, [['body', 'r', [0, 0.06, 0.3], [[0, 0, 0], [-0.15, 0, 0.1], [0, 0, 0]]]]);
  rig.clip('die', 1.0, [['body', 'p', [0, 0.3, 1], [bp, add3(bp, [0, 0.1 * sc, 0]), [bp[0], 0.08 * sc, bp[2]]]], ['body', 'r', [0, 1], [[0, 0, 0], [0.35, 0.6, 0.3]]], ['rig', 's', [0.6, 1], [[1, 1, 1], [1, 0.6, 1]]]]);
}

// ---------------------------------------------------------------- flyers
export function flyer(rig, c) {
  rig.node('body', 'rig', [0, c.alt || 0.9, 0]);
  c.bodyFn(rig);
  const bp = rig.base('body').p;
  const spins = Object.keys(rig.nodes).filter((k) => k.startsWith('rotor')).map((k) => [k, 'r', [0, 0.25, 0.5], [[0, 0, 0], [0, Math.PI, 0], [0, Math.PI * 2 - 0.001, 0]]]);
  rig.clip('idle', 1.5, [['body', 'p', [0, 0.75, 1.5], [bp, add3(bp, [0, 0.06, 0]), bp]], ['body', 'r', [0, 0.75, 1.5], [[0, 0, 0.05], [0, 0, -0.05], [0, 0, 0.05]]], ...spins.map((s) => [s[0], s[1], s[2].map((t) => t * 3), s[3]])]);
  rig.clip('move', 0.5, [['body', 'p', [0, 0.25, 0.5], [bp, add3(bp, [0, 0.04, 0]), bp]], ['body', 'r', [0, 0.25, 0.5], [[0.18, 0, 0.06], [0.18, 0, -0.06], [0.18, 0, 0.06]]], ...spins]);
  rig.clip('fire', 0.3, [flashTrack(0.3), ['body', 'r', [0, 0.05, 0.3], [[0, 0, 0], [-0.12, 0, 0], [0, 0, 0]]]]);
  rig.clip('hit', 0.25, [['body', 'p', [0, 0.05, 0.25], [bp, add3(bp, [0.04, 0.05, 0]), bp]]]);
  rig.clip('die', 0.9, [['body', 'p', [0, 0.9], [bp, [bp[0], 0.05, bp[2] + 0.2]]], ['body', 'r', [0, 0.9], [[0, 0, 0], [0.9, 2.5, 1.2]]]]);
}
