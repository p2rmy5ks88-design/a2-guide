// Three.js battle scene: straight rigid 18×10 board, calibrated perspective camera fitted to the
// safe area between HUD and deck, GLB actors with AnimationMixer, VFX, health bars, ground picking.
import * as THREE from 'three';
import { COLS, ROWS, ENTRY, EXIT, OBSTACLES } from '../data.js';
import { Particles, Transients, Projectiles, GLOW_TEX } from './fx.js';

const TILE_TOP = 0.12;
export const toWorld = (x, y) => new THREE.Vector3(x - COLS / 2, 0, y - ROWS / 2);

function bannerTexture(color) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256); grd.addColorStop(0, color); grd.addColorStop(1, '#141a33');
  g.fillStyle = grd; g.beginPath(); g.moveTo(0, 0); g.lineTo(128, 0); g.lineTo(128, 220); g.lineTo(64, 256); g.lineTo(0, 220); g.fill();
  g.strokeStyle = '#ffd36e'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#e9f6ff'; g.beginPath(); g.moveTo(64, 50); g.lineTo(102, 150); g.lineTo(84, 150); g.lineTo(64, 96); g.lineTo(44, 150); g.lineTo(26, 150); g.fill();
  g.fillRect(48, 122, 32, 10);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function windowTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#121833'; g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 128; y += 12) for (let x = 6; x < 64; x += 14) { if (Math.random() < 0.55) { g.fillStyle = Math.random() < 0.7 ? '#ffb75a' : '#6fe0ff'; g.fillRect(x, y, 7, 6); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function tileTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 128, 128); grd.addColorStop(0, '#6b7895'); grd.addColorStop(1, '#4a5574');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 4; g.strokeRect(6, 6, 116, 116); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3; g.strokeRect(12, 12, 104, 104);
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(64, 14); g.lineTo(64, 40); g.moveTo(64, 88); g.lineTo(64, 114); g.moveTo(14, 64); g.lineTo(40, 64); g.moveTo(88, 64); g.lineTo(114, 64); g.stroke();
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export class BattleView {
  constructor(engine, lib, sim, hooks) {
    this.engine = engine; this.lib = lib; this.sim = sim; this.hooks = hooks;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#151a44');
    this.scene.fog = new THREE.Fog('#141a3d', 22, 46);
    this.scene.environment = engine.envMap;
    this.camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.5, 120);
    this.safe = { top: 60, bottom: 130, left: 0, right: 0 };
    this.actors = new Map(); this.time = 0; this.shake = 0;
    this.raycaster = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TILE_TOP);
    this.buildLights(); this.buildBoard(); this.buildSurroundings();
    this.particles = new Particles(this.scene); this.fx = new Transients(this.scene); this.proj = new Projectiles(this.scene, this.particles);
    this.buildBars(); this.buildOverlays();
    this.ready = this.buildProps();
  }

  // ------------------------------------------------------------------ scene construction
  buildLights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight('#8fa6ff', '#2a1640', 1.1));
    const key = new THREE.DirectionalLight('#ffe6c4', 2.4);
    key.position.set(-6, 14, 9); key.castShadow = true;
    key.shadow.mapSize.set(2048, 1024);
    Object.assign(key.shadow.camera, { left: -11, right: 11, top: 7, bottom: -7, near: 1, far: 40 });
    key.shadow.bias = -0.0008; key.shadow.normalBias = 0.02;
    s.add(key); this.key = key;
    const cyan = new THREE.DirectionalLight('#46d8ff', 1.1); cyan.position.set(-12, 5, -4); s.add(cyan);
    const mag = new THREE.DirectionalLight('#ff4fd8', 0.9); mag.position.set(10, 6, -10); s.add(mag);
    this.coreLight = new THREE.PointLight('#3ce5ff', 6, 7, 1.6); this.coreLight.position.copy(toWorld(EXIT.x + 1.6, EXIT.y + 0.5)).setY(1.4); s.add(this.coreLight);
    this.gateLight = new THREE.PointLight('#3ce5ff', 5, 6, 1.6); this.gateLight.position.copy(toWorld(ENTRY.x - 1.2, ENTRY.y + 0.5)).setY(1.2); s.add(this.gateLight);
  }
  buildBoard() {
    const s = this.scene;
    // base slab
    const slab = new THREE.Mesh(new THREE.BoxGeometry(COLS + 0.4, 0.5, ROWS + 0.4), new THREE.MeshStandardMaterial({ color: '#141b2e', metalness: 0.6, roughness: 0.5 }));
    slab.position.y = -0.25; slab.receiveShadow = true; s.add(slab);
    // glowing seams under tiles
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(COLS, ROWS), new THREE.MeshBasicMaterial({ color: '#1e5c9a', toneMapped: false }));
    seam.rotation.x = -Math.PI / 2; seam.position.y = 0.005; s.add(seam);
    // tiles (one instanced draw call)
    const tex = tileTexture();
    const geo = new THREE.BoxGeometry(0.93, TILE_TOP * 2, 0.93);
    const mat = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.45, roughness: 0.55, color: '#ffffff' });
    const tiles = new THREE.InstancedMesh(geo, mat, COLS * ROWS);
    const m = new THREE.Matrix4(), col = new THREE.Color();
    let i = 0;
    for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) {
      m.makeTranslation(x - COLS / 2 + 0.5, 0, y - ROWS / 2 + 0.5); tiles.setMatrixAt(i, m);
      col.set((x + y) % 2 ? '#8b97b4' : '#7e8aa8'); tiles.setColorAt(i, col); i++;
    }
    tiles.receiveShadow = true; s.add(tiles); this.tiles = tiles;
    // frame / rails (straight, rigid)
    const frameMat = new THREE.MeshStandardMaterial({ color: '#2a3552', metalness: 0.7, roughness: 0.38 });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#d9a443', metalness: 0.95, roughness: 0.25 });
    const stripMat = new THREE.MeshBasicMaterial({ color: '#ffb347', toneMapped: false });
    const cyanStrip = new THREE.MeshBasicMaterial({ color: '#3ce5ff', toneMapped: false });
    const W = COLS + 0.9, D = ROWS + 0.9;
    const addBox = (w, h, d, x, y, z, mtl, shadow = true) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mtl); b.position.set(x, y, z); b.castShadow = shadow; b.receiveShadow = true; s.add(b); return b; };
    for (const sz of [-1, 1]) {
      const h = sz < 0 ? 0.9 : 0.42, z = sz * (D / 2);
      addBox(W + 0.9, h, 0.45, 0, h / 2 - 0.1, z, frameMat);
      addBox(W + 0.95, 0.06, 0.5, 0, h - 0.1, z, goldMat, false);
      addBox(W - 1, 0.05, 0.02, 0, h * 0.45, z - sz * 0.235, stripMat, false);
    }
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2);
      // gap in the middle for entry / core
      for (const part of [-1, 1]) {
        const len = (D - 2.6) / 2;
        addBox(0.45, 0.55, len, x, 0.17, part * (1.3 + len / 2), frameMat);
        addBox(0.5, 0.06, len, x, 0.45, part * (1.3 + len / 2), goldMat, false);
        addBox(0.02, 0.05, len - 0.6, x - sx * 0.235, 0.25, part * (1.3 + len / 2), cyanStrip, false);
      }
    }
    // pillars
    const pillarGeo = new THREE.BoxGeometry(0.55, 1, 0.55);
    const capGeo = new THREE.BoxGeometry(0.42, 0.14, 0.42);
    const capMat = new THREE.MeshBasicMaterial({ color: '#ffc66e', toneMapped: false });
    const pillars = [];
    for (let k = 0; k <= 6; k++) pillars.push([-W / 2 + (k * W) / 6, -D / 2, k % 3 === 0 ? 1.8 : 1.3]);
    for (let k = 0; k <= 6; k++) pillars.push([-W / 2 + (k * W) / 6, D / 2, 0.75]);
    for (const [x, z, h] of pillars) {
      const p = new THREE.Mesh(pillarGeo, frameMat); p.scale.y = h; p.position.set(x, h / 2 - 0.1, z); p.castShadow = true; s.add(p);
      const c = new THREE.Mesh(capGeo, capMat); c.position.set(x, h - 0.05, z); s.add(c);
      const gold = new THREE.Mesh(capGeo, goldMat); gold.scale.set(1.35, 0.5, 1.35); gold.position.set(x, h - 0.16, z); s.add(gold);
    }
    // route chevrons (instanced, recomputed when path changes)
    const chev = new THREE.Shape(); chev.moveTo(-0.14, -0.16); chev.lineTo(0.02, 0); chev.lineTo(-0.14, 0.16); chev.lineTo(-0.06, 0.16); chev.lineTo(0.1, 0); chev.lineTo(-0.06, -0.16);
    const chevGeo = new THREE.ShapeGeometry(chev).rotateX(-Math.PI / 2).scale(1.3, 1, 1.3);
    this.chevrons = new THREE.InstancedMesh(chevGeo, new THREE.MeshBasicMaterial({ color: '#3ce5ff', transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false }), 260);
    this.chevrons.count = 0; this.chevrons.renderOrder = 2; s.add(this.chevrons);
    this.pathLine = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 0.07).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#3ce5ff', transparent: true, opacity: 0.75, toneMapped: false, depthWrite: false }), 200);
    this.pathLine.count = 0; s.add(this.pathLine);
    this.updatePath();
  }
  buildSurroundings() {
    const s = this.scene;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), new THREE.MeshStandardMaterial({ color: '#171c3a', roughness: 0.9, metalness: 0.1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.5; ground.receiveShadow = true; s.add(ground);
    // back wall with banners & lit windows
    const winTex = windowTexture();
    const bMat = new THREE.MeshStandardMaterial({ color: '#2a3156', map: winTex, emissive: '#ffffff', emissiveMap: winTex, emissiveIntensity: 0.9, roughness: 0.7 });
    for (let k = 0; k < 14; k++) {
      const w = 1.6 + Math.random() * 1.6, h = 2.5 + Math.random() * 4.5;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.6), bMat); b.position.set(-15 + k * 2.4 + Math.random(), h / 2 - 0.5, -9.6 - Math.random() * 3); s.add(b);
    }
    const bannerGeo = new THREE.PlaneGeometry(0.9, 1.8);
    [-6, 0, 6].forEach((x, i) => { const m = new THREE.Mesh(bannerGeo, new THREE.MeshBasicMaterial({ map: bannerTexture(i === 1 ? '#7a3cd0' : '#1f4ea8'), transparent: true, side: THREE.DoubleSide })); m.position.set(x, 2.3, -ROWS / 2 - 1.2); s.add(m); });
    // purple blossom trees
    const leafMat = new THREE.MeshStandardMaterial({ color: '#b04ad8', emissive: '#4a0f6a', emissiveIntensity: 0.5, roughness: 0.85, flatShading: true });
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#3a2a3a', roughness: 0.9 });
    const leaf = new THREE.IcosahedronGeometry(0.7, 1);
    const spots = [[-12.2, -4], [-12.6, 3.8], [12.6, -5.2], [12.8, 4.6], [-11, -7.5], [10.5, -8], [-13.6, 0.5], [13.9, 0]];
    for (const [x, z] of spots) {
      const t = new THREE.Group(); t.position.set(x, -0.5, z);
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.6, 7), trunkMat); tr.position.y = 0.8; t.add(tr);
      for (let k = 0; k < 6; k++) { const l = new THREE.Mesh(leaf, leafMat); l.position.set((Math.random() - 0.5) * 1.3, 1.8 + Math.random() * 0.7, (Math.random() - 0.5) * 1.3); l.scale.setScalar(0.6 + Math.random() * 0.5); t.add(l); }
      s.add(t);
    }
    // ambient floating motes
    this.motes = [];
  }
  async buildProps() {
    const s = this.scene;
    const gate = await this.lib.instance('entry_gate');
    gate.root.position.copy(toWorld(ENTRY.x - 0.75, ENTRY.y + 0.5)); gate.root.rotation.y = Math.PI / 2; gate.root.scale.setScalar(1.15); gate.loop('idle'); s.add(gate.root);
    const core = await this.lib.instance('core_reactor');
    core.root.position.copy(toWorld(EXIT.x + 1.75, EXIT.y + 0.5)); core.root.scale.setScalar(0.95); core.loop('idle'); s.add(core.root);
    this.props = [gate, core]; this.core = core;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, color: '#3ce5ff', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.8 }));
    halo.scale.setScalar(3.5); halo.position.copy(core.root.position).setY(1.4); s.add(halo);
    const gh = halo.clone(); gh.material = halo.material.clone(); gh.scale.setScalar(2.8); gh.position.copy(gate.root.position).setY(1.0); s.add(gh);
    const crate = await this.lib.load('obstacle_crate');
    for (const [x, y] of OBSTACLES) { const c = crate.scene.clone(); c.position.copy(toWorld(x + 0.5, y + 0.5)).setY(TILE_TOP); s.add(c); }
  }
  buildBars() {
    const n = 140;
    const geo = new THREE.PlaneGeometry(1, 1);
    const mk = (color, order) => { const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true, toneMapped: false }), n); m.renderOrder = order; m.frustumCulled = false; m.count = 0; this.scene.add(m); return m; };
    this.barBg = mk('#0b0f1c', 20); this.barFg = mk('#ffffff', 21);
    this.barFg.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
  }
  buildOverlays() {
    const s = this.scene;
    this.hoverTile = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.96).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#3cff9a', transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false }));
    this.hoverTile.position.y = TILE_TOP + 0.01; this.hoverTile.visible = false; this.hoverTile.renderOrder = 3; s.add(this.hoverTile);
    this.rangeRing = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#9ff4ff', transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false }));
    this.rangeDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#3ce5ff', transparent: true, opacity: 0.08, depthWrite: false, toneMapped: false }));
    for (const m of [this.rangeRing, this.rangeDisc]) { m.position.y = TILE_TOP + 0.02; m.visible = false; m.renderOrder = 3; s.add(m); }
    this.validTiles = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.88, 0.88).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#3ce5ff', transparent: true, opacity: 0.13, depthWrite: false, toneMapped: false }), COLS * ROWS);
    this.validTiles.count = 0; this.validTiles.renderOrder = 2; this.validTiles.position.y = TILE_TOP + 0.008; s.add(this.validTiles);
    this.selRing = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffd36e', transparent: true, depthWrite: false, toneMapped: false }));
    this.selRing.visible = false; this.selRing.renderOrder = 4; s.add(this.selRing);
  }

  // ------------------------------------------------------------------ camera: straight board fitted to safe area
  setSafeArea(safe) { this.safe = safe; this.fit(); }
  resize(w, h) { this.w = w; this.h = h; this.fit(); this.particles?.setScale(h * this.engine.dpr); }
  fit() {
    if (!this.w) return;
    const cam = this.camera, w = this.w, h = this.h, S = this.safe;
    cam.aspect = w / h; cam.clearViewOffset();
    const pitch = THREE.MathUtils.degToRad(57);
    const tgt = new THREE.Vector3(0, 0, 0.2);
    // world box to keep visible: board + rails + entry gate + core
    const pts = [];
    for (const x of [-COLS / 2 - 1.6, COLS / 2 + 2.6]) for (const z of [-ROWS / 2 - 0.6, ROWS / 2 + 0.6]) for (const y of [0, 0.4]) pts.push(new THREE.Vector3(x, y, z));
    const availW = Math.max(100, w - S.left - S.right), availH = Math.max(100, h - S.top - S.bottom);
    const measure = (d) => {
      cam.position.set(tgt.x, tgt.y + Math.sin(pitch) * d, tgt.z + Math.cos(pitch) * d); cam.lookAt(tgt); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const p of pts) { const v = p.clone().project(cam); const sx = (v.x * 0.5 + 0.5) * w, sy = (-v.y * 0.5 + 0.5) * h; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
      return { x0, x1, y0, y1 };
    };
    let lo = 5, hi = 120;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2, b = measure(mid); if (b.x1 - b.x0 <= availW && b.y1 - b.y0 <= availH) hi = mid; else lo = mid; }
    const b = measure(hi);
    this.camDist = hi;
    // shift the principal point so the board is centred in the safe rect (no tilt change → rails stay straight)
    const dx = (b.x0 + b.x1) / 2 - (S.left + availW / 2), dy = (b.y0 + b.y1) / 2 - (S.top + availH / 2);
    cam.setViewOffset(w, h, dx, dy, w, h); cam.updateProjectionMatrix();
    this.basePos = cam.position.clone();
  }
  pick(clientX, clientY, rect) {
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.plane, hit)) return null;
    const x = Math.floor(hit.x + COLS / 2), y = Math.floor(hit.z + ROWS / 2);
    // nearest actor (allies) for inspection
    let best = null, bd = 0.6;
    for (const [, a] of this.actors) { if (a.ent.side !== 'ally' || !a.ent.alive) continue; const d = Math.hypot(a.root.position.x - hit.x, a.root.position.z - hit.z); if (d < bd) { bd = d; best = a.ent; } }
    return { x, y, inside: x >= 0 && y >= 0 && x < COLS && y < ROWS, world: hit, ally: best };
  }
  tileScreen(x, y) { // for tests/accessibility: CSS px centre of tile
    const v = toWorld(x + 0.5, y + 0.5).setY(TILE_TOP).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this.w, y: (-v.y * 0.5 + 0.5) * this.h };
  }

  // ------------------------------------------------------------------ overlays
  updatePath() {
    const p = this.sim.path; const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1);
    let n = 0, l = 0;
    if (p) for (let i = 0; i < p.length - 1; i++) {
      const a = toWorld(p[i].x + 0.5, p[i].y + 0.5), b = toWorld(p[i + 1].x + 0.5, p[i + 1].y + 0.5);
      const ang = Math.atan2(-(b.z - a.z), b.x - a.x);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang);
      m.compose(a.clone().lerp(b, 0.5).setY(TILE_TOP + 0.012), q, sc); this.pathLine.setMatrixAt(l++, m);
      if (i % 2 === 0) { m.compose(a.clone().lerp(b, 0.5).setY(TILE_TOP + 0.015), q, sc); this.chevrons.setMatrixAt(n++, m); }
    }
    this.chevrons.count = n; this.pathLine.count = l;
    this.chevrons.instanceMatrix.needsUpdate = this.pathLine.instanceMatrix.needsUpdate = true;
  }
  showValid(tiles) {
    const m = new THREE.Matrix4(); let n = 0;
    for (const [x, y] of tiles || []) { m.makeTranslation(x - COLS / 2 + 0.5, 0, y - ROWS / 2 + 0.5); this.validTiles.setMatrixAt(n++, m); }
    this.validTiles.count = n; this.validTiles.instanceMatrix.needsUpdate = true;
  }
  showHover(tile, ok, range) {
    if (!tile) { this.hoverTile.visible = this.rangeRing.visible = this.rangeDisc.visible = false; return; }
    const p = toWorld(tile.x + 0.5, tile.y + 0.5);
    this.hoverTile.position.x = p.x; this.hoverTile.position.z = p.z; this.hoverTile.visible = true;
    this.hoverTile.material.color.set(ok ? '#3cff9a' : '#ff4a5a');
    this.showRange(p, range, ok ? '#9ff4ff' : '#ff8a96');
  }
  showRange(p, r, color = '#9ff4ff') {
    const on = !!r;
    this.rangeRing.visible = this.rangeDisc.visible = on;
    if (!on) return;
    for (const m of [this.rangeRing, this.rangeDisc]) { m.position.x = p.x; m.position.z = p.z; m.scale.setScalar(r); }
    this.rangeRing.material.color.set(color);
  }
  select(ent) { this.selected = ent; if (!ent) { this.selRing.visible = false; this.showRange(null, 0); } }

  // ------------------------------------------------------------------ actors
  async addActor(ent) {
    const rec = { ent, root: null, pending: true };
    this.actors.set(ent.uid, rec);
    const a = await this.lib.instance(ent.id);
    if (!this.actors.has(ent.uid)) return;
    Object.assign(rec, a, { pending: false });
    const sc = ent.side === 'enemy' ? (ent.boss ? 1.05 : 1.15) : ent.kind === 'tower' ? 1.2 : 1.35;
    a.root.scale.setScalar(sc);
    const p = toWorld(ent.x, ent.y); a.root.position.set(p.x, TILE_TOP, p.z);
    a.root.rotation.y = ent.side === 'enemy' ? Math.PI / 2 : 0;
    a.loop(ent.side === 'enemy' ? 'move' : 'idle');
    a.mixer.setTime(Math.random() * 2);
    this.scene.add(a.root);
    if (ent.side === 'ally') { this.fx.pillar(p, ent.def.color || '#3ce5ff', 5, 0.42, 0.6); this.fx.ring(p, ent.def.color || '#3ce5ff', 0.2, 1.1, 0.5); this.particles.burst(p.clone().setY(0.4), ent.def.color, 22, 2.2, 0.2, 0.6, 2); }
  }
  removeActor(uid, delay = 0) {
    const a = this.actors.get(uid); if (!a) return;
    a.removeAt = this.time + delay; a.dying = true;
  }
  update(dt) {
    const sdt = this.hooks.step(dt) ?? dt; // sim stepping (scaled by speed) happens in hooks
    this.time += dt;
    this.consume(this.sim.drain());
    // actors
    const camQ = this.camera.quaternion;
    let bars = 0; const m = new THREE.Matrix4(), col = new THREE.Color(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
    for (const [uid, a] of this.actors) {
      if (a.pending) continue;
      if (a.dying && this.time >= a.removeAt) { this.scene.remove(a.root); a.mixer.stopAllAction(); this.actors.delete(uid); continue; }
      a.mixer.update(sdt);
      const e = a.ent;
      if (!a.dying && !e.alive) { a.once?.('die'); this.removeActor(uid, 1.0); }
      if (!a.dying) {
        const p = toWorld(e.x, e.y);
        a.root.position.x += (p.x - a.root.position.x) * Math.min(1, dt * 18);
        a.root.position.z += (p.z - a.root.position.z) * Math.min(1, dt * 18);
        const yawNode = e.kind === 'tower' ? a.nodes.turret : a.root;
        if (yawNode) { const cur = yawNode.rotation.y; let d = e.facing - cur; d = Math.atan2(Math.sin(d), Math.cos(d)); yawNode.rotation.y = cur + d * Math.min(1, dt * (e.kind === 'tower' ? 10 : 8)); }
        if (e.side === 'enemy') a.loop(e.moving === false ? 'idle' : 'move');
        // health bar
        if (bars < this.barBg.count + 140 && (e.hp < e.maxHp || e.side === 'ally' || e.boss)) {
          const top = (e.boss ? 3.0 : e.side === 'enemy' ? 1.1 : e.kind === 'tower' ? 1.25 : (e.def.skinned ? 1.6 : 1.45)) * a.root.scale.x;
          pos.set(a.root.position.x, a.root.position.y + top, a.root.position.z);
          const wdt = e.boss ? 1.6 : 0.7, frac = Math.max(0, e.hp / e.maxHp);
          sc.set(wdt + 0.06, 0.13, 1); m.compose(pos, camQ, sc); this.barBg.setMatrixAt(bars, m);
          const off = new THREE.Vector3(-(wdt * (1 - frac)) / 2, 0, 0.001).applyQuaternion(camQ);
          sc.set(wdt * frac, 0.08, 1); m.compose(pos.clone().add(off), camQ, sc); this.barFg.setMatrixAt(bars, m);
          col.set(e.side === 'enemy' ? '#ff3b4e' : e.shield > 1 ? '#5fb8ff' : '#45f08a'); this.barFg.setColorAt(bars, col);
          bars++;
        }
      }
    }
    this.barBg.count = this.barFg.count = bars;
    this.barBg.instanceMatrix.needsUpdate = this.barFg.instanceMatrix.needsUpdate = true; if (this.barFg.instanceColor) this.barFg.instanceColor.needsUpdate = true;
    for (const p of this.props || []) p.mixer.update(dt);
    if (this.selected?.alive) { const a = this.actors.get(this.selected.uid); if (a?.root) { this.selRing.visible = true; this.selRing.position.set(a.root.position.x, TILE_TOP + 0.02, a.root.position.z); this.selRing.rotation.y += dt; this.showRange(a.root.position, this.selected.range, '#ffd36e'); } }
    else if (this.selected) this.select(null);
    this.proj.sync(this.sim.shots, toWorld);
    this.particles.update(dt); this.fx.update(dt);
    this.chevrons.material.opacity = 0.55 + Math.sin(this.time * 4) * 0.3;
    this.coreLight.intensity = 5 + Math.sin(this.time * 3) * 1.5;
    // camera shake (position only; projection untouched → no bending)
    this.shake = Math.max(0, this.shake - dt * 2.5);
    if (this.basePos) this.camera.position.set(this.basePos.x + Math.sin(this.time * 47) * this.shake * 0.08, this.basePos.y + Math.cos(this.time * 41) * this.shake * 0.06, this.basePos.z);
  }

  // ------------------------------------------------------------------ sim events → visuals/audio
  muzzle(ent) {
    const a = this.actors.get(ent.uid);
    const node = a?.nodes?.muzzle;
    if (node) { const v = new THREE.Vector3(); node.getWorldPosition(v); return v; }
    return toWorld(ent.x, ent.y).setY(0.8);
  }
  hitPoint(ent) { const p = toWorld(ent.x, ent.y); p.y = ent.flying ? 0.95 : ent.boss ? 1.6 : 0.5; return p; }
  consume(events) {
    for (const ev of events) {
      this.hooks.onEvent?.(ev);
      switch (ev.type) {
        case 'deploy': this.addActor(ev.ally); if (ev.ally.kind === 'tower') this.updatePath(); break;
        case 'spawn': this.addActor(ev.enemy); break;
        case 'fire': {
          const a = this.actors.get(ev.ally.uid); a?.once?.('fire');
          const from = this.muzzle(ev.ally), color = ev.ally.def.color;
          if (ev.kind === 'heal' || ev.kind === 'repair' || ev.kind === 'shield') {
            this.fx.ring(toWorld(ev.ally.x, ev.ally.y), color, 0.3, ev.ally.range, 0.7);
            for (const t of ev.targets.slice(0, 6)) { const p = this.hitPoint(t); this.particles.burst(p, color, 5, 0.6, 0.18, 0.7, 1.5, -0.5); }
          } else if (ev.kind === 'chain') {
            let prev = from; for (const t of ev.targets) { const p = this.hitPoint(t); this.fx.lightning(prev, p, color); this.particles.burst(p, color, 6, 1.4, 0.16, 0.3); prev = p; }
          } else if (ev.kind === 'beam' || ev.kind === 'rail') {
            const p = this.hitPoint(ev.target);
            this.fx.beam(from, p, color, ev.kind === 'rail' ? 0.05 : 0.04, ev.kind === 'rail' ? 0.25 : 0.12); this.fx.beam(from, p, '#ffffff', 0.014, 0.1);
            this.fx.flash(p, color, 0.25, 0.15); this.particles.burst(p, color, 6, 1.5, 0.14, 0.3);
          } else if (ev.kind === 'cryo') {
            const p = this.hitPoint(ev.target); this.fx.beam(from, p, '#bff8ff', 0.07, 0.22);
            this.particles.burst(p, '#c8fbff', 12, 1.2, 0.2, 0.6, 1, 1); this.fx.ring(p, '#9ff4ff', 0.1, 0.6, 0.35);
          } else if (ev.kind === 'flame') {
            const p = this.hitPoint(ev.target);
            for (let i = 0; i < 6; i++) { const q = from.clone().lerp(p, i / 6); this.particles.burst(q, i < 3 ? '#ffd36e' : '#ff6a2a', 2, 0.6, 0.26, 0.3, 0.8, -1); }
          } else { this.fx.flash(from, color, 0.16, 0.08); }
          break;
        }
        case 'efire': {
          const a = this.actors.get(ev.enemy.uid); a?.once?.('fire');
          const from = this.muzzle(ev.enemy), p = this.hitPoint(ev.target);
          if (ev.enemy.def.enemy.range > 1) { this.fx.beam(from, p, ev.enemy.boss ? '#ff5a3a' : '#ff3b4e', ev.enemy.boss ? 0.08 : 0.03, 0.12); }
          this.particles.burst(p, '#ff6a4a', ev.enemy.boss ? 18 : 4, 1.6, 0.18, 0.35);
          if (ev.enemy.boss) { this.fx.ring(p, '#ff5a3a', 0.2, 1.2, 0.4); this.shake = Math.max(this.shake, 0.5); }
          break;
        }
        case 'impact': {
          const s = ev.shot, p = toWorld(s.tx, s.ty); p.y = s.flying ? 0.9 : 0.35;
          if (s.splash) { this.fx.flash(p, '#ffb45a', s.splash * 0.9, 0.3); this.fx.ring(p, s.src?.def?.color || '#ff8a2a', 0.2, s.splash * 1.3, 0.45); this.particles.burst(p, '#ffb45a', 18, 2.6, 0.26, 0.5, 2.2); this.particles.burst(p, '#ff5a2a', 10, 1.6, 0.34, 0.7, 1.5); if (s.kind === 'mortar') this.shake = Math.max(this.shake, 0.25); }
          else { this.fx.flash(p, s.src?.def?.color || '#3ce5ff', 0.18, 0.12); this.particles.burst(p, s.src?.def?.color || '#3ce5ff', 5, 1.4, 0.14, 0.25); }
          break;
        }
        case 'hit': { if (ev.target.side === 'ally' && Math.random() < 0.4) this.actors.get(ev.target.uid)?.once?.('hit'); break; }
        case 'death': {
          const t = ev.target, a = this.actors.get(t.uid), p = this.hitPoint(t);
          if (ev.cause === 'recall') { this.fx.pillar(p, '#9ff4ff', 4, 0.35, 0.5); this.removeActor(t.uid, 0.05); break; }
          a?.once?.('die');
          this.particles.burst(p, t.side === 'enemy' ? '#ff7a3a' : '#9ff4ff', t.boss ? 60 : 16, t.boss ? 4 : 2.4, t.boss ? 0.4 : 0.22, 0.7, 2.5);
          this.fx.flash(p, t.side === 'enemy' ? '#ff9a4a' : '#9ff4ff', t.boss ? 1.6 : 0.5, 0.3);
          if (t.boss) { this.fx.ring(p, '#ff5a3a', 0.4, 3, 0.8); this.shake = 1.4; }
          this.removeActor(t.uid, 1.2);
          if (t.kind === 'tower') this.updatePath();
          break;
        }
        case 'leak': { this.removeActor(ev.enemy.uid, 0); const p = this.core?.root.position || toWorld(EXIT.x, EXIT.y); this.fx.flash(p.clone().setY(1.2), '#ff3b4e', 1.4, 0.4); this.fx.ring(p, '#ff3b4e', 0.4, 2.2, 0.6); this.core?.once?.('hit'); this.shake = Math.max(this.shake, 0.6); break; }
        case 'ult': {
          if (ev.kind === 'lance') {
            const z = toWorld(0, ev.y).z, a = new THREE.Vector3(-COLS / 2, 0.7, z), b = new THREE.Vector3(COLS / 2, 0.7, z);
            this.fx.beam(a, b, '#d78bff', 0.4, 0.8); this.fx.beam(a, b, '#ffffff', 0.12, 0.7);
            for (let x = -COLS / 2; x < COLS / 2; x += 0.7) this.particles.burst(new THREE.Vector3(x, 0.7, z), '#e3a8ff', 3, 1.5, 0.3, 0.6, 1.5);
          } else {
            const c = toWorld(ev.x, ev.y);
            for (let i = 0; i < 6; i++) { const p = c.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2.4, 0, (Math.random() - 0.5) * 2.4)); setTimeout(() => { this.fx.pillar(p, '#7fe9ff', 14, 0.3, 0.5); this.fx.ring(p, '#3ce5ff', 0.2, 1.3, 0.5); this.particles.burst(p.clone().setY(0.3), '#bff8ff', 18, 3, 0.3, 0.6, 2.5); this.shake = 0.9; }, i * 110); }
          }
          this.shake = Math.max(this.shake, 1);
          break;
        }
        case 'upgrade': { const p = toWorld(ev.ally.x, ev.ally.y); this.fx.pillar(p, '#ffd36e', 3, 0.5, 0.6); this.particles.burst(p.clone().setY(0.5), '#ffd36e', 30, 2, 0.22, 0.8, 2.5); break; }
        case 'deny': if (ev.x !== undefined) { const p = toWorld(ev.x + 0.5, ev.y + 0.5); this.fx.ring(p, '#ff4a5a', 0.2, 0.6, 0.3); } break;
      }
    }
  }
  onQuality(q) { this.key.castShadow = q !== 'low'; }
  dispose() { this.scene.traverse((o) => { if (o.isInstancedMesh) o.dispose(); }); }
}
