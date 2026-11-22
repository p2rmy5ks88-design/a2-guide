// Graceful fallback when WebGL is unavailable: top-down Canvas 2D view of the SAME simulation.
import { COLS, ROWS, ENTRY, EXIT, OBSTACLES } from '../data.js';

export class Fallback2D {
  constructor(host, sim, byId, hooks) {
    this.sim = sim; this.byId = byId; this.hooks = hooks; this.flashes = [];
    this.canvas = document.createElement('canvas'); this.canvas.className = 'gl-canvas'; host.prepend(this.canvas);
    this.ctx = this.canvas.getContext('2d'); this.imgs = {};
    for (const u of Object.values(byId)) if (u.portrait) { const i = new Image(); i.src = u.portrait; this.imgs[u.id] = i; }
    this.safe = { top: 60, bottom: 130, left: 0, right: 0 };
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(host); this.host = host; this.resize();
    this.last = performance.now(); this.running = true;
    const loop = (t) => { if (!this.running) return; const dt = Math.min(0.1, (t - this.last) / 1000); this.last = t; this.update(dt); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  setSafeArea(s) { this.safe = s; this.resize(); }
  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
    this.canvas.width = w * dpr; this.canvas.height = h * dpr; this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    const S = this.safe, aw = w - S.left - S.right - 40, ah = h - S.top - S.bottom - 10;
    this.cell = Math.min(aw / (COLS + 2), ah / ROWS);
    this.ox = S.left + (w - S.left - S.right - this.cell * COLS) / 2; this.oy = S.top + (ah - this.cell * ROWS) / 2 + 5;
    this.w = w; this.h = h; this.dpr = dpr;
  }
  pick(cx, cy, rect) {
    const x = Math.floor((cx - rect.left - this.ox) / this.cell), y = Math.floor((cy - rect.top - this.oy) / this.cell);
    const ally = this.sim.allies.find((a) => Math.hypot(a.x - (cx - rect.left - this.ox) / this.cell, a.y - (cy - rect.top - this.oy) / this.cell) < 0.55);
    return { x, y, inside: x >= 0 && y >= 0 && x < COLS && y < ROWS, ally };
  }
  tileScreen(x, y) { return { x: this.ox + (x + 0.5) * this.cell, y: this.oy + (y + 0.5) * this.cell }; }
  showValid(t) { this.valid = t; } showHover(t, ok) { this.hover = t ? { ...t, ok } : null; } select(e) { this.selected = e; } updatePath() {}
  update(dt) {
    this.hooks.step(dt);
    for (const ev of this.sim.drain()) { this.hooks.onEvent?.(ev); if (ev.type === 'fire' && ev.target) this.flashes.push({ a: ev.ally, b: ev.target, c: ev.ally.def.color, t: 0.12 }); }
    const c = this.ctx, C = this.cell; c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, this.h); g.addColorStop(0, '#141a3d'); g.addColorStop(1, '#0b0f24'); c.fillStyle = g; c.fillRect(0, 0, this.w, this.h);
    c.save(); c.translate(this.ox, this.oy);
    c.fillStyle = '#2a3552'; c.fillRect(-8, -8, COLS * C + 16, ROWS * C + 16);
    for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) { c.fillStyle = (x + y) % 2 ? '#46526e' : '#3f4a66'; c.fillRect(x * C + 1, y * C + 1, C - 2, C - 2); }
    for (const [x, y] of this.valid || []) { c.fillStyle = 'rgba(60,229,255,.15)'; c.fillRect(x * C + 2, y * C + 2, C - 4, C - 4); }
    c.strokeStyle = 'rgba(60,229,255,.7)'; c.lineWidth = 2; c.setLineDash([6, 8]); c.beginPath();
    (this.sim.path || []).forEach((p, i) => (i ? c.lineTo : c.moveTo).call(c, (p.x + 0.5) * C, (p.y + 0.5) * C)); c.stroke(); c.setLineDash([]);
    for (const [x, y] of OBSTACLES) { c.fillStyle = '#2e3a52'; c.fillRect(x * C + 3, y * C + 3, C - 6, C - 6); c.strokeStyle = '#3ce5ff'; c.strokeRect(x * C + 6, y * C + 6, C - 12, C - 12); }
    c.fillStyle = '#3ce5ff'; c.beginPath(); c.arc((ENTRY.x - 0.3) * C, (ENTRY.y + 0.5) * C, C * 0.45, 0, 7); c.fill();
    c.beginPath(); c.arc((EXIT.x + 1.4) * C, (EXIT.y + 0.5) * C, C * 0.6, 0, 7); c.fill();
    const draw = (e, r) => { const img = this.imgs[e.id]; if (img?.complete) c.drawImage(img, (e.x - r) * C, (e.y - r * 1.2) * C, r * 2 * C, r * 2.4 * C); const f = e.hp / e.maxHp; c.fillStyle = '#000a'; c.fillRect((e.x - 0.35) * C, (e.y - 0.62) * C, 0.7 * C, 5); c.fillStyle = e.side === 'enemy' ? '#ff3b4e' : '#45f08a'; c.fillRect((e.x - 0.35) * C, (e.y - 0.62) * C, 0.7 * C * f, 5); };
    for (const a of this.sim.allies) draw(a, 0.45);
    for (const e of this.sim.enemies) draw(e, e.boss ? 0.8 : 0.38);
    for (const s of this.sim.shots) { c.fillStyle = s.src?.def?.color || '#fff'; c.beginPath(); c.arc(s.x * C, s.y * C, 4, 0, 7); c.fill(); }
    for (const f of this.flashes) { f.t -= dt; c.strokeStyle = f.c; c.lineWidth = 3; c.beginPath(); c.moveTo(f.a.x * C, f.a.y * C); c.lineTo(f.b.x * C, f.b.y * C); c.stroke(); }
    this.flashes = this.flashes.filter((f) => f.t > 0);
    if (this.hover) { c.strokeStyle = this.hover.ok ? '#3cff9a' : '#ff4a5a'; c.lineWidth = 3; c.strokeRect(this.hover.x * C + 2, this.hover.y * C + 2, C - 4, C - 4); }
    if (this.selected?.alive) { c.strokeStyle = '#ffd36e'; c.beginPath(); c.arc(this.selected.x * C, this.selected.y * C, this.selected.range * C, 0, 7); c.stroke(); }
    c.restore();
  }
  dispose() { this.running = false; this.ro.disconnect(); this.canvas.remove(); }
}
