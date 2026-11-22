// Home screen 3D diorama: floating fortress island with the Aether core, real GLB actors (idle loops).
import * as THREE from 'three';
import { Particles, GLOW_TEX } from './fx.js';

export class HomeView {
  constructor(engine, lib, heroIds) {
    this.engine = engine; this.lib = lib; this.time = 0; this.actors = [];
    const s = (this.scene = new THREE.Scene());
    s.background = null; s.environment = engine.envMap;
    s.fog = new THREE.Fog('#2a2266', 14, 34);
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    s.add(new THREE.HemisphereLight('#a8b8ff', '#3a1a5a', 1.3));
    const key = new THREE.DirectionalLight('#ffe2c0', 2.4); key.position.set(4, 9, 6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); s.add(key);
    const rim = new THREE.DirectionalLight('#ff5fe0', 1.4); rim.position.set(-6, 3, -6); s.add(rim);
    const core = new THREE.PointLight('#3ce5ff', 10, 8, 1.5); core.position.set(0, 2.2, 0); s.add(core); this.coreLight = core;
    this.island = new THREE.Group(); s.add(this.island);
    this.buildIsland();
    this.particles = new Particles(s, 300);
    this.ready = this.populate(heroIds);
  }
  buildIsland() {
    const g = this.island;
    const rock = new THREE.MeshStandardMaterial({ color: '#2b2f4a', roughness: 0.85, metalness: 0.1, flatShading: true });
    const grass = new THREE.MeshStandardMaterial({ color: '#4c8a5a', roughness: 0.9 });
    const stone = new THREE.MeshStandardMaterial({ color: '#4a5572', roughness: 0.6, metalness: 0.3 });
    const gold = new THREE.MeshStandardMaterial({ color: '#d9a443', metalness: 0.95, roughness: 0.25 });
    const glow = new THREE.MeshBasicMaterial({ color: '#ffb347', toneMapped: false });
    const cyan = new THREE.MeshBasicMaterial({ color: '#3ce5ff', toneMapped: false, transparent: true, opacity: 0.75 });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.4, 0.5, 8), grass); top.position.y = -0.25; top.receiveShadow = true; g.add(top);
    const under = new THREE.Mesh(new THREE.ConeGeometry(3.4, 4.2, 8, 3), rock); under.rotation.x = Math.PI; under.position.y = -2.6; g.add(under);
    const pz = under.geometry.attributes.position; for (let i = 0; i < pz.count; i++) { pz.setX(i, pz.getX(i) * (0.85 + Math.random() * 0.3)); pz.setZ(i, pz.getZ(i) * (0.85 + Math.random() * 0.3)); } under.geometry.computeVertexNormals();
    // stone plaza + walls
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.1, 0.16, 8), stone); plaza.position.y = 0.06; plaza.receiveShadow = true; g.add(plaza);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8; if (i === 1 || i === 2) continue;
      const w = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.55, 0.4), stone); w.position.set(Math.sin(a) * 3.25, 0.25, Math.cos(a) * 3.25); w.rotation.y = a; w.castShadow = true; g.add(w);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 0.02), glow); strip.position.set(Math.sin(a) * 3.46, 0.26, Math.cos(a) * 3.46); strip.rotation.y = a; g.add(strip);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.06, 0.44), gold); cap.position.set(Math.sin(a) * 3.25, 0.54, Math.cos(a) * 3.25); cap.rotation.y = a; g.add(cap);
    }
    // ramp/bridge toward the camera
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 2.6), stone); ramp.position.set(0, 0.0, 3.4); g.add(ramp);
    for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 2.4), cyan); r.position.set(s * 0.5, 0.08, 3.4); g.add(r); }
    // waterfalls of light
    for (const [x, z] of [[-2.2, 2.4], [2.4, 2.1]]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 3.2), cyan); f.position.set(x, -1.6, z); f.lookAt(x * 2, -1.6, z * 2); g.add(f); }
    // trees
    const leaf = new THREE.MeshStandardMaterial({ color: '#d35af0', emissive: '#6d1d90', emissiveIntensity: 0.6, roughness: 0.8, flatShading: true });
    const trunk = new THREE.MeshStandardMaterial({ color: '#4a3040' });
    for (const [x, z, s] of [[-2.6, -1.0, 1], [2.7, -0.6, 0.9], [-1.8, -2.4, 0.8], [2.0, -2.3, 0.85]]) {
      const t = new THREE.Group(); t.position.set(x, 0, z); t.scale.setScalar(s);
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 1, 6), trunk); tr.position.y = 0.5; t.add(tr);
      for (let k = 0; k < 5; k++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), leaf); l.position.set((Math.random() - 0.5) * 0.8, 1.15 + Math.random() * 0.4, (Math.random() - 0.5) * 0.8); l.castShadow = true; t.add(l); }
      g.add(t);
    }
    // floating rocks + distant spires
    this.floaters = [];
    for (let i = 0; i < 9; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.35, 0), rock); const a = Math.random() * Math.PI * 2; r.position.set(Math.cos(a) * (4.4 + Math.random() * 2), -1 + Math.random() * 2.5, Math.sin(a) * (4.4 + Math.random() * 2) - 1); this.scene.add(r); this.floaters.push(r); }
    const spireMat = new THREE.MeshStandardMaterial({ color: '#2a2850', emissive: '#ff9a4a', emissiveIntensity: 0.05 });
    for (let i = 0; i < 10; i++) { const h = 3 + Math.random() * 5; const sp = new THREE.Mesh(new THREE.BoxGeometry(0.8, h, 0.8), spireMat); sp.position.set(-12 + i * 2.6, -4 + h / 2, -14 - Math.random() * 4); this.scene.add(sp); }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, color: '#3ce5ff', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); halo.scale.setScalar(5); halo.position.set(0, 2.0, 0); g.add(halo);
  }
  async populate(heroIds) {
    const place = async (id, x, z, ry = 0, s = 1) => { const a = await this.lib.instance(id); a.root.position.set(x, 0.14, z); a.root.rotation.y = ry; a.root.scale.setScalar(s); a.loop('idle'); this.island.add(a.root); this.actors.push(a); return a; };
    await Promise.all([
      place('core_reactor', 0, -0.2, 0, 1.15),
      place('nova_mortar', -1.9, 0.6, 0.6, 1.3),
      place('arc_pylon', 1.9, 0.3, 0, 1.3),
      place('quantum_spire', 1.2, -1.7, 0, 1.1),
      place(heroIds[0] || 'aegis_trooper', -0.9, 1.6, 0.25, 1.35),
      place(heroIds[1] || 'sovereign_lyra', 0.9, 1.7, -0.25, 1.35),
    ]);
  }
  setHeroes() { /* squad-driven figures could be swapped here */ }
  resize(w, h) {
    this.camera.aspect = w / h;
    const portrait = h > w;
    this.camera.fov = portrait ? 42 : 30;
    this.camera.position.set(0, portrait ? 5.6 : 5.0, portrait ? 11.5 : 10.5);
    this.camera.lookAt(0, portrait ? -0.3 : 0.2, 0);
    this.camera.updateProjectionMatrix();
    this.particles.setScale(h * this.engine.dpr);
  }
  update(dt) {
    this.time += dt;
    this.island.rotation.y = Math.sin(this.time * 0.15) * 0.25;
    this.island.position.y = Math.sin(this.time * 0.6) * 0.08;
    for (const a of this.actors) a.mixer.update(dt);
    this.floaters.forEach((r, i) => { r.position.y += Math.sin(this.time + i) * 0.002; r.rotation.y += dt * 0.2; });
    if (Math.random() < 0.3) this.particles.burst(new THREE.Vector3((Math.random() - 0.5) * 6, 0.2, (Math.random() - 0.5) * 6), Math.random() < 0.5 ? '#3ce5ff' : '#ff7ae6', 1, 0.1, 0.12, 2.5, 0.5, -0.3);
    this.particles.update(dt);
    this.coreLight.intensity = 9 + Math.sin(this.time * 2) * 2;
  }
}
