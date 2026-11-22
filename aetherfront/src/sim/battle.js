// Pure, deterministic battle simulation (no DOM, no rendering). Renderer/audio consume `events`.
import { COLS, ROWS, MAX_WAVES, ENTRY, EXIT, OBSTACLES, ENERGY_MAX, ENERGY_START, ENERGY_REGEN_SECONDS, FIELD_CAP, CORE_INTEGRITY, waveComposition, waveHpMult, waveDmgMult } from '../data.js';
import { damageAt, hpAt } from '../progression.js';

const key = (x, y) => x + ',' + y;
const inside = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const DIRS = [[1, 0], [0, 1], [0, -1], [-1, 0]];
export const MK_COST = (u, mk) => (50 + u.energy_cost * 25) * mk; // battle alloy for Mk→Mk+1
export const MK_MULT = { dmg: 1.35, hp: 1.25, range: 0.25 };

export class Battle {
  /** @param {object} o {byId, squad:{slots,hero}, levels:{id:level}, matchId} */
  constructor(o) {
    this.byId = o.byId; this.squad = o.squad; this.levels = o.levels; this.matchId = o.matchId || 'm' + Date.now();
    this.obstacles = new Set(OBSTACLES.map(([x, y]) => key(x, y)));
    this.reset();
  }
  reset() {
    Object.assign(this, {
      time: 0, wave: 0, waveActive: false, queue: [], spawnCd: 0, integrity: CORE_INTEGRITY,
      energy: ENERGY_START, battleAlloy: 120, ult: 0, score: 0, kills: 0, titans: 0, deploys: 0,
      allies: [], enemies: [], shots: [], events: [], over: false, victory: false, uid: 1, heroDownUntil: 0,
    });
    this.path = this.findPath(ENTRY.x, ENTRY.y);
  }
  cards() { return [...this.squad.slots, this.squad.hero]; }
  emit(e) { this.events.push(e); }
  drain() { const e = this.events; this.events = []; return e; }

  // ------------------------------------------------------------------ grid + BFS
  towerAt(x, y) { return this.allies.find((a) => a.alive && a.kind === 'tower' && a.cx === x && a.cy === y); }
  blocked(x, y, extra) { return this.obstacles.has(key(x, y)) || (extra && extra.x === x && extra.y === y) || !!this.towerAt(x, y); }
  findPath(sx, sy, extra) {
    if (!inside(sx, sy) || this.blocked(sx, sy, extra)) return null;
    const q = [[sx, sy]], prev = new Map([[key(sx, sy), null]]);
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      if (x === EXIT.x && y === EXIT.y) { const p = []; let k = key(x, y); while (k) { const [a, b] = k.split(',').map(Number); p.unshift({ x: a, y: b }); k = prev.get(k); } return p; }
      for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy, nk = key(nx, ny); if (inside(nx, ny) && !this.blocked(nx, ny, extra) && !prev.has(nk)) { prev.set(nk, key(x, y)); q.push([nx, ny]); } }
    }
    return null;
  }
  occupiedByUnit(x, y) { return this.allies.find((a) => a.alive && a.cx === x && a.cy === y); }

  // ------------------------------------------------------------------ deployment
  canDeploy(id, x, y) {
    const u = this.byId[id];
    if (this.over) return { ok: false, reason: 'Match over' };
    if (!u || !this.cards().includes(id)) return { ok: false, reason: 'Not in squad' };
    if (!inside(x, y)) return { ok: false, reason: 'Outside the grid' };
    if (this.energy < u.energy_cost) return { ok: false, reason: `Need ${u.energy_cost} energy` };
    if (this.obstacles.has(key(x, y)) || (x === ENTRY.x && y === ENTRY.y) || (x === EXIT.x && y === EXIT.y)) return { ok: false, reason: 'Tile is not buildable' };
    if (this.occupiedByUnit(x, y)) return { ok: false, reason: 'Tile occupied' };
    if (u.kind === 'hero') {
      if (this.allies.some((a) => a.alive && a.kind === 'hero')) return { ok: false, reason: 'Hero already deployed' };
      if (this.time < this.heroDownUntil) return { ok: false, reason: `Hero redeploys in ${Math.ceil(this.heroDownUntil - this.time)}s` };
    } else if (this.allies.filter((a) => a.alive && a.kind !== 'hero').length >= FIELD_CAP) return { ok: false, reason: `Field cap ${FIELD_CAP} reached` };
    if (u.kind === 'tower') {
      if (this.enemies.some((e) => !e.flying && e.alive && Math.floor(e.x) === x && Math.floor(e.y) === y)) return { ok: false, reason: 'Enemy on tile' };
      const newPath = this.findPath(ENTRY.x, ENTRY.y, { x, y });
      if (!newPath) return { ok: false, reason: 'Would block the only route' };
      for (const e of this.enemies) if (e.alive && !e.flying && !this.findPath(Math.floor(e.x), Math.floor(e.y), { x, y })) return { ok: false, reason: 'Would trap an enemy' };
    }
    return { ok: true };
  }
  deploy(id, x, y) {
    const chk = this.canDeploy(id, x, y);
    if (!chk.ok) { this.emit({ type: 'deny', reason: chk.reason, x, y }); return chk; }
    const u = this.byId[id], L = this.levels[id] || 1;
    const a = {
      uid: this.uid++, id, def: u, kind: u.kind, side: 'ally', cx: x, cy: y, x: x + 0.5, y: y + 0.5, level: L, mk: 1,
      baseDmg: damageAt(u, L), baseHp: hpAt(u, L), shield: 0, cd: 0.3, alive: true, facing: 0, holding: 0, flying: !!u.flying, spent: u.energy_cost,
    };
    this.applyMk(a); a.hp = a.maxHp;
    this.energy -= u.energy_cost; this.deploys++;
    this.allies.push(a);
    if (u.kind === 'tower') { this.path = this.findPath(ENTRY.x, ENTRY.y); this.reroute(); }
    this.emit({ type: 'deploy', ally: a });
    return { ok: true, ally: a };
  }
  applyMk(a) {
    const m = a.mk - 1;
    a.dmg = a.baseDmg * Math.pow(MK_MULT.dmg, m);
    const oldMax = a.maxHp || 0; a.maxHp = Math.round(a.baseHp * Math.pow(MK_MULT.hp, m));
    if (oldMax) a.hp += a.maxHp - oldMax;
    a.range = a.def.range + m * MK_MULT.range;
  }
  upgradeMk(uid) {
    const a = this.allies.find((q) => q.uid === uid && q.alive);
    if (!a) return { ok: false, reason: 'Unit gone' };
    if (a.mk >= 3) return { ok: false, reason: 'Already Mk III' };
    const cost = MK_COST(a.def, a.mk);
    if (this.battleAlloy < cost) { this.emit({ type: 'deny', reason: `Need ${cost} battle alloy` }); return { ok: false, reason: `Need ${cost} battle alloy` }; }
    this.battleAlloy -= cost; a.mk++; this.applyMk(a);
    this.emit({ type: 'upgrade', ally: a });
    return { ok: true };
  }
  recall(uid) {
    const a = this.allies.find((q) => q.uid === uid && q.alive);
    if (!a || a.kind === 'hero') return { ok: false, reason: 'Cannot recall' };
    const refund = Math.floor(a.spent / 2);
    this.energy = Math.min(ENERGY_MAX, this.energy + refund);
    this.kill(a, 'recall');
    return { ok: true, refund };
  }

  // ------------------------------------------------------------------ waves
  startWave() {
    if (this.waveActive || this.over || this.wave >= MAX_WAVES) return false;
    this.wave++; this.queue = waveComposition(this.wave); this.waveActive = true; this.spawnCd = 0.2;
    this.emit({ type: 'wave', wave: this.wave, boss: this.queue.includes('titan_breaker') });
    return true;
  }
  spawn(id) {
    const d = this.byId[id], E = d.enemy, w = this.wave;
    const hp = Math.round(d.base_hp * waveHpMult(w));
    const e = {
      uid: this.uid++, id, def: d, side: 'enemy', x: ENTRY.x - 0.4, y: ENTRY.y + 0.5, hp, maxHp: hp, dmg: d.base_damage * waveDmgMult(w),
      speed: E.speed * (1 + Math.min(0.2, w * 0.01)), flying: !!E.flying, alive: true, cd: 0.5 + Math.random() * 0.4, slow: 0, slowMult: 1, burn: 0, burnDps: 0,
      path: null, next: 0, progress: 0, facing: 0, engaged: null, boss: !!E.boss,
    };
    if (e.flying) e.y += (this.uid % 3 - 1) * 0.35;
    else { e.path = (this.path || []).map((p) => ({ x: p.x + 0.5, y: p.y + 0.5 })); e.next = 0; }
    this.enemies.push(e);
    this.emit({ type: 'spawn', enemy: e });
  }
  reroute() {
    for (const e of this.enemies) {
      if (!e.alive || e.flying) continue;
      const p = this.findPath(Math.max(0, Math.min(COLS - 1, Math.floor(e.x))), Math.max(0, Math.min(ROWS - 1, Math.floor(e.y))));
      if (p) { e.path = p.map((q) => ({ x: q.x + 0.5, y: q.y + 0.5 })); e.next = 0; }
    }
  }

  // ------------------------------------------------------------------ combat helpers
  hurt(target, amount, src) {
    if (!target.alive || amount <= 0) return;
    let dmg = amount;
    if (target.side === 'enemy') {
      dmg *= 1 - (target.def.enemy.armor || 0);
    } else {
      dmg *= 1 - (target.def.armor || 0);
      if (target.shield > 0) { const absorbed = Math.min(target.shield, dmg); target.shield -= absorbed; dmg -= absorbed; }
    }
    target.hp -= dmg;
    this.emit({ type: 'hit', target, amount: Math.round(dmg), src });
    if (target.hp <= 0) this.kill(target, src);
  }
  kill(t, src) {
    if (!t.alive) return;
    t.alive = false; t.hp = 0;
    if (t.side === 'enemy') {
      this.kills++; const E = t.def.enemy;
      this.battleAlloy += Math.round(E.bounty * (1 + (this.wave - 1) * 0.06));
      this.score += Math.round(t.maxHp * 0.4 + E.bounty * 6);
      this.ult = Math.min(100, this.ult + E.charge);
      if (t.boss) this.titans++;
    } else {
      for (const e of this.enemies) if (e.engaged === t) e.engaged = null;
      if (t.kind === 'tower') { this.path = this.findPath(ENTRY.x, ENTRY.y); this.reroute(); }
      if (t.kind === 'hero') this.heroDownUntil = this.time + 20;
    }
    this.emit({ type: 'death', target: t, cause: src === 'recall' ? 'recall' : 'killed' });
  }
  enemiesInRange(a, r, airOk) { return this.enemies.filter((e) => e.alive && (airOk || !e.flying) && dist(a, e) <= r && e.x > -0.2); }
  pickTarget(a) {
    const airOk = !!a.def.air || a.kind === 'hero';
    let list = this.enemiesInRange(a, a.range, airOk);
    if (a.def.minRange) list = list.filter((e) => dist(a, e) >= a.def.minRange);
    if (!list.length) return null;
    if (a.def.priority === 'hp') return list.sort((p, q) => q.hp - p.hp)[0];
    return list.sort((p, q) => q.progress - p.progress)[0];
  }
  allyFire(a, dt) {
    a.cd -= dt;
    if (a.cd > 0) return;
    const d = a.def;
    if (d.atk === 'heal' || d.atk === 'repair') {
      const pool = this.allies.filter((o) => o.alive && o !== a && dist(a, o) <= a.range && o.hp < o.maxHp && (d.atk === 'heal' || true));
      if (!pool.length) { a.cd = 0.3; return; }
      const amt = a.dmg * d.healMult;
      for (const o of pool) { const mult = d.atk === 'repair' && o.kind === 'tower' ? 2 : 1; o.hp = Math.min(o.maxHp, o.hp + amt * mult); }
      a.cd = d.rate; this.emit({ type: 'fire', ally: a, kind: d.atk, targets: pool });
      return;
    }
    if (d.atk === 'shield') {
      const pool = this.allies.filter((o) => o.alive && dist(a, o) <= a.range);
      const amt = a.maxHp * d.shieldMult;
      for (const o of pool) o.shield = Math.min(o.maxHp * 0.6, o.shield + amt);
      a.cd = d.rate; this.emit({ type: 'fire', ally: a, kind: 'shield', targets: pool });
      return;
    }
    const t = this.pickTarget(a);
    if (!t) { a.cd = 0.1; return; }
    a.facing = Math.atan2(t.x - a.x, t.y - a.y);
    a.cd = d.rate;
    const ev = { type: 'fire', ally: a, kind: d.atk, target: t, targets: [t] };
    switch (d.atk) {
      case 'chain': {
        const hits = [t]; this.hurt(t, a.dmg, a);
        for (let i = 1; i < d.chains + a.mk - 1; i++) {
          const last = hits[hits.length - 1];
          const n = this.enemies.filter((e) => e.alive && !hits.includes(e) && dist(last, e) < 1.8).sort((p, q) => dist(last, p) - dist(last, q))[0];
          if (!n) break; hits.push(n); this.hurt(n, a.dmg * 0.65, a);
        }
        ev.targets = hits; break;
      }
      case 'cryo': t.slow = 2.2; t.slowMult = Math.min(t.slowMult, 1 - (d.slow || 0.4)); this.hurt(t, a.dmg, a); break;
      case 'flame': for (const e of this.enemiesInRange(t, d.splash, false)) { this.hurt(e, a.dmg * (e === t ? 1 : 0.6), a); e.burn = d.burn; e.burnDps = a.dmg * 0.4; } break;
      case 'beam': case 'rail': this.hurt(t, a.dmg, a); break;
      default: // bolt / splash / mortar travel as projectiles
        this.shots.push({ from: { x: a.x, y: a.y }, x: a.x, y: a.y, target: t, tx: t.x, ty: t.y, dmg: a.dmg, splash: d.splash || 0, speed: d.atk === 'mortar' ? 4.2 : 11, t: 0, kind: d.atk, src: a, flying: t.flying });
    }
    this.emit(ev);
  }
  enemyAct(e, dt) {
    e.cd -= dt;
    if (e.cd > 0) return;
    const E = e.def.enemy;
    let target = e.engaged && e.engaged.alive ? e.engaged : null;
    if (!target) {
      const cands = this.allies.filter((a) => a.alive && dist(a, e) <= E.range && !(a.flying && !e.flying && E.range < 1));
      if (E.targetTowers) cands.sort((p, q) => (q.kind === 'tower') - (p.kind === 'tower') || dist(p, e) - dist(q, e));
      else cands.sort((p, q) => dist(p, e) - dist(q, e));
      target = cands[0];
    }
    if (!target) { e.cd = 0.2; return; }
    e.cd = E.rate;
    e.facing = Math.atan2(target.x - e.x, target.y - e.y);
    if (E.splash) for (const a of this.allies) { if (a.alive && dist(a, target) <= E.splash) this.hurt(a, e.dmg * (a === target ? 1 : 0.5), e); }
    else this.hurt(target, e.dmg, e);
    this.emit({ type: 'efire', enemy: e, target });
  }

  // ------------------------------------------------------------------ hero ultimate
  ultReady() { return this.ult >= 100 && this.allies.some((a) => a.alive && a.kind === 'hero'); }
  ultimate(tx, ty) {
    const hero = this.allies.find((a) => a.alive && a.kind === 'hero');
    if (!hero || this.ult < 100) return { ok: false, reason: hero ? 'Ultimate charging' : 'Deploy your hero first' };
    this.ult = 0;
    const dmg = hero.dmg * 9;
    if (hero.def.ult === 'lance') {
      const hit = this.enemies.filter((e) => e.alive && Math.abs(e.y - hero.y) <= 0.9);
      for (const e of hit) this.hurt(e, dmg, hero);
      this.emit({ type: 'ult', kind: 'lance', hero, y: hero.y, targets: hit });
    } else {
      const c = { x: (tx ?? hero.x) , y: (ty ?? hero.y) };
      const hit = this.enemies.filter((e) => e.alive && dist(e, c) <= 1.8);
      for (const e of hit) this.hurt(e, dmg * 1.1, hero);
      this.emit({ type: 'ult', kind: 'orbital', hero, x: c.x, y: c.y, targets: hit });
    }
    return { ok: true };
  }

  // ------------------------------------------------------------------ main step
  step(dt) {
    if (this.over) return;
    this.time += dt;
    this.energy = Math.min(ENERGY_MAX, this.energy + dt / ENERGY_REGEN_SECONDS);
    if (this.waveActive && this.queue.length) {
      this.spawnCd -= dt;
      while (this.spawnCd <= 0 && this.queue.length) { this.spawn(this.queue.shift()); this.spawnCd += Math.max(0.42, 0.95 - this.wave * 0.025); }
    }
    // enemies move
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.slow > 0) { e.slow -= dt; if (e.slow <= 0) e.slowMult = 1; }
      if (e.burn > 0) { e.burn -= dt; this.hurt(e, e.burnDps * dt, null); if (!e.alive) continue; }
      // tank interception (ground only)
      if (!e.flying && !e.engaged) {
        const tank = this.allies.find((a) => a.alive && a.def.tank && !a.flying && dist(a, e) < 0.75 && a.holding < a.def.tank);
        if (tank) { e.engaged = tank; tank.holding++; }
      }
      if (e.engaged && !e.engaged.alive) e.engaged = null;
      e.moving = !e.engaged;
      if (e.engaged) { this.enemyAct(e, dt); continue; }
      let step = e.speed * e.slowMult * dt;
      if (e.flying) {
        const goal = { x: EXIT.x + 0.5, y: EXIT.y + 0.5 }, r = dist(e, goal);
        if (r <= step) { this.leak(e); continue; }
        e.facing = Math.atan2(goal.x - e.x, goal.y - e.y);
        e.x += ((goal.x - e.x) / r) * step; e.y += ((goal.y - e.y) / r) * step; e.progress += step;
      } else {
        let guard = 0;
        while (step > 0 && guard++ < 8) {
          const p = e.path[e.next];
          if (!p) { this.leak(e); break; }
          const r = dist(e, p);
          if (r <= step) { e.x = p.x; e.y = p.y; e.progress += r; step -= r; e.next++; if (e.next >= e.path.length) { this.leak(e); break; } }
          else { e.facing = Math.atan2(p.x - e.x, p.y - e.y); e.x += ((p.x - e.x) / r) * step; e.y += ((p.y - e.y) / r) * step; e.progress += step; step = 0; }
        }
      }
      if (e.alive) this.enemyAct(e, dt);
    }
    for (const a of this.allies) { if (a.alive) { a.holding = 0; } }
    for (const e of this.enemies) if (e.alive && e.engaged) e.engaged.holding++;
    for (const a of this.allies) if (a.alive) this.allyFire(a, dt);
    // projectiles
    for (const s of this.shots) {
      if (s.done) continue;
      if (s.target.alive) { s.tx = s.target.x; s.ty = s.target.y; }
      const r = Math.hypot(s.tx - s.x, s.ty - s.y), mv = s.speed * dt;
      s.t += dt;
      if (r <= mv || s.t > 3) {
        s.done = true;
        if (s.splash) { for (const e of this.enemies) if (e.alive && (!e.flying || s.kind !== 'mortar') && Math.hypot(e.x - s.tx, e.y - s.ty) <= s.splash) this.hurt(e, s.dmg * (e === s.target ? 1 : 0.7), s.src); }
        else if (s.target.alive) this.hurt(s.target, s.dmg, s.src);
        this.emit({ type: 'impact', shot: s });
      } else { s.x += ((s.tx - s.x) / r) * mv; s.y += ((s.ty - s.y) / r) * mv; }
    }
    this.shots = this.shots.filter((s) => !s.done);
    this.enemies = this.enemies.filter((e) => e.alive);
    this.allies = this.allies.filter((a) => a.alive);
    if (this.waveActive && !this.queue.length && !this.enemies.length) this.endWave();
  }
  leak(e) {
    e.alive = false;
    this.integrity = Math.max(0, this.integrity - e.def.enemy.leak);
    this.emit({ type: 'leak', enemy: e, integrity: this.integrity });
    if (this.integrity <= 0) this.finish(false);
  }
  endWave() {
    if (this.over) return;
    this.waveActive = false;
    const bonus = 30 + this.wave * 10; this.battleAlloy += bonus;
    this.emit({ type: 'waveClear', wave: this.wave, bonus });
    if (this.wave >= MAX_WAVES) this.finish(true);
  }
  finish(victory) {
    if (this.over) return;
    this.over = true; this.victory = victory && this.integrity > 0;
    this.emit({ type: 'over', victory: this.victory });
  }
  result(squadIndex) {
    return { matchId: this.matchId, victory: this.victory, wavesCleared: this.victory ? MAX_WAVES : Math.max(0, this.wave - (this.waveActive || !this.victory ? 1 : 0)), kills: this.kills, score: this.score + this.integrity * 250, deploys: this.deploys, titans: this.titans, integrity: this.integrity, squadIndex };
  }
}
