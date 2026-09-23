// Chip Lab: lift the lid off real chip layouts and explore each block on the silicon.
import { THREE, rbox, box, canvasTex, mesh, decal, text } from './kit.js';
import { CHIPS, CHIP_ORDER } from './data.js';

const std = (color, roughness = 0.5, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const U = 72; // texture px per unit

// ---------- Block surface patterns (what the silicon looks like under a microscope) ----------
const PATTERNS = {
  cores(g, w, h, b) {
    const [c, r] = b.grid || [2, 2], pw = w / c, ph = h / r;
    for (let i = 0; i < c; i++) for (let j = 0; j < r; j++) {
      const x = i * pw + pw * 0.07, y = j * ph + ph * 0.07, cw = pw * 0.86, ch = ph * 0.86;
      g.fillStyle = 'rgba(255,255,255,0.13)'; g.fillRect(x, y, cw, ch);
      g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 2; g.strokeRect(x, y, cw, ch);
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x + cw * 0.08, y + ch * 0.1, cw * 0.38, ch * 0.34); g.fillRect(x + cw * 0.54, y + ch * 0.1, cw * 0.38, ch * 0.34);
      g.fillStyle = 'rgba(255,255,255,0.2)';
      for (let k = 0; k < 5; k++) g.fillRect(x + cw * 0.08, y + ch * (0.54 + k * 0.08), cw * 0.84, Math.max(1, ch * 0.035));
      if (b.accel) { g.fillStyle = 'rgba(190,120,255,0.75)'; g.fillRect(x + cw * 0.08, y + ch * 0.9 - 6, cw * 0.84, 6); }
    }
  },
  cache(g, w, h) {
    const s = 7;
    g.fillStyle = 'rgba(255,255,255,0.16)';
    for (let x = 0; x < w; x += s) for (let y = 0; y < h; y += s) if ((x / s + y / s) % 2 < 1) g.fillRect(x, y, s - 1, s - 1);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    for (let x = w / 6; x < w; x += w / 6) g.fillRect(x - 2, 0, 4, h);
  },
  bank(g, w, h) {
    g.fillStyle = 'rgba(255,255,255,0.18)';
    for (let x = 0; x < w; x += 4) for (let y = 0; y < h; y += 4) g.fillRect(x, y, 2, 2);
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, h / 2 - 3, w, 6); g.fillRect(w / 2 - 3, 0, 6, h);
  },
  logic(g, w, h, b) {
    let s = [...b.id].reduce((a, c) => a + c.charCodeAt(0), 7);
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 2;
    for (let i = 0; i < (w * h) / 900; i++) {
      let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 3; k++) { r() < 0.5 ? (x += (r() - 0.5) * 60) : (y += (r() - 0.5) * 60); g.lineTo(x, y); }
      g.stroke();
    }
  },
  mem(g, w, h) {
    g.fillStyle = 'rgba(255,255,255,0.18)';
    const vertical = w > h;
    for (let i = 0; i < (vertical ? w : h); i += 10) vertical ? g.fillRect(i, 0, 5, h) : g.fillRect(0, i, w, 5);
  },
  io(g, w, h) {
    g.fillStyle = '#e3b54f';
    const s = Math.max(10, Math.min(w, h) / 5);
    for (let x = s * 0.3; x < w - s * 0.5; x += s) { g.fillRect(x, 4, s * 0.55, s * 0.55); g.fillRect(x, h - 4 - s * 0.55, s * 0.55, s * 0.55); }
  },
  gold(g, w, h) {
    g.fillStyle = '#6a4d12';
    for (let x = 0; x < w; x += 9) g.fillRect(x, 0, 2, h);
  },
  chip(g, w, h, b) {
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.arc(w * 0.12, h * 0.15, Math.min(w, h) * 0.05, 0, 7); g.fill();
    if (b.tint) { g.fillStyle = b.tint; g.fillRect(0, h - 10, w, 10); }
  },
};

function tileTex(b) {
  const W = Math.min(1024, Math.max(96, Math.round(b.w * U))), H = Math.min(1024, Math.max(96, Math.round(b.d * U)));
  return canvasTex(W, H, (g, w, h) => {
    g.fillStyle = b.pattern === 'chip' ? '#15161a' : b.color;
    g.fillRect(0, 0, w, h);
    PATTERNS[b.pattern](g, w, h, b);
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 4; g.strokeRect(0, 0, w, h);
    const label = b.label ?? b.name;
    const size = Math.min(h * 0.26, (w * 0.9) / Math.max(4, label.length * 0.58));
    g.font = `700 ${size}px Fredoka, Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = size * 0.22; g.strokeStyle = 'rgba(0,0,0,0.7)'; g.strokeText(label, w / 2, h / 2);
    g.fillStyle = b.pattern === 'chip' ? '#b9bec6' : '#fff'; g.fillText(label, w / 2, h / 2);
  });
}

function lidTex(L, dark) {
  return canvasTex(Math.round(L.w * 40), Math.round(L.d * 40), (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, dark ? '#2a2c31' : '#d7dbe0'); grd.addColorStop(1, dark ? '#16171b' : '#aeb3ba');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; g.fillRect(0, Math.random() * h, w, 1); }
    const ink = dark ? '#c9ced6' : '#3e434b';
    text(g, L.label, w / 2, h * 0.42, { size: Math.min(h * 0.28, w / (L.label.length * 0.6)), color: ink, align: 'center', font: 'Fredoka, Arial', base: 'middle' });
    text(g, L.sub, w / 2, h * 0.7, { size: Math.min(h * 0.1, w / (L.sub.length * 0.55)), color: ink, align: 'center', base: 'middle', weight: '600' });
  });
}

function buildChip(id) {
  const spec = CHIPS[id], P = spec.package, T = P.t || 1;
  const g = new THREE.Group();
  g.add(rbox(P.w, T, P.d, Math.min(0.6, T / 2 - 0.01), std(P.color, 0.55, 0.1), 0, -T / 2, 0));
  const dieMat = std(0x10131c, 0.25, 0.6);
  const tiles = [];
  for (const die of spec.dies) {
    const dg = new THREE.Group(); dg.position.set(die.x, 0, die.z); g.add(dg);
    const slab = die.slab !== false, base = slab ? 0.45 : 0;
    if (slab) dg.add(box(die.w + 0.4, 0.45, die.d + 0.4, dieMat, die.w / 2, 0.225, die.d / 2));
    for (const b of die.blocks) {
      const h = b.h ?? 0.16;
      const t = new THREE.Group(); t.position.set(b.x + b.w / 2, base, b.z + b.d / 2);
      t.add(box(b.w - 0.06, h, b.d - 0.06, std(b.pattern === 'chip' ? 0x15161a : b.color, 0.5, 0.2), 0, h / 2, 0));
      const top = decal(b.w - 0.06, b.d - 0.06, tileTex(b), [1, 0, 0], [0, 0, -1], 0, h + 0.005, 0, { emissive: 0xffffff, emissiveIntensity: 0.1, roughness: 0.35, metalness: 0.25 });
      top.material.emissiveMap = top.material.map;
      t.add(top);
      Object.assign(t.userData, { block: b.id, name: b.name, base, mat: top.material, lift: 0 });
      dg.add(t); tiles.push(t);
    }
  }
  let lid = null, lidHome, lidAway;
  if (spec.lid) {
    const L = spec.lid, h = L.h ?? 1.4, dark = !!L.color;
    lid = new THREE.Group();
    lid.add(rbox(L.w, h, L.d, Math.min(0.3, h / 2 - 0.01), std(L.color || 0xc4c8ce, 0.35, dark ? 0.3 : 1), 0, h / 2, 0));
    lid.add(decal(L.w * 0.96, L.d * 0.96, lidTex(L, dark), [1, 0, 0], [0, 0, -1], 0, h + 0.01, 0, { metalness: dark ? 0.2 : 0.8, roughness: 0.35 }));
    lidHome = new THREE.Vector3(L.x + L.w / 2, 0.7, L.z + L.d / 2);
    lidAway = new THREE.Vector3(P.w / 2 + L.w / 2 + 3, -T, 0);
    lid.position.copy(lidHome);
    g.add(lid);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const size = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());
  return { id, spec, group: g, tiles, lid, lidHome, lidAway, size: Math.max(size.x, size.z) };
}

export function buildChipLab(envTex) {
  const scene = new THREE.Scene();
  scene.environment = envTex;
  scene.environmentIntensity = 0.5;
  scene.background = canvasTex(4, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#070b14'); g.addColorStop(1, '#152033'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x1a1a22, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(40, 90, 60); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 300 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key);
  const floor = mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ roughness: 0.8, map: canvasTex(512, 512, (c, w) => {
    c.fillStyle = '#101725'; c.fillRect(0, 0, w, w);
    c.strokeStyle = 'rgba(79,227,255,0.09)'; c.lineWidth = 2;
    for (let i = 0; i <= w; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, w); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); }
  }, { repeat: [30, 30] }) }), 0, -2.5, 0);
  floor.rotation.x = -Math.PI / 2; floor.castShadow = false; scene.add(floor);

  const chips = {};
  for (const id of CHIP_ORDER) { chips[id] = buildChip(id); chips[id].group.visible = false; scene.add(chips[id].group); }

  // Glowing "data" dots that fly from memory to the selected block
  const dotMat = new THREE.MeshStandardMaterial({ color: 0x0b2a33, emissive: 0x4fe3ff, emissiveIntensity: 4 });
  const dots = Array.from({ length: 40 }, () => { const d = mesh(new THREE.SphereGeometry(1, 10, 8), dotMat); d.castShadow = false; d.visible = false; d.userData.t = Math.random(); scene.add(d); return d; });

  const state = { cur: null, sel: null, open: false, lidK: 0 };
  const cur = () => chips[state.cur];
  const selTiles = () => (cur() && state.sel ? cur().tiles.filter(t => t.userData.block === state.sel) : []);
  const V = () => new THREE.Vector3();

  return {
    scene, chips, state,
    show(id) {
      for (const c of Object.values(chips)) c.group.visible = c.id === id;
      state.cur = id; state.sel = null;
      state.open = !CHIPS[id].lid; state.lidK = state.open ? 1 : 0;
      const c = cur();
      c.tiles.forEach(t => { t.userData.lift = 0; t.position.y = t.userData.base; });
      if (c.lid) c.lid.position.copy(c.lidHome), c.lid.rotation.set(0, 0, 0);
    },
    setOpen(o) { state.open = o; if (!o) state.sel = null; },
    select(bid) { state.sel = bid; dots.forEach(d => (d.userData.src = null)); },
    tiles: () => cur()?.tiles || [],
    selTiles,
    // Where the camera should look: the whole chip, or the selected block
    view() {
      const c = cur(), dir = new THREE.Vector3(0, 1.15, 0.95).normalize();
      if (state.sel) {
        const b = new THREE.Box3(); selTiles().forEach(t => b.expandByObject(t));
        const ctr = b.getCenter(V()), s = b.getSize(V());
        const dist = Math.max(10, Math.max(s.x, s.z) * 1.8 + c.size * 0.35);
        return { target: ctr, cam: ctr.clone().addScaledVector(dir, dist), dist };
      }
      const ctr = new THREE.Vector3(0, 0, 0);
      const dist = c.size * 1.65 + 8;
      return { target: ctr, cam: ctr.clone().addScaledVector(dir, dist), dist };
    },
    update(dt, t) {
      const c = cur(); if (!c) return;
      const k = Math.min(1, dt * 3);
      state.lidK += ((state.open ? 1 : 0) - state.lidK) * Math.min(1, dt * 2.5);
      if (c.lid) {
        const q = state.lidK;
        c.lid.position.lerpVectors(c.lidHome, c.lidAway, q);
        c.lid.position.y += Math.sin(q * Math.PI) * c.size * 0.35;
        c.lid.rotation.z = -Math.sin(q * Math.PI) * 0.5;
      }
      for (const tile of c.tiles) {
        const on = tile.userData.block === state.sel;
        tile.userData.lift += ((on ? 0.9 : 0) - tile.userData.lift) * k;
        tile.position.y = tile.userData.base + tile.userData.lift;
        const target = on ? 0.28 + Math.sin(t * 4) * 0.08 : state.sel ? 0.02 : 0.1;
        tile.userData.mat.emissiveIntensity += (target - tile.userData.mat.emissiveIntensity) * k;
      }
      const flow = state.sel && state.lidK > 0.9 && c.spec.sources?.length;
      const targets = flow ? selTiles().map(tl => tl.getWorldPosition(V()).add(new THREE.Vector3(0, 0.5, 0))) : [];
      const r = c.size * 0.0038;
      dots.forEach((d, i) => {
        d.visible = !!flow;
        if (!flow) return;
        d.userData.t += dt * 0.55;
        if (d.userData.t >= 1 || !d.userData.src) {
          d.userData.t %= 1;
          const [sx, sz] = c.spec.sources[Math.floor(Math.random() * c.spec.sources.length)];
          d.userData.src = new THREE.Vector3(sx, 0.8, sz);
          d.userData.dst = targets[i % targets.length];
        }
        const s = d.userData.src, e = d.userData.dst || targets[0], u = d.userData.t;
        const mid = s.clone().lerp(e, 0.5); mid.y += s.distanceTo(e) * 0.35;
        d.position.set(0, 0, 0).addScaledVector(s, (1 - u) ** 2).addScaledVector(mid, 2 * u * (1 - u)).addScaledVector(e, u * u);
        d.scale.setScalar(r * (0.7 + Math.sin(u * Math.PI) * 0.6));
      });
    },
  };
}
