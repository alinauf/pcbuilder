// Teardown: take apart a laptop and a phone to see the same parts, shrunk.
import { THREE, M, box, rbox, cyl, boxGeo, merged, canvasTex, mesh, decal, text, cable, roundedSlab, makeFan } from './kit.js';
import { drawScreen } from './parts.js';

const std = (color, roughness = 0.5, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
// A clickable part: a group tagged with its id
const part = (id, ...children) => { const g = new THREE.Group(); g.userData.tdPart = id; children.forEach(c => g.add(c)); return g; };
// Each layer slides to its own spot on the mat when taken apart (like a repair-guide photo)
const layer = (x, y, z) => { const g = new THREE.Group(); g.userData.explode = new THREE.Vector3(x, y, z); return g; };
const chip = (w, d, label, x, y, z, color = 0x17181b) => {
  const g = new THREE.Group();
  g.add(box(w, 0.1, d, std(color, 0.4), x, y + 0.05, z));
  if (label) g.add(decal(w * 0.9, d * 0.9, canvasTex(256, Math.round(256 * d / w), (c, W, H) => { c.fillStyle = '#17181b'; c.fillRect(0, 0, W, H); text(c, label, W / 2, H / 2, { size: Math.min(H * 0.35, 60), color: '#9aa0a8', align: 'center', base: 'middle' }); }), [1, 0, 0], [0, 0, -1], x, y + 0.101, z, { transparent: false }));
  return g;
};
const screenTex = () => { const t = canvasTex(1280, 720, c => drawScreen(c, 'desktop')); return t; };

function laptop() {
  const g = new THREE.Group();
  const alu = std(0xb8bcc2, 0.35, 0.9), W = 31.2, D = 22.1;
  const bottomL = layer(-35, 0, 0), insideL = layer(0, 0, 0), topL = layer(35, -1.0, 0);
  g.add(bottomL, insideL, topL);
  // Bottom cover
  const bottom = part('bottom', rbox(W, 0.25, D, 0.12, alu, 0, 0.125, 0));
  for (const [x, z] of [[-13, -9], [13, -9], [-13, 9], [13, 9]]) bottom.add(box(3, 0.1, 0.8, M.rubber, x, -0.02, z));
  bottomL.add(bottom);
  // Inside: battery across the front, logic board and cooling along the hinge
  const cellMat = std(0x3a3d44, 0.6);
  const battery = part('battery');
  [-8, 0, 8].forEach(x => battery.add(rbox(7.6, 0.55, 8.2, 0.15, cellMat, x, 0.6, 5.6)));
  battery.add(decal(7, 3, canvasTex(420, 180, (c, w, h) => { c.fillStyle = '#e9ebee'; c.fillRect(0, 0, w, h); text(c, 'Li-ion Polymer', 20, 50, { size: 34, color: '#222' }); text(c, '11.55 V  70 Wh', 20, 110, { size: 38, color: '#222' }); text(c, '⚠ Do not puncture', 20, 160, { size: 26, color: '#c0262d', weight: 'normal' }); }), [1, 0, 0], [0, 0, -1], 0, 0.88, 5.6, { transparent: false, color: 0x9a9ea4, roughness: 0.9 }));
  insideL.add(battery);
  const board = part('board', box(19, 0.1, 6.4, std(0x1a2a22, 0.6), -1.5, 0.4, -6.2));
  insideL.add(board);
  const soc = part('soc', box(2.8, 0.1, 2.8, M.pcbGreen, -5, 0.5, -6.3), box(1.7, 0.06, 1.3, std(0x2b3440, 0.15, 0.7), -5, 0.58, -6.3));
  const ram = part('ram', chip(1.5, 1.1, 'LPDDR5X', -2.4, 0.45, -7.1), chip(1.5, 1.1, 'LPDDR5X', -2.4, 0.45, -5.5));
  const ssd = part('ssd', box(3.0, 0.1, 2.2, M.pcb, 2.6, 0.5, -4.8), chip(1.2, 1.4, 'NAND', 3.1, 0.55, -4.8), chip(0.8, 0.8, 'CTRL', 1.8, 0.55, -4.8));
  const wifi = part('wifi', chip(2.2, 3.0, 'Wi-Fi 7', 5.8, 0.45, -7.4, 0x2a2d33));
  wifi.add(cable([[6.2, 0.6, -8.8], [7, 0.6, -10.6], [9, 0.9, -11]], 0.05, M.black, 20), cable([[5.4, 0.6, -8.8], [4.5, 0.6, -10.6], [2, 0.9, -11]], 0.05, M.black, 20));
  const cooling = part('cooling');
  cooling.add(cyl(2.9, 0.55, std(0x202226, 0.5), 11, 0.72, -6, 'y', 40));
  const fan = makeFan(5.4, { frame: false, blades: 31, depth: 0.45, hubLabel: false });
  fan.rotation.x = -Math.PI / 2; fan.position.set(11, 1.02, -6); cooling.add(fan);
  cooling.add(box(5.2, 0.5, 1.1, M.alu, 11, 0.72, -9.9));
  cooling.add(cable([[-5, 0.66, -6.3], [0, 0.66, -9.2], [6, 0.66, -9.9], [9, 0.66, -9.9]], 0.22, M.copper, 40));
  const speakers = part('speakers', box(1.4, 0.5, 8, std(0x202226, 0.6), -14.6, 0.55, 3), box(1.4, 0.5, 8, std(0x202226, 0.6), 14.6, 0.55, 3));
  const ports = part('ports', box(2.4, 0.1, 3.2, M.pcb, -14.3, 0.4, -6.5));
  for (const z of [-7.4, -5.6]) ports.add(box(0.9, 0.35, 0.9, M.steel, -15.2, 0.55, z));
  insideL.add(soc, ram, ssd, wifi, cooling, speakers, ports);
  // Top case: keyboard + trackpad
  const topCase = part('keyboard', rbox(W, 0.3, D, 0.12, alu, 0, 1.15, 0));
  topCase.add(box(27.5, 0.05, 11.2, std(0x1a1b1e, 0.8), 0, 1.31, -3.6));
  const keys = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 14; c++) keys.push(boxGeo(1.6, 0.12, r ? 1.55 : 0.9, -12.35 + c * 1.9, 1.38, -8.4 + (r ? r * 1.85 + 0.2 : 0)));
  keys.push(boxGeo(9, 0.12, 1.55, 0, 1.38, 1.6));
  topCase.add(merged(keys, std(0x222428, 0.6)));
  const trackpad = part('trackpad', box(12.5, 0.06, 7.8, std(0xa9aeb5, 0.25, 0.6), 0, 1.32, 6.5));
  topL.add(topCase, trackpad);
  // Lid: hinge at the back, opened to ~110°
  const lid = new THREE.Group(); lid.position.set(0, 1.3, -D / 2); lid.rotation.x = -1.92; lid.userData.explode = new THREE.Vector3(35, -1.0, 0);
  const display = part('display', rbox(W, 0.5, D - 0.4, 0.15, alu, 0, 0.25, D / 2 - 0.2));
  display.add(box(W - 0.6, 0.02, D - 1.4, std(0x0a0b0d, 0.2), 0, -0.01, D / 2 - 0.1));
  const scr = mesh(new THREE.PlaneGeometry(W - 1.4, D - 3.2), new THREE.MeshStandardMaterial({ color: 0x050608, emissive: 0xffffff, emissiveMap: screenTex(), emissiveIntensity: 0.9 }));
  scr.rotation.x = Math.PI / 2; scr.position.set(0, -0.03, D / 2 + 0.5);
  display.add(scr);
  const webcam = part('webcam', cyl(0.18, 0.04, std(0x111), 0, -0.035, D - 0.95, 'y', 16));
  lid.add(display, webcam);
  g.add(lid);
  return { group: g, size: 34, openSize: 70, focusY: 7, openY: 2, layers: [bottomL, insideL, topL, lid] };
}

function phone() {
  const g = new THREE.Group();
  const W = 7.15, L = 14.7, R = 1.1;
  const backL = layer(-9, 0, 0), coilL = layer(-9, 0.1, 0), insideL = layer(0, 0, 0), frameL = layer(0, 0, 0), dispL = layer(9, -0.78, 0);
  g.add(backL, coilL, insideL, frameL, dispL);
  const back = part('back', mesh(roundedSlab(W, L, R, 0.08), std(0x3a4150, 0.35, 0.2), 0, 0, 0));
  back.add(mesh(roundedSlab(3.6, 3.6, 0.8, 0.14), std(0x3a4150, 0.3, 0.2), -1.55, -0.14, -5.1));
  backL.add(back);
  const coil = part('coil');
  for (let r = 0.7; r < 1.9; r += 0.12) coil.add(mesh(new THREE.TorusGeometry(r, 0.035, 6, 48).rotateX(Math.PI / 2), M.copper, 0, 0.12, 1.2));
  coil.add(mesh(new THREE.TorusGeometry(2.35, 0.12, 8, 64).rotateX(Math.PI / 2), std(0x2a2c30, 0.5, 0.6), 0, 0.12, 1.2));
  coilL.add(coil);
  // Inside
  const board = part('board', mesh(roundedSlab(5.6, 4.6, 0.4, 0.1), std(0x1a2a22, 0.6), 0.3, 0.2, -4.4), mesh(roundedSlab(5.6, 4.6, 0.4, 0.1), std(0x1a2a22, 0.6), 0.3, 0.46, -4.4));
  board.add(box(5.2, 0.16, 0.3, std(0x2a2d33, 0.6), 0.3, 0.38, -2.3), box(5.2, 0.16, 0.3, std(0x2a2d33, 0.6), 0.3, 0.38, -6.5));
  const soc = part('soc', box(1.5, 0.1, 1.5, std(0x1d2a22, 0.4), 1.2, 0.61, -4.2));
  const ram = part('ram', chip(1.3, 1.3, 'LPDDR5', 1.2, 0.66, -4.2));
  const storage = part('storage', chip(1.2, 1.0, 'NAND', -0.8, 0.56, -3.2));
  const modem = part('modem', chip(1.0, 1.0, '5G', -0.6, 0.56, -5.4, 0x22252a), box(0.8, 0.02, 0.8, M.steel, 2.4, 0.57, -5.8));
  const battery = part('battery', mesh(roundedSlab(5.8, 7.4, 0.5, 0.45), std(0x3a3d44, 0.6), 0, 0.18, 2.4));
  battery.add(decal(4.8, 2.4, canvasTex(400, 200, (c, w, h) => { c.fillStyle = '#e9ebee'; c.fillRect(0, 0, w, h); text(c, 'Li-ion', 20, 60, { size: 40, color: '#222' }); text(c, '3.88 V  4,500 mAh', 20, 120, { size: 32, color: '#222' }); text(c, '17.5 Wh', 20, 170, { size: 30, color: '#555', weight: 'normal' }); }), [1, 0, 0], [0, 0, -1], 0, 0.64, 2.4, { transparent: false, color: 0x9a9ea4, roughness: 0.9 }));
  const cameras = part('cameras', box(3.2, 0.5, 3.2, std(0x2a2c30, 0.4, 0.6), -1.55, 0.35, -5.1));
  const glassLens = new THREE.MeshPhysicalMaterial({ color: 0x0b1020, roughness: 0.05, metalness: 0.3, clearcoat: 1 });
  for (const [x, z] of [[-2.3, -5.9], [-2.3, -4.3], [-0.8, -5.1]]) { cameras.add(cyl(0.62, 0.55, M.alu, x, 0.62, z, 'y', 32)); cameras.add(cyl(0.45, 0.02, glassLens, x, 0.9, z, 'y', 32)); }
  const taptic = part('taptic', box(3.0, 0.35, 0.9, M.steel, -1.4, 0.35, 6.4));
  const speaker = part('speaker', box(1.8, 0.35, 0.8, std(0x202226, 0.6), 1.9, 0.35, 6.4), box(0.9, 0.3, 0.35, M.steel, 0, 0.35, 7.15));
  insideL.add(board, soc, ram, storage, modem, battery, cameras, taptic, speaker);
  // Frame with buttons and antenna breaks
  const frame = part('frame', mesh(roundedSlab(W, L, R, 0.74, [W - 0.35, L - 0.35, R - 0.18]), std(0x8c8f94, 0.35, 0.9), 0, 0.04, 0));
  frame.add(box(0.12, 0.3, 1.6, M.steel, -W / 2 - 0.05, 0.45, -3), box(0.12, 0.3, 1.0, M.steel, -W / 2 - 0.05, 0.45, -5), box(0.12, 0.3, 2.2, M.steel, W / 2 + 0.05, 0.45, -3.5));
  for (const [x, z] of [[-3.1, -6.6], [3.1, -6.6], [-3.1, 6.6], [3.1, 6.6]]) frame.add(box(0.2, 0.76, 0.12, std(0x2a2c30, 0.6), x, 0.42, z));
  frameL.add(frame);
  // Display
  const display = part('display', mesh(roundedSlab(W - 0.05, L - 0.05, R - 0.02, 0.08), std(0x050506, 0.1, 0.2), 0, 0.78, 0));
  const home = canvasTex(360, 740, (c, w, h) => {
    const grd = c.createLinearGradient(0, 0, w, h); grd.addColorStop(0, '#2b5cd6'); grd.addColorStop(0.6, '#7b4fd6'); grd.addColorStop(1, '#ff8a5c');
    c.fillStyle = grd; c.fillRect(0, 0, w, h);
    const cols = ['#4ade80', '#ffc940', '#ff6b6b', '#4fe3ff', '#b064e6', '#f39a3d', '#59c7d8', '#d97ab5', '#7aa36d', '#e0584f', '#8c96a8', '#3f8fe8', '#ffc940', '#4ade80', '#ff6b6b', '#4fe3ff'];
    cols.forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.roundRect(28 + (i % 4) * 82, 110 + Math.floor(i / 4) * 100, 60, 60, 14); c.fill(); });
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.roundRect(16, h - 120, w - 32, 96, 28); c.fill();
    text(c, '9:41', 44, 50, { size: 30, color: '#fff' });
  });
  const scr = mesh(new THREE.PlaneGeometry(W - 0.5, L - 0.5), new THREE.MeshStandardMaterial({ color: 0x050608, emissive: 0xffffff, emissiveMap: home, emissiveIntensity: 0.9 }));
  scr.rotation.x = -Math.PI / 2; scr.position.y = 0.865; display.add(scr);
  display.add(mesh(roundedSlab(1.9, 0.55, 0.27, 0.01), M.black, 0, 0.87, -6.4));
  dispL.add(display);
  return { group: g, size: 17, openSize: 22, focusY: 0.5, openY: 0.5, layers: [backL, coilL, insideL, frameL, dispL] };
}

export function buildTeardown(envTex) {
  const scene = new THREE.Scene();
  scene.environment = envTex; scene.environmentIntensity = 0.55;
  scene.background = canvasTex(4, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0b0f18'); g.addColorStop(1, '#1d2536'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x1a1a22, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(30, 60, 40); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 5, far: 150 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key);
  const mat = mesh(new THREE.PlaneGeometry(200, 200), std(0x2f5a78, 0.9), 0, -6, 0);
  mat.rotation.x = -Math.PI / 2; mat.castShadow = false; scene.add(mat);
  const devices = { laptop: laptop(), phone: phone() };
  for (const d of Object.values(devices)) {
    d.group.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    d.layers.forEach(l => (l.userData.home = l.position.clone()));
    d.group.visible = false; scene.add(d.group);
  }
  const state = { cur: null, open: false, k: 0, sel: null };
  const cur = () => devices[state.cur];
  return {
    scene, devices, state,
    show(id) { Object.entries(devices).forEach(([k, d]) => (d.group.visible = k === id)); Object.assign(state, { cur: id, open: false, k: 0, sel: null }); },
    setOpen(o) { state.open = o; },
    select(id) { state.sel = id; },
    pickables: () => (cur() ? [cur().group] : []),
    partGroups(id) { const out = []; cur()?.group.traverse(o => o.userData.tdPart === id && out.push(o)); return out; },
    view() {
      const d = cur(), dir = new THREE.Vector3(0.35, 0.95, 1).normalize();
      const target = new THREE.Vector3(0, state.open ? d.openY : d.focusY, 0);
      return { target, cam: target.clone().addScaledVector(dir, state.open ? d.openSize * 1.25 : d.size * 1.8) };
    },
    update(dt) {
      const d = cur(); if (!d) return;
      state.k += ((state.open ? 1 : 0) - state.k) * Math.min(1, dt * 2.5);
      d.layers.forEach(l => l.position.copy(l.userData.home).addScaledVector(l.userData.explode, state.k).setY(l.userData.home.y + l.userData.explode.y * state.k + Math.sin(state.k * Math.PI) * 4));
    },
  };
}
