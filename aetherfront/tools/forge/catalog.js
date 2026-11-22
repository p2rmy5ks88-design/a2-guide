// Original Aetherfront model designs (v2). Each entry returns an animated THREE.Group.
import { Rig, G, W, humanoid, towerBase, towerClips, walker, flyer } from './kit.js';

const CY = '#3ce5ff', MAG = '#ff4fd8', GOLD = '#ffc14a', ORANGE = '#ff8a2a', RED = '#ff3348', ICE = '#9ff4ff', VIO = '#a46bff';
const ENEMY_BODY = '#2a2730', ENEMY_2 = '#3c3640', ENEMY_TRIM = '#8a8f9c';

const H = (id, o) => { const r = new Rig(id); humanoid(r, o); return r.build(); };

function tower(id, c, top) {
  const r = new Rig(id);
  towerBase(r, c);
  r.node('turret', 'rig', [0, 0.35, 0]);
  top(r);
  towerClips(r, c);
  return r.build();
}

export const CATALOG = {
  // ------------------------------------------------------------------ allied infantry
  aegis_trooper: () => H('aegis_trooper', { armor: '#2f6fe0', armor2: '#25324a', trim: '#cfd9ea', glow: CY, head: 'helm', bulk: 1.1, weapon: W.rifle(CY, '#253047') }),
  cobalt_scout: () => H('cobalt_scout', { armor: '#36b6d8', armor2: '#2a3550', trim: '#d9e4f2', glow: CY, head: 'helm', bulk: 0.9, slim: true, backpack: false, weapon: W.rifle('#7ff3ff', '#2a3550', '#d9e4f2', 0.32) }),
  ember_striker: () => H('ember_striker', { armor: '#d8642a', armor2: '#3a2a28', trim: '#e9c98f', glow: ORANGE, head: 'helm', bulk: 1.05, weapon: W.flamer(ORANGE) }),
  helios_sniper: () => H('helios_sniper', { armor: '#3a4660', armor2: '#1c2333', trim: '#d6b86a', glow: GOLD, head: 'hood', hair: '#2a3142', hood: '#2c3444', skin: '#c99878', eyes: GOLD, bulk: 0.95, slim: true, weapon: W.sniper(GOLD) }),
  vesper_ranger: () => H('vesper_ranger', { armor: '#6f3cc8', armor2: '#2a2342', trim: '#e7d6ff', glow: MAG, head: 'beret', hair: '#e8409a', hat: '#7a2ab8', skin: '#f6cbb0', eyes: '#c77dff', lips: '#d9507a', slim: true, bulk: 0.95, backpack: false, weapon: W.rifle(MAG, '#2a2342', '#e7d6ff', 0.44) }),
  siege_gunner: () => H('siege_gunner', { armor: '#55606e', armor2: '#2b3038', trim: '#f0b35a', glow: ORANGE, head: 'helm', bulk: 1.25, weapon: W.gatling(ORANGE) }),
  nova_engineer: () => H('nova_engineer', { armor: '#b5783d', armor2: '#3a3140', trim: '#e6d2b3', glow: '#ffb347', head: 'goggles', hair: '#6b4426', hood: '#8a6a44', skin: '#f0c19f', lips: '#c9606c', slim: true, bulk: 0.92, weapon: W.tool('#ffb347') }),
  bastion_guardian: () => H('bastion_guardian', { armor: '#5d6474', armor2: '#2c3240', trim: GOLD, glow: '#ffd36e', head: 'helm', bulk: 1.35, shield: 1.15, shieldGlow: '#4aa8ff', weapon: W.rifle('#ffd36e', '#2c3240', '#d6a548', 0.3) }),
  rift_guardian: () => H('rift_guardian', { armor: '#3b2b5e', armor2: '#1e1a2e', trim: '#b48cff', glow: VIO, head: 'helm', bulk: 1.3, shield: 1.1, shieldGlow: '#9b5cff', weapon: W.rifle(VIO, '#1e1a2e', '#b48cff', 0.3) }),
  // heroes
  sovereign_lyra: () => H('sovereign_lyra', { armor: '#e9e4f7', armor2: '#5b3aa0', trim: GOLD, glow: '#d06bff', head: 'crown', hair: '#e9ecff', brows: '#b9c0dc', skin: '#f8d6c2', eyes: '#5fc8ff', lips: '#d8748a', slim: true, long: true, bulk: 1.0, cape: '#7a3cd0', backpack: false, weapon: W.lance('#d78bff') }),
  orbital_commander: () => H('orbital_commander', { armor: '#f0f2f7', armor2: '#2b3a5c', trim: GOLD, glow: CY, head: 'commander', bulk: 1.15, cape: '#1f4ea8', weapon: W.rifle(CY, '#2b3a5c', '#ffd36e', 0.42) }),

  halo_medic: () => {
    const r = new Rig('halo_medic');
    flyer(r, {
      alt: 0.38,
      bodyFn: (r) => {
        r.add('body', G.box(0.36, 0.32, 0.32, 0.08), '#e9eef6', 'body');
        r.add('body', G.box(0.28, 0.22, 0.04, 0.03), '#16324a', 'body', { pos: [0, 0.02, 0.16] });
        r.add('body', G.box(0.06, 0.16, 0.01, 0.005), CY, 'glow', { pos: [0, 0.02, 0.185] });
        r.add('body', G.box(0.16, 0.06, 0.01, 0.005), CY, 'glow', { pos: [0, 0.02, 0.185] });
        r.add('body', G.cyl(0.05, 0.06, 0.08, 10), '#9aa6b8', 'metal', { pos: [0, -0.2, 0] });
        r.add('body', G.torus(0.2, 0.014, 6, 24), CY, 'glow', { pos: [0, 0.24, 0], rot: [Math.PI / 2, 0, 0] });
        for (const s of [-1, 1]) {
          r.add('body', G.box(0.06, 0.2, 0.14, 0.03), '#c8d2e0', 'body', { pos: [s * 0.22, -0.02, 0] });
          r.add('body', G.sph(0.03, 8, 6), CY, 'glow', { pos: [s * 0.255, 0.04, 0.03] });
        }
        r.node('rotor0', 'body', [0, 0.24, 0]);
        r.add('rotor0', G.box(0.5, 0.012, 0.05, 0.005), '#9aa6b8', 'metal');
        r.empty('muzzle', 'body', [0, 0.02, 0.22]);
        r.node('flash', 'body', [0, 0.02, 0.22]); r.add('flash', G.sph(0.12, 10, 8), '#8affc8', 'glow'); r.nodes.flash.scale.set(0.001, 0.001, 0.001);
      },
    });
    return r.build();
  },
  aether_drone_swarm: () => {
    const r = new Rig('aether_drone_swarm');
    flyer(r, {
      alt: 0.85,
      bodyFn: (r) => {
        const spots = [[0, 0.06, 0.12], [-0.24, -0.04, -0.12], [0.24, 0, -0.1]];
        spots.forEach((p, i) => {
          const nm = 'drone' + i; r.node(nm, 'body', p);
          r.add(nm, G.lathe([[0, -0.05], [0.12, -0.03], [0.15, 0], [0.1, 0.05], [0, 0.07]], 18), '#dfe6f2', 'body');
          r.add(nm, G.hemi(0.06), '#1d2a40', 'body', { pos: [0, 0.04, 0] });
          r.add(nm, G.torus(0.17, 0.012, 6, 24), CY, 'glow', { rot: [Math.PI / 2, 0, 0] });
          r.add(nm, G.sph(0.028, 8, 6), CY, 'glow', { pos: [0, 0.0, 0.14] });
          r.add(nm, G.cyl(0.08, 0.02, 0.03, 12), CY, 'glow', { pos: [0, -0.06, 0] });
        });
        r.node('rotor0', 'body', [0, 0, 0]);
        r.empty('muzzle', 'body', [0, 0.06, 0.28]);
        r.node('flash', 'body', [0, 0.06, 0.28]); r.add('flash', G.oct(0.06), CY, 'glow', { scale: [1, 1, 2] }); r.nodes.flash.scale.set(0.001, 0.001, 0.001);
      },
    });
    return r.build();
  },
  atlas_walker: () => {
    const r = new Rig('atlas_walker');
    walker(r, {
      legs: 4, height: 0.5, hip: 0.22, thigh: 0.28, armor: '#2f5fbf', armor2: '#252e40', joint: '#c7d0de', glow: CY, legPhase: 0,
      bodyFn: (r, s) => {
        r.add('body', G.box(0.62, 0.26, 0.66, 0.08), '#2f5fbf', 'body', { pos: [0, 0.1, 0] });
        r.add('body', G.box(0.5, 0.12, 0.5, 0.05), '#252e40', 'body', { pos: [0, 0.28, -0.04] });
        r.add('body', G.box(0.3, 0.08, 0.06, 0.02), CY, 'glow', { pos: [0, 0.14, 0.33] });
        r.add('body', G.box(0.64, 0.03, 0.68, 0.01), GOLD, 'metal', { pos: [0, 0.0, 0] });
        for (const s2 of [-1, 1]) {
          r.add('body', G.box(0.14, 0.14, 0.42, 0.03), '#3a4256', 'body', { pos: [s2 * 0.25, 0.34, 0.12] });
          r.add('body', G.cyl(0.04, 0.04, 0.32, 10), '#c7d0de', 'metal', { pos: [s2 * 0.25, 0.34, 0.45], rot: [Math.PI / 2, 0, 0] });
          r.add('body', G.torus(0.05, 0.012, 6, 12), CY, 'glow', { pos: [s2 * 0.25, 0.34, 0.6] });
        }
        r.empty('muzzle', 'body', [0, 0.34, 0.66]);
        r.node('flash', 'body', [0, 0.34, 0.66]);
        for (const s2 of [-1, 1]) r.add('flash', G.oct(0.1), CY, 'glow', { pos: [s2 * 0.25, 0, 0], scale: [1, 1, 2] });
        r.nodes.flash.scale.set(0.001, 0.001, 0.001);
      },
    });
    return r.build();
  },

  // ------------------------------------------------------------------ towers
  pulse_cannon: () => tower('pulse_cannon', { glow: CY }, (r) => {
    r.add('turret', G.box(0.38, 0.22, 0.36, 0.07), '#2d64d2', 'body', { pos: [0, 0.12, 0] });
    r.add('turret', G.box(0.4, 0.04, 0.38, 0.01), '#cfd9ea', 'metal', { pos: [0, 0.24, 0] });
    r.add('turret', G.box(0.18, 0.06, 0.04, 0.01), CY, 'glow', { pos: [0, 0.14, 0.18] });
    r.node('barrel', 'turret', [0, 0.13, 0.1]);
    for (const s of [-1, 1]) {
      r.add('barrel', G.cyl(0.045, 0.05, 0.42, 10), '#cfd9ea', 'metal', { pos: [s * 0.08, 0, 0.22], rot: [Math.PI / 2, 0, 0] });
      r.add('barrel', G.torus(0.05, 0.012, 6, 12), CY, 'glow', { pos: [s * 0.08, 0, 0.42] });
    }
    r.empty('muzzle', 'barrel', [0, 0, 0.47]);
    r.node('flash', 'barrel', [0, 0, 0.47]); r.add('flash', G.oct(0.1), CY, 'glow', { scale: [1.8, 1, 2] }); r.nodes.flash.scale.set(0.001, 0.001, 0.001);
  }),
  nova_mortar: () => tower('nova_mortar', { glow: ORANGE, fireDur: 0.6, recoil: [0, -0.06, -0.06] }, (r) => {
    r.add('turret', G.cyl(0.25, 0.3, 0.2, 14), '#2a2f3a', 'body', { pos: [0, 0.08, 0] });
    r.add('turret', G.torus(0.26, 0.02, 6, 20), GOLD, 'metal', { pos: [0, 0.18, 0], rot: [Math.PI / 2, 0, 0] });
    r.node('barrel', 'turret', [0, 0.25, 0], [-0.7, 0, 0]);
    r.add('barrel', G.lathe([[0.13, 0], [0.16, 0.05], [0.15, 0.4], [0.18, 0.46], [0.18, 0.52], [0.13, 0.52]], 18), '#232833', 'metal', { rot: [Math.PI / 2, 0, 0] });
    r.add('barrel', G.torus(0.165, 0.025, 6, 18), GOLD, 'metal', { pos: [0, 0, 0.25] });
    r.add('barrel', G.cyl(0.13, 0.13, 0.02, 16), ORANGE, 'glow', { pos: [0, 0, 0.5], rot: [Math.PI / 2, 0, 0] });
    r.empty('muzzle', 'barrel', [0, 0, 0.55]);
    r.node('flash', 'barrel', [0, 0, 0.55]); r.add('flash', G.ico(0.16, 0), ORANGE, 'glow'); r.nodes.flash.scale.set(0.001, 0.001, 0.001);
  }),
  arc_pylon: () => tower('arc_pylon', { glow: VIO }, (r) => {
    r.add('turret', G.cyl(0.08, 0.14, 0.62, 10), '#2a2f45', 'metal', { pos: [0, 0.31, 0] });
    r.node('spin', 'turret', [0, 0, 0]);
    [0.18, 0.34, 0.5].forEach((y, i) => r.add('spin', G.torus(0.2 - i * 0.04, 0.025, 6, 20), MAG, 'glow', { pos: [0, y, 0], rot: [Math.PI / 2 + 0.15, 0, 0] }));
    r.node('bob', 'turret', [0, 0.78, 0]);
    r.add('bob', G.ico(0.12, 1), '#e7b8ff', 'glow');
    r.add('bob', G.torus(0.17, 0.01, 4, 20), VIO, 'glow', { rot: [0.5, 0, 0] });
    r.empty('muzzle', 'bob', [0, 0, 0]);
    r.node('flash', 'bob', [0, 0, 0]); r.add('flash', G.ico(0.22, 0), '#f2d4ff', 'glow'); r.nodes.flash.scale.set(0.001, 0.001, 0.001);
  }),
  glacial_emitter: () => tower('glacial_emitter', { glow: ICE }, (r) => {
    r.add('turret', G.cyl(0.16, 0.22, 0.3, 12), '#d6e4f2', 'body', { pos: [0, 0.15, 0] });
    r.add('turret', G.torus(0.18, 0.02, 6, 18), CY, 'glow', { pos: [0, 0.3, 0], rot: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; r.add('turret', G.oct(0.07), ICE, 'glow', { pos: [Math.sin(a) * 0.2, 0.36, Math.cos(a) * 0.2], scale: [0.6, 1.8, 0.6], rot: [Math.sin(a) * 0.4, 0, Math.cos(a) * 0.4] }); }
    r.node('barrel', 'turret', [0, 0.34, 0.05]);
    r.add('barrel', G.cyl(0.07, 0.11, 0.3, 12), '#9fb3c8', 'metal', { pos: [0, 0, 0.18], rot: [Math.PI / 2, 0, 0] });
    r.add('barrel', G.cyl(0.075, 0.075, 0.02, 12), ICE, 'glow', { pos: [0, 0, 0.34], rot: [Math.PI / 2, 0, 0] });
    r.empty('muzzle', 'barrel', [0, 0, 0.38]);
    r.node('flash', 'barrel', [0, 0, 0.38]); r.add('flash', G.cone(0.14, 0.3, 10), '#e9ffff', 'glow', { rot: [Math.PI / 2, 0, 0] }); r.nodes.flash.scale.set(0.001, 0.001, 0.001);
  }),
  volt_sentinel: () => tower('volt_sentinel', { glow: '#4f8bff' }, (r) => {
    r.add('turret', G.cyl(0.06, 0.12, 0.5, 8), '#2a3550', 'metal', { pos: [0, 0.25, 0] });
    r.node('barrel', 'turret', [0, 0.56, 0]);
    r.add('barrel', G.box(0.3, 0.2, 0.3, 0.06), '#2850b8', 'body');
    r.add('barrel', G.cyl(0.08, 0.1, 0.12, 14), '#cfd9ea', 'metal', { pos: [0, 0, 0.18], rot: [Math.PI / 2, 0, 0] });
    r.add('barrel', G.cyl(0.07, 0.07, 0.02, 14), '#8fd0ff', 'glow', { pos: [0, 0, 0.245], rot: [Math.PI / 2, 0, 0] });
    for (const s of [-1, 1]) r.add('barrel', G.box(0.03, 0.22, 0.03, 0.005), '#4f8bff', 'glow', { pos: [s * 0.17, 0, 0] });
    r.node('spin', 'turret', [0, 0, 0]);
    [0.12, 0.26].forEach((y) => r.add('spin', G.torus(0.16, 0.018, 6, 20), '#4f8bff', 'glow', { pos: [0, y, 0], rot: [Math.PI / 2, 0, 0] }));
    r.empty('muzzle', 'barrel', [0, 0, 0.28]);
    r.node('flash', 'barrel', [0, 0, 0.28]); r.add('flash', G.oct(0.1), '#bfe4ff', 'glow', { scale: [1, 1, 2.4] }); r.nodes.flash.scale.set(0.001, 0.001, 0.001);
  }),
  quantum_spire: () => tower('quantum_spire', { glow: MAG }, (r) => {
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; r.add('turret', G.box(0.07, 0.62, 0.07, 0.02), '#2c2540', 'metal', { pos: [Math.sin(a) * 0.17, 0.3, Math.cos(a) * 0.17], rot: [Math.cos(a) * -0.18, 0, Math.sin(a) * 0.18] }); r.add('turret', G.box(0.02, 0.4, 0.02, 0.005), MAG, 'glow', { pos: [Math.sin(a) * 0.2, 0.3, Math.cos(a) * 0.2], rot: [Math.cos(a) * -0.18, 0, Math.sin(a) * 0.18] }); }
    r.node('bob', 'turret', [0, 0.78, 0]);
    r.add('bob', G.oct(0.14), '#ff7ae6', 'glow', { scale: [0.8, 1.6, 0.8] });
    r.node('spin', 'turret', [0, 0.78, 0]);
    r.add('spin', G.torus(0.2, 0.012, 4, 24), '#ffd1f6', 'glow', { rot: [1.2, 0, 0] });
    r.add('spin', G.torus(0.24, 0.01, 4, 24), MAG, 'glow', { rot: [0.4, 0.8, 0] });
    r.empty('muzzle', 'bob', [0, 0, 0]);
    r.node('flash', 'bob', [0, 0, 0]); r.add('flash', G.ico(0.25, 0), '#ffe0fa', 'glow'); r.nodes.flash.scale.set(0.001, 0.001, 0.001);
  }),
  aegis_barrier: () => tower('aegis_barrier', { glow: '#4aa8ff' }, (r) => {
    r.add('turret', G.cyl(0.18, 0.2, 0.18, 12), '#2a3550', 'body', { pos: [0, 0.09, 0] });
    r.node('bob', 'turret', [0, 0.42, 0]);
    r.add('bob', G.ico(0.22, 1), '#3f8cff', 'glow');
    r.add('bob', G.ico(0.25, 1), '#9fd4ff', 'glow', { scale: [1, 1, 1] });
    r.node('spin', 'turret', [0, 0.42, 0]);
    r.add('spin', G.torus(0.3, 0.02, 6, 24), '#cfe6ff', 'metal', { rot: [Math.PI / 2, 0, 0] });
    r.add('spin', G.torus(0.3, 0.015, 6, 24), CY, 'glow', { rot: [0.3, 0, 0] });
    r.empty('muzzle', 'bob', [0, 0, 0]);
    r.node('flash', 'bob', [0, 0, 0]); r.add('flash', G.sph(0.4, 14, 10), '#7fc6ff', 'glow'); r.nodes.flash.scale.set(0.001, 0.001, 0.001);
  }),

  // ------------------------------------------------------------------ enemies
  scavenger_drone: () => {
    const r = new Rig('scavenger_drone');
    flyer(r, { alt: 0.9, bodyFn: (r) => {
      r.add('body', G.lathe([[0, -0.06], [0.14, -0.03], [0.17, 0.0], [0.1, 0.06], [0, 0.08]], 16), '#3a3440', 'body');
      r.add('body', G.sph(0.05, 10, 8), RED, 'glow', { pos: [0, -0.01, 0.13] });
      r.add('body', G.cone(0.03, 0.14, 6), '#8a8f9c', 'metal', { pos: [0, -0.06, 0.18], rot: [Math.PI / 2, 0, 0] });
      r.add('body', G.torus(0.18, 0.01, 4, 20), RED, 'glow', { rot: [Math.PI / 2, 0, 0] });
      r.node('rotor0', 'body', [0, 0.08, 0]); r.add('rotor0', G.box(0.42, 0.01, 0.04, 0.004), '#8a8f9c', 'metal');
      r.empty('muzzle', 'body', [0, -0.06, 0.26]); r.node('flash', 'body', [0, -0.06, 0.26]); r.add('flash', G.oct(0.05), RED, 'glow', { scale: [1, 1, 2] }); r.nodes.flash.scale.set(0.001, 0.001, 0.001);
    } });
    return r.build();
  },
  spectral_interceptor: () => {
    const r = new Rig('spectral_interceptor');
    flyer(r, { alt: 1.05, bodyFn: (r) => {
      r.add('body', G.cone(0.1, 0.6, 8), '#2b2838', 'body', { rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.6] });
      r.add('body', G.box(0.7, 0.025, 0.2, 0.01), '#3c3648', 'body', { pos: [0, 0, -0.08] });
      for (const s of [-1, 1]) { r.add('body', G.box(0.03, 0.02, 0.18, 0.005), '#ff4fd8', 'glow', { pos: [s * 0.34, 0, -0.08] }); r.add('body', G.cyl(0.04, 0.03, 0.16, 8), '#6a6f7c', 'metal', { pos: [s * 0.14, 0, -0.2], rot: [Math.PI / 2, 0, 0] }); r.add('body', G.sph(0.035, 8, 6), '#ff4fd8', 'glow', { pos: [s * 0.14, 0, -0.29] }); }
      r.add('body', G.sph(0.045, 8, 6), RED, 'glow', { pos: [0, 0.04, 0.1] });
      r.empty('muzzle', 'body', [0, 0, 0.32]); r.node('flash', 'body', [0, 0, 0.32]); r.add('flash', G.oct(0.06), '#ff7ae6', 'glow', { scale: [1, 1, 2.2] }); r.nodes.flash.scale.set(0.001, 0.001, 0.001);
    } });
    return r.build();
  },
  crawler_swarm: () => {
    const r = new Rig('crawler_swarm');
    r.node('body', 'rig', [0, 0, 0]);
    const spots = [[0, 0, 0.12], [-0.17, 0, -0.1], [0.17, 0, -0.12]];
    spots.forEach((p, i) => {
      const nm = 'bug' + i; r.node(nm, 'body', [p[0], 0.13, p[2]]);
      r.add(nm, G.sph(0.09, 12, 8), ENEMY_BODY, 'body', { scale: [1, 0.7, 1.2] });
      r.add(nm, G.sph(0.06, 10, 8), ENEMY_2, 'body', { pos: [0, 0.01, 0.09] });
      r.add(nm, G.sph(0.018, 6, 4), RED, 'glow', { pos: [0.025, 0.03, 0.14] });
      r.add(nm, G.sph(0.018, 6, 4), RED, 'glow', { pos: [-0.025, 0.03, 0.14] });
      for (let k = 0; k < 3; k++) for (const s of [-1, 1]) r.add(nm, G.box(0.14, 0.018, 0.018, 0.004), ENEMY_TRIM, 'metal', { pos: [s * 0.1, -0.04, -0.04 + k * 0.05], rot: [0, s * (0.3 - k * 0.3), s * -0.5] });
    });
    r.empty('muzzle', 'body', [0, 0.15, 0.25]); r.node('flash', 'body', [0, 0.15, 0.25]); r.add('flash', G.oct(0.05), RED, 'glow'); r.nodes.flash.scale.set(0.001, 0.001, 0.001);
    const bugs = [0, 1, 2].map((i) => r.base('bug' + i).p);
    r.clip('idle', 1, bugs.map((p, i) => ['bug' + i, 'p', [0, 0.5, 1], [p, [p[0], p[1] + 0.01, p[2]], p]]));
    r.clip('move', 0.3, bugs.map((p, i) => ['bug' + i, 'r', [0, 0.075, 0.15, 0.225, 0.3], [[0, 0, 0], [0.12 * (i % 2 ? 1 : -1), 0, 0.08], [0, 0, 0], [-0.12 * (i % 2 ? 1 : -1), 0, -0.08], [0, 0, 0]]]));
    r.clip('fire', 0.3, [['flash', 's', [0, 0.05, 0.3], [[0.001, 0.001, 0.001], [1, 1, 1], [0.001, 0.001, 0.001]]], ...bugs.map((p, i) => ['bug' + i, 'p', [0, 0.08, 0.3], [p, [p[0], p[1], p[2] + 0.06], p]])]);
    r.clip('hit', 0.25, [['body', 'p', [0, 0.05, 0.25], [[0, 0, 0], [0, 0.04, -0.03], [0, 0, 0]]]]);
    r.clip('die', 0.8, [['body', 's', [0, 0.8], [[1, 1, 1], [1.2, 0.15, 1.2]]]]);
    return r.build();
  },
  assault_crab: () => {
    const r = new Rig('assault_crab');
    walker(r, {
      legs: 6, height: 0.3, hip: 0.2, thigh: 0.2, armor: '#3c3640', armor2: '#2a2730', joint: ENEMY_TRIM, glow: RED, moveDur: 0.45,
      bodyFn: (r) => {
        r.add('body', G.sph(0.28, 16, 10), '#4a2a30', 'body', { scale: [1.15, 0.5, 0.95] });
        r.add('body', G.sph(0.22, 14, 8), '#2a2730', 'body', { pos: [0, 0.07, -0.04], scale: [1.1, 0.5, 0.9] });
        r.add('body', G.box(0.18, 0.05, 0.05, 0.01), RED, 'glow', { pos: [0, 0.05, 0.25] });
        r.add('body', G.box(0.14, 0.14, 0.2, 0.03), '#3c3640', 'body', { pos: [0, 0.18, 0.08] });
        for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; r.add('body', G.cyl(0.018, 0.018, 0.24, 6), ENEMY_TRIM, 'metal', { pos: [Math.cos(a) * 0.035, 0.18 + Math.sin(a) * 0.035, 0.28], rot: [Math.PI / 2, 0, 0] }); }
        for (const s of [-1, 1]) r.add('body', G.box(0.1, 0.07, 0.22, 0.02), '#4a2a30', 'body', { pos: [s * 0.3, 0.0, 0.22], rot: [0, s * -0.4, 0] });
        r.empty('muzzle', 'body', [0, 0.18, 0.42]); r.node('flash', 'body', [0, 0.18, 0.42]); r.add('flash', G.oct(0.08), '#ff6a3d', 'glow', { scale: [1, 1, 2] }); r.nodes.flash.scale.set(0.001, 0.001, 0.001);
      },
    });
    return r.build();
  },
  siege_walker: () => {
    const r = new Rig('siege_walker');
    walker(r, {
      legs: 4, height: 0.6, hip: 0.28, thigh: 0.32, scale: 1.1, armor: '#3c3640', armor2: '#2a2730', joint: ENEMY_TRIM, glow: RED, moveDur: 0.9,
      bodyFn: (r) => {
        r.add('body', G.box(0.66, 0.3, 0.7, 0.1), '#433a44', 'body', { pos: [0, 0.12, 0] });
        r.add('body', G.box(0.5, 0.16, 0.5, 0.06), '#2a2730', 'body', { pos: [0, 0.32, -0.06] });
        r.add('body', G.box(0.36, 0.06, 0.05, 0.02), RED, 'glow', { pos: [0, 0.14, 0.36] });
        r.add('body', G.box(0.16, 0.16, 0.6, 0.04), '#2a2730', 'body', { pos: [0, 0.42, 0.18] });
        r.add('body', G.box(0.05, 0.05, 0.62, 0.01), '#ff6a3d', 'glow', { pos: [0, 0.51, 0.18] });
        r.add('body', G.cyl(0.035, 0.035, 0.3, 8), ENEMY_TRIM, 'metal', { pos: [0, 0.42, 0.6], rot: [Math.PI / 2, 0, 0] });
        r.empty('muzzle', 'body', [0, 0.42, 0.78]); r.node('flash', 'body', [0, 0.42, 0.78]); r.add('flash', G.oct(0.12), '#ff6a3d', 'glow', { scale: [1, 1, 2.5] }); r.nodes.flash.scale.set(0.001, 0.001, 0.001);
      },
    });
    return r.build();
  },
  titan_breaker: () => {
    const r = new Rig('titan_breaker');
    const s = 1.85;
    humanoid(r, { armor: '#7a2a2e', armor2: '#2e2a32', trim: '#9aa0ac', glow: RED, head: 'helm', bulk: 1.55, backpack: true, weapon: W.gatling('#ff4a3a') });
    r.nodes.rig.scale.set(s, s, s);
    r.add('torso', G.box(0.2, 0.16, 0.16, 0.04), '#7a2a2e', 'body', { pos: [0.3, 0.36, -0.02] });
    r.add('torso', G.box(0.2, 0.16, 0.16, 0.04), '#7a2a2e', 'body', { pos: [-0.3, 0.36, -0.02] });
    for (let i = 0; i < 3; i++) r.add('torso', G.cone(0.03, 0.12, 5), RED, 'glow', { pos: [-0.08 + i * 0.08, 0.42, -0.18] });
    return r.build();
  },

  // ------------------------------------------------------------------ environment
  entry_gate: () => {
    const r = new Rig('entry_gate');
    r.add('rig', G.box(1.2, 0.12, 0.6, 0.03), '#1d2638', 'body', { pos: [0, 0.06, 0] });
    for (const s of [-1, 1]) { r.add('rig', G.box(0.22, 1.5, 0.4, 0.05), '#283349', 'body', { pos: [s * 0.62, 0.75, 0] }); r.add('rig', G.box(0.06, 1.2, 0.42, 0.01), CY, 'glow', { pos: [s * 0.52, 0.75, 0] }); r.add('rig', G.box(0.26, 0.06, 0.44, 0.01), GOLD, 'metal', { pos: [s * 0.62, 1.48, 0] }); }
    r.add('rig', G.torus(0.62, 0.09, 10, 36, Math.PI), '#283349', 'body', { pos: [0, 0.95, 0] });
    r.add('rig', G.torus(0.62, 0.03, 6, 36, Math.PI), GOLD, 'metal', { pos: [0, 0.95, 0.07] });
    r.node('spin', 'rig', [0, 0.85, 0]);
    r.add('spin', G.torus(0.48, 0.03, 6, 36), CY, 'glow');
    r.add('spin', G.torus(0.38, 0.015, 6, 30), '#a8f6ff', 'glow');
    r.node('bob', 'rig', [0, 0.85, 0]);
    r.add('bob', G.cyl(0.36, 0.36, 0.02, 30), '#2a9fd0', 'glow', { rot: [Math.PI / 2, 0, 0], scale: [1, 1, 1] });
    r.clip('idle', 4, [['spin', 'r', [0, 2, 4], [[0, 0, 0], [0, 0, Math.PI], [0, 0, Math.PI * 2 - 0.001]]], ['bob', 's', [0, 2, 4], [[1, 1, 1], [1.06, 1.06, 1], [1, 1, 1]]]]);
    return r.build();
  },
  core_reactor: () => {
    const r = new Rig('core_reactor');
    r.add('rig', G.hex(0.7, 0.14), '#1d2638', 'body', { pos: [0, 0.07, 0] });
    r.add('rig', G.hex(0.72, 0.04), GOLD, 'metal', { pos: [0, 0.15, 0] });
    r.add('rig', G.cyl(0.45, 0.55, 0.22, 16), '#2a3550', 'body', { pos: [0, 0.27, 0] });
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; r.add('rig', G.box(0.14, 0.9, 0.14, 0.03), '#2a3550', 'body', { pos: [Math.sin(a) * 0.55, 0.6, Math.cos(a) * 0.55] }); r.add('rig', G.box(0.04, 0.7, 0.16, 0.01), CY, 'glow', { pos: [Math.sin(a) * 0.55, 0.6, Math.cos(a) * 0.55], rot: [0, a, 0] }); r.add('rig', G.box(0.18, 0.08, 0.18, 0.02), GOLD, 'metal', { pos: [Math.sin(a) * 0.55, 1.08, Math.cos(a) * 0.55] }); }
    r.node('bob', 'rig', [0, 0.95, 0]);
    r.add('bob', G.ico(0.32, 1), '#38c8ff', 'glow');
    r.add('bob', G.ico(0.2, 0), '#d8fbff', 'glow');
    r.node('spin', 'rig', [0, 0.95, 0]);
    r.add('spin', G.torus(0.5, 0.035, 8, 32), GOLD, 'metal', { rot: [Math.PI / 2 + 0.3, 0, 0] });
    r.add('spin', G.torus(0.44, 0.015, 6, 32), CY, 'glow', { rot: [Math.PI / 2 - 0.4, 0.5, 0] });
    const bp = r.base('bob').p;
    r.clip('idle', 4, [['spin', 'r', [0, 2, 4], [[0, 0, 0], [0, Math.PI, 0], [0, Math.PI * 2 - 0.001, 0]]], ['bob', 'p', [0, 2, 4], [bp, [0, bp[1] + 0.08, 0], bp]], ['bob', 'r', [0, 4], [[0, 0, 0], [0, -Math.PI * 2 + 0.001, 0]]]]);
    r.clip('hit', 0.4, [['bob', 's', [0, 0.08, 0.4], [[1, 1, 1], [1.25, 0.85, 1.25], [1, 1, 1]]]]);
    return r.build();
  },
  turret_pad: () => {
    const r = new Rig('turret_pad');
    r.add('rig', G.box(0.94, 0.08, 0.94, 0.03), '#222c40', 'body', { pos: [0, 0.04, 0] });
    r.add('rig', G.torus(0.33, 0.015, 6, 24), CY, 'glow', { pos: [0, 0.085, 0], rot: [Math.PI / 2, 0, 0] });
    return r.build();
  },
  obstacle_crate: () => {
    const r = new Rig('obstacle_crate');
    r.add('rig', G.box(0.84, 0.5, 0.84, 0.07), '#2e3a52', 'body', { pos: [0, 0.25, 0] });
    r.add('rig', G.box(0.74, 0.08, 0.74, 0.03), '#3b4a66', 'body', { pos: [0, 0.53, 0] });
    for (const s of [-1, 1]) { r.add('rig', G.box(0.5, 0.04, 0.02, 0.01), CY, 'glow', { pos: [0, 0.3, s * 0.425] }); r.add('rig', G.box(0.02, 0.04, 0.5, 0.01), CY, 'glow', { pos: [s * 0.425, 0.3, 0] }); }
    r.add('rig', G.box(0.86, 0.03, 0.86, 0.01), '#c9a24a', 'metal', { pos: [0, 0.06, 0] });
    return r.build();
  },
  wall_segment: () => {
    const r = new Rig('wall_segment');
    r.add('rig', G.box(1.0, 0.36, 0.3, 0.04), '#273249', 'body', { pos: [0, 0.18, 0] });
    r.add('rig', G.box(1.02, 0.05, 0.32, 0.01), '#c9a24a', 'metal', { pos: [0, 0.37, 0] });
    r.add('rig', G.box(0.7, 0.03, 0.02, 0.005), '#ffb347', 'glow', { pos: [0, 0.22, 0.16] });
    return r.build();
  },
};
