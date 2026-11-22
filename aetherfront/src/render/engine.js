// Shared WebGL engine: ONE renderer/canvas reused by Home diorama and Battle (iOS context limits).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// Aetherfront: decode textures via <img> (blob: img-src) instead of fetch(blob:) — works under strict CSP hosts.
globalThis.__AF_IMG_TEXTURES = true;
export const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));

export function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

export class Engine {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'gl-canvas';
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.maxDpr = isMobile ? 2 : 2;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.view = null; this.host = null; this.clock = new THREE.Clock(); this.running = false;
    this.frameTimes = []; this.quality = 'high'; this.stats = { fps: 0, frames: 0, drawCalls: 0, triangles: 0 };
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; });
    this.canvas.addEventListener('webglcontextrestored', () => { this.lost = false; });
  }
  attach(host, view) {
    if (this.host) this.resizeObserver.unobserve(this.host);
    this.host = host; this.view = view;
    host.prepend(this.canvas);
    this.resizeObserver.observe(host);
    this.resize();
    if (!this.running) { this.running = true; this.clock.getDelta(); this.renderer.setAnimationLoop(() => this.tick()); }
  }
  detach() { this.view = null; this.running = false; this.renderer.setAnimationLoop(null); this.canvas.remove(); }
  resize() {
    if (!this.host) return;
    const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.w = w; this.h = h;
    this.view?.resize?.(w, h);
  }
  tick() {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    if (!this.view || this.lost) return;
    this.view.update(dt);
    this.renderer.render(this.view.scene, this.view.camera);
    const info = this.renderer.info.render;
    this.stats.drawCalls = info.calls; this.stats.triangles = info.triangles; this.stats.frames++;
    this.adapt(dt);
  }
  // Adaptive quality: drop DPR, then shadows, if the device can't hold ~45fps.
  adapt(dt) {
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 90) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    this.stats.fps = Math.round(1 / avg);
    if (this.forcedQuality) return;
    if (avg > 1 / 42) {
      if (this.dpr > 1.25) { this.dpr = Math.max(1, this.dpr - 0.35); this.resize(); }
      else if (this.renderer.shadowMap.enabled) { this.renderer.shadowMap.enabled = false; this.quality = 'low'; this.view?.onQuality?.('low'); }
    } else if (avg < 1 / 58 && this.dpr < Math.min(window.devicePixelRatio || 1, this.maxDpr)) { this.dpr = Math.min(this.maxDpr, this.dpr + 0.25); this.resize(); }
  }
  setQuality(q) {
    this.forcedQuality = q !== 'auto';
    if (q === 'low') { this.dpr = 1; this.renderer.shadowMap.enabled = false; }
    else if (q === 'high') { this.dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr); this.renderer.shadowMap.enabled = true; }
    this.quality = q; this.resize(); this.view?.onQuality?.(q);
  }
}

// ------------------------------------------------------------------ model library
export class ModelLibrary {
  constructor(byId) { this.byId = byId; this.loader = new GLTFLoader(); MeshoptDecoder.ready.then(() => this.loader.setMeshoptDecoder(MeshoptDecoder)).catch((e) => console.warn('[aetherfront] meshopt decoder unavailable', e)); this.decoderReady = MeshoptDecoder.ready.catch(() => null); this.cache = new Map(); }
  load(id) {
    if (!this.cache.has(id)) {
      const rec = this.byId[id];
      this.cache.set(id, this.decoderReady.then(() => this.fetchModel(rec.model)).catch((e) => { console.warn('[aetherfront] model failed', rec.model, e?.message); return this.fetchModel(rec.forge_model || rec.starter_model); }).catch(() => this.fetchModel(rec.starter_model)).then((g) => {
        g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = !o.material.name?.includes('Glow'); o.receiveShadow = false; if (o.isSkinnedMesh) o.frustumCulled = false; if (o.material.isMeshStandardMaterial) o.material.envMapIntensity = 0.85; } });
        return g;
      }));
    }
    return this.cache.get(id);
  }
  // Loads .glb normally; embedded-glTF .json (preview hosts) is repacked into GLB in memory so no data: URI fetch is needed.
  async fetchModel(url) {
    if (!url.endsWith('.json')) return this.loader.loadAsync(url);
    const json = await (await fetch(url)).json();
    let bin = null;
    const uri = json.buffers?.[0]?.uri;
    if (uri?.startsWith('data:')) {
      const b64 = uri.slice(uri.indexOf(',') + 1), raw = atob(b64);
      bin = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) bin[i] = raw.charCodeAt(i);
      delete json.buffers[0].uri;
    }
    const enc = new TextEncoder().encode(JSON.stringify(json));
    const jlen = (enc.length + 3) & ~3, blen = bin ? (bin.length + 3) & ~3 : 0;
    const out = new Uint8Array(12 + 8 + jlen + (bin ? 8 + blen : 0)); const dv = new DataView(out.buffer);
    dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, out.length, true);
    dv.setUint32(12, jlen, true); dv.setUint32(16, 0x4e4f534a, true); out.fill(0x20, 20, 20 + jlen); out.set(enc, 20);
    if (bin) { const o = 20 + jlen; dv.setUint32(o, blen, true); dv.setUint32(o + 4, 0x004e4942, true); out.set(bin, o + 8); }
    return this.loader.parseAsync(out.buffer, url.slice(0, url.lastIndexOf('/') + 1));
  }
  preload(ids, onProgress) { let n = 0; return Promise.all(ids.map((id) => this.load(id).then((g) => { onProgress?.(++n / ids.length); return g; }))); }
  /** Returns an actor wrapper: {root, mixer, play(name), node(name)} */
  async instance(id) {
    const g = await this.load(id);
    const scene = skeletonClone(g.scene);
    const root = new THREE.Group(); root.add(scene); root.name = 'actor:' + id;
    const mixer = new THREE.AnimationMixer(scene);
    const actions = {};
    for (const clip of g.animations) actions[clip.name] = mixer.clipAction(clip);
    const nodes = {}; scene.traverse((o) => { if (o.name) nodes[o.name] = nodes[o.name] || o; });
    const actor = {
      id, root, mixer, actions, nodes, base: null,
      loop(name, fade = 0.2) {
        const a = actions[name]; if (!a || actor.base === a) return;
        a.reset().setLoop(THREE.LoopRepeat, Infinity).setEffectiveWeight(1).fadeIn(fade).play();
        actor.base?.fadeOut(fade); actor.base = a;
      },
      once(name) {
        const a = actions[name]; if (!a) return;
        a.reset().setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = name === 'die'; a.setEffectiveWeight(name === 'die' ? 1 : 1.4).play();
        if (name === 'die') { for (const k in actions) if (k !== 'die') actions[k].fadeOut(0.1); }
      },
    };
    return actor;
  }
}
