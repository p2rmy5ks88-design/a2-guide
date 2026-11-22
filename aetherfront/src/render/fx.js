// Pooled VFX: additive particles, beams, lightning, projectiles, shock rings, light pillars.
import * as THREE from 'three';

const additive = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,.75)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export const GLOW_TEX = glowTexture();

export class Particles {
  constructor(scene, max = 900) {
    this.max = max; this.n = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.size = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max); this.baseSize = new Float32Array(max); this.grav = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.ShaderMaterial({
      uniforms: { map: { value: GLOW_TEX }, scale: { value: 400 } },
      vertexShader: 'uniform float scale; attribute float size; varying vec3 vC; void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=size*scale/-mv.z; gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform sampler2D map; varying vec3 vC; void main(){ vec4 t=texture2D(map,gl_PointCoord); gl_FragColor=vec4(vC*t.a*1.6,t.a); }',
      vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, m); this.points.frustumCulled = false; this.points.renderOrder = 5;
    scene.add(this.points);
  }
  setScale(h) { this.points.material.uniforms.scale.value = h * 0.9; }
  burst(p, color, count = 14, speed = 2.2, size = 0.22, life = 0.6, up = 1.2, gravity = 3) {
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const k = this.n % this.max; this.n++;
      this.pos[k * 3] = p.x; this.pos[k * 3 + 1] = p.y; this.pos[k * 3 + 2] = p.z;
      const a = Math.random() * Math.PI * 2, s = speed * (0.35 + Math.random() * 0.75);
      this.vel[k * 3] = Math.cos(a) * s; this.vel[k * 3 + 1] = up * (0.4 + Math.random()); this.vel[k * 3 + 2] = Math.sin(a) * s;
      this.col[k * 3] = c.r; this.col[k * 3 + 1] = c.g; this.col[k * 3 + 2] = c.b;
      this.life[k] = this.maxLife[k] = life * (0.6 + Math.random() * 0.6); this.baseSize[k] = size * (0.6 + Math.random() * 0.8); this.grav[k] = gravity;
    }
  }
  update(dt) {
    for (let k = 0; k < this.max; k++) {
      if (this.life[k] <= 0) { this.size[k] = 0; continue; }
      this.life[k] -= dt;
      const t = Math.max(0, this.life[k] / this.maxLife[k]);
      this.vel[k * 3 + 1] -= this.grav[k] * dt;
      this.pos[k * 3] += this.vel[k * 3] * dt; this.pos[k * 3 + 1] = Math.max(0.12, this.pos[k * 3 + 1] + this.vel[k * 3 + 1] * dt); this.pos[k * 3 + 2] += this.vel[k * 3 + 2] * dt;
      this.vel[k * 3] *= 0.96; this.vel[k * 3 + 2] *= 0.96;
      this.size[k] = this.baseSize[k] * t;
    }
    const g = this.points.geometry; g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.size.needsUpdate = true;
  }
}

// Short-lived meshes (beams, rings, flashes) with fade-out, pooled per type.
export class Transients {
  constructor(scene) {
    this.scene = scene; this.items = []; this.pools = {};
    this.geo = {
      beam: new THREE.CylinderGeometry(1, 1, 1, 6, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5),
      ring: new THREE.RingGeometry(0.82, 1, 40).rotateX(-Math.PI / 2),
      disc: new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2),
      sphere: new THREE.SphereGeometry(1, 14, 10),
      pillar: new THREE.CylinderGeometry(1, 1, 1, 16, 1, true).translate(0, 0.5, 0),
    };
  }
  get(type, color) {
    const pool = (this.pools[type] ||= []);
    let m = pool.pop();
    if (!m) { m = new THREE.Mesh(this.geo[type], additive(color)); m.renderOrder = 6; m.frustumCulled = false; }
    m.material.color.set(color); m.material.opacity = 1; m.visible = true; m.scale.set(1, 1, 1); m.rotation.set(0, 0, 0);
    this.scene.add(m); return m;
  }
  spawn(type, color, life, setup, tick) {
    const m = this.get(type, color); setup(m);
    this.items.push({ m, type, life, max: life, tick });
    return m;
  }
  beam(a, b, color, width = 0.05, life = 0.14) {
    return this.spawn('beam', color, life, (m) => { m.position.copy(a); m.lookAt(b); m.scale.set(width, width, a.distanceTo(b)); }, (m, t) => { m.material.opacity = t; m.scale.x = m.scale.y = width * (0.4 + t); });
  }
  lightning(a, b, color, life = 0.16) {
    const pts = [a.clone()], segs = Math.max(3, Math.round(a.distanceTo(b) * 3));
    for (let i = 1; i < segs; i++) { const p = a.clone().lerp(b, i / segs); p.x += (Math.random() - 0.5) * 0.28; p.y += (Math.random() - 0.5) * 0.28; p.z += (Math.random() - 0.5) * 0.28; pts.push(p); }
    pts.push(b.clone());
    for (let i = 0; i < pts.length - 1; i++) { this.beam(pts[i], pts[i + 1], color, 0.035, life); this.beam(pts[i], pts[i + 1], '#ffffff', 0.012, life * 0.8); }
  }
  ring(p, color, r0 = 0.2, r1 = 1.2, life = 0.45) {
    return this.spawn('ring', color, life, (m) => { m.position.set(p.x, 0.16, p.z); m.scale.setScalar(r0); }, (m, t) => { m.scale.setScalar(r1 + (r0 - r1) * t); m.material.opacity = t; });
  }
  flash(p, color, r = 0.4, life = 0.2) {
    return this.spawn('sphere', color, life, (m) => { m.position.copy(p); m.scale.setScalar(r * 0.4); }, (m, t) => { m.scale.setScalar(r * (1.1 - t * 0.7)); m.material.opacity = t; });
  }
  pillar(p, color, h = 6, r = 0.35, life = 0.7) {
    return this.spawn('pillar', color, life, (m) => { m.position.set(p.x, 0.1, p.z); m.scale.set(r, h, r); }, (m, t) => { m.material.opacity = t * 0.85; m.scale.x = m.scale.z = r * (0.3 + t * 0.7); });
  }
  update(dt) {
    for (const it of this.items) { it.life -= dt; const t = Math.max(0, it.life / it.max); it.tick?.(it.m, t, dt); }
    for (const it of this.items) if (it.life <= 0) { it.m.visible = false; this.scene.remove(it.m); this.pools[it.type].push(it.m); }
    this.items = this.items.filter((i) => i.life > 0);
  }
}

// Projectile meshes that mirror sim shots (incl. ballistic mortar arcs + trails).
export class Projectiles {
  constructor(scene, particles) {
    this.scene = scene; this.particles = particles; this.map = new Map(); this.pool = [];
    this.geo = new THREE.SphereGeometry(1, 10, 8);
    this.halo = new THREE.SpriteMaterial({ map: GLOW_TEX, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  }
  sync(shots, toWorld) {
    const live = new Set(shots);
    for (const [s, m] of this.map) if (!live.has(s)) { m.visible = false; this.scene.remove(m); this.pool.push(m); this.map.delete(s); }
    for (const s of shots) {
      let m = this.map.get(s);
      if (!m) {
        m = this.pool.pop();
        if (!m) { m = new THREE.Mesh(this.geo, additive('#fff')); const sp = new THREE.Sprite(this.halo.clone()); sp.scale.setScalar(5); m.add(sp); m.userData.sp = sp; }
        const col = s.src?.def?.color || '#3ce5ff';
        m.material.color.set(col); m.userData.sp.material.color.set(col);
        m.scale.setScalar(s.kind === 'mortar' ? 0.11 : 0.06); m.visible = true;
        this.scene.add(m); this.map.set(s, m);
      }
      const total = Math.hypot(s.tx - s.from.x, s.ty - s.from.y) || 1, done = Math.min(1, Math.hypot(s.x - s.from.x, s.y - s.from.y) / total);
      const p = toWorld(s.x, s.y);
      const h0 = 0.75, h1 = s.flying ? 0.9 : 0.45;
      p.y = h0 + (h1 - h0) * done + (s.kind === 'mortar' ? Math.sin(done * Math.PI) * Math.min(2.6, total * 0.6) : 0);
      m.position.copy(p);
      if (Math.random() < 0.5) this.particles.burst(p, m.material.color, 1, 0.15, s.kind === 'mortar' ? 0.32 : 0.16, 0.25, 0.1, 0);
    }
  }
}
