// Web Audio sound system: buses (master → compressor → out; sfx / ui), iOS unlock on first touch,
// lazy decode + cache, per-sound voice limits and retrigger throttling to stop stacking/clipping.
export class Audio {
  constructor(manifest, settings) {
    this.m = manifest; this.settings = settings; this.ctx = null; this.buffers = new Map(); this.loading = new Map();
    this.voices = new Map(); this.last = new Map(); this.total = 0; this.unlocked = false;
  }
  unlock() {
    if (this.unlocked) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC();
      this.comp = this.ctx.createDynamicsCompressor();
      Object.assign(this.comp, {}); this.comp.threshold.value = -16; this.comp.ratio.value = 6; this.comp.attack.value = 0.004; this.comp.release.value = 0.18;
      this.master = this.ctx.createGain(); this.sfx = this.ctx.createGain(); this.ui = this.ctx.createGain();
      this.sfx.gain.value = 0.55; this.ui.gain.value = 0.7;
      this.sfx.connect(this.master); this.ui.connect(this.master); this.master.connect(this.comp); this.comp.connect(this.ctx.destination);
      // iOS: play a silent buffer inside the gesture
      const b = this.ctx.createBuffer(1, 1, 22050), s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this.ctx.destination); s.start(0);
      this.ctx.resume?.();
      this.unlocked = true; this.apply();
      this.preload([...Object.values(this.m.uiSounds).map((x) => x.file)]);
    } catch { this.ctx = null; }
  }
  apply() { if (this.master) this.master.gain.value = this.settings().muted ? 0 : this.settings().volume ?? 0.8; }
  fileFor(id) { return this.m.byId[id]?.audio?.file || this.m.uiSounds[id]?.file; }
  preload(files) { for (const f of files) this.load(f); }
  load(file) {
    if (!this.ctx || !file) return Promise.resolve(null);
    if (this.buffers.has(file)) return Promise.resolve(this.buffers.get(file));
    if (!this.loading.has(file)) this.loading.set(file, fetch(file).then((r) => r.arrayBuffer()).then((ab) => new Promise((res, rej) => this.ctx.decodeAudioData(ab, res, rej))).then((buf) => { this.buffers.set(file, buf); return buf; }).catch(() => null));
    return this.loading.get(file);
  }
  play(id, { bus = 'sfx', volume = 1, rate = 1, maxVoices = 3, minGap = 0.06 } = {}) {
    if (!this.ctx || this.settings().muted) return;
    const file = this.fileFor(id); if (!file) return;
    const now = this.ctx.currentTime;
    if (now - (this.last.get(id) || -1) < minGap) return;
    if ((this.voices.get(id) || 0) >= maxVoices || this.total >= 18) return;
    const buf = this.buffers.get(file);
    if (!buf) { this.load(file); return; }
    const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
    src.buffer = buf; src.playbackRate.value = rate * (0.96 + Math.random() * 0.08); g.gain.value = volume;
    src.connect(g); g.connect(bus === 'ui' ? this.ui : this.sfx);
    this.last.set(id, now); this.voices.set(id, (this.voices.get(id) || 0) + 1); this.total++;
    src.onended = () => { this.voices.set(id, this.voices.get(id) - 1); this.total--; g.disconnect(); };
    src.start();
  }
  ui_(name) { this.play(name, { bus: 'ui', maxVoices: 2, minGap: 0.04 }); }
}
