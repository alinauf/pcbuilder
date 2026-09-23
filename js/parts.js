// Modern PC parts, modelled at real size (1 unit = 1 cm).
import {
  THREE, M, box, rbox, cyl, boxGeo, cylGeo, merged, faceBox, canvasTex, rng, meshAlpha,
  makeFan, rgbMaterial, cable, text, shadow, mesh, decal, screw,
} from './kit.js';

const PX = 80;                     // texture pixels per cm
export const BOARD_W = 24.4, BOARD_H = 30.5, BT = 0.16; // ATX: 305 × 244 mm, 1.6 mm PCB
// Board-local coords: bx from the rear (I/O) edge toward the front, by from the top edge down.
const bp = (bx, by, z = 0) => new THREE.Vector3(bx, -by, z);
export const BOARD_ORIGIN = new THREE.Vector3(-21, 44, -7.4); // board rear-top corner when installed
const Z = BT;
export const HOLES = [[0.6, 0.9], [14.6, 0.9], [23.6, 0.9], [0.6, 17.6], [14.6, 15.4], [23.6, 15.4], [0.6, 29.6], [14.6, 29.6], [23.6, 29.6]];
export const DIMM_X = [15.9, 16.85, 17.8, 18.75];
const SOCKET = [10, 8];

const texCache = {};
const cached = (k, f) => (texCache[k] ||= f());

// ---------- textures ----------
function holesTex(cols, rows) {
  return cached(`h${cols}x${rows}`, () => canvasTex(cols * 32, rows * 32, (g, w, h) => {
    g.fillStyle = '#141416'; g.fillRect(0, 0, w, h);
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      g.fillStyle = '#030303'; g.fillRect(c * 32 + 5, r * 32 + 5, 22, 22);
      g.fillStyle = '#9c7d35'; g.fillRect(c * 32 + 13, r * 32 + 13, 6, 6);
    }
  }));
}

function chipTex(lines, bg = '#141416') {
  return cached('chip' + lines.join('|') + bg, () => canvasTex(256, 256, (g, w) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, w);
    g.fillStyle = '#2a2a2e'; g.beginPath(); g.arc(28, 28, 10, 0, 7); g.fill();
    lines.forEach((l, i) => text(g, l, 128, 110 + i * 40, { size: i ? 26 : 34, color: '#8d9096', align: 'center' }));
  }));
}

function boardTexture() {
  return canvasTex(Math.round(BOARD_W * PX), Math.round(BOARD_H * PX), (g, W, H) => {
    const r = rng(11), X = v => v * PX;
    g.fillStyle = '#16191e'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.018})`; g.fillRect(r() * W, r() * H, X(0.7 * r()), X(0.7 * r())); }
    g.lineCap = 'round'; g.lineJoin = 'round';
    const trace = (pts, w = 2.2, c = '#232931') => {
      g.strokeStyle = c; g.lineWidth = w; g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), X(y)) : g.moveTo(X(x), X(y))));
      g.stroke();
    };
    // General 45° routing
    for (let i = 0; i < 300; i++) {
      let x = r() * BOARD_W, y = r() * BOARD_H; const pts = [[x, y]];
      for (let k = 0; k < 4; k++) { const d = ((r() * 8) | 0) * Math.PI / 4, l = 0.3 + r() * 2.2; x += Math.cos(d) * l; y += Math.sin(d) * l; pts.push([x, y]); }
      trace(pts, 1.6 + r() * 1.6);
    }
    // Memory bus (CPU -> DIMMs) and PCIe lanes (CPU -> first x16 slot)
    for (let i = 0; i < 36; i++) { const y = 5.0 + i * 0.17; trace([[12.7, y], [14.1, y], [14.9, 2.2 + i * 0.37], [15.5, 2.2 + i * 0.37]], 2, '#29313b'); }
    for (let i = 0; i < 16; i++) { const x = 8.4 + i * 0.2; trace([[x, 11.2], [x, 13.4], [5.2 + i * 0.5, 16.2], [5.2 + i * 0.5, 17.0]], 2, '#29313b'); }
    for (let i = 0; i < 1400; i++) { g.fillStyle = '#2b3139'; g.beginPath(); g.arc(r() * W, r() * H, 2.2, 0, 7); g.fill(); }
    for (let i = 0; i < 800; i++) { g.fillStyle = r() < 0.5 ? '#6d5c44' : '#0c0c0c'; const w = X(0.1 + r() * 0.1); g.fillRect(r() * W, r() * H, w, w * 0.55); }
    for (const [x, y] of HOLES) {
      g.fillStyle = '#8f969e'; g.beginPath(); g.arc(X(x), X(y), X(0.5), 0, 7); g.fill();
      g.fillStyle = '#060606'; g.beginPath(); g.arc(X(x), X(y), X(0.2), 0, 7); g.fill();
    }
    // Silkscreen
    const silk = '#d8dde3';
    g.strokeStyle = silk; g.lineWidth = 3;
    g.strokeRect(X(6.6), X(4.6), X(6.8), X(6.8));
    g.fillStyle = silk; g.beginPath(); g.moveTo(X(6.8), X(11.2)); g.lineTo(X(7.4), X(11.2)); g.lineTo(X(6.8), X(10.6)); g.fill(); // pin-1 triangle
    const L = (s, x, y, size = 0.26) => text(g, s, X(x), X(y), { size: X(size), color: silk, font: 'Arial Narrow, Arial' });
    L('CPU_FAN', 11.0, 1.6); L('CPU_PWR1', 5.3, 1.1); L('LGA SOCKET', 7.0, 12.0);
    ['A1', 'A2', 'B1', 'B2'].forEach((s, i) => L('DDR5_' + s, DIMM_X[i] - 0.45, 16.5, 0.2));
    L('M2_1  PCIe 5.0 x4', 5.0, 13.6); L('PCIEX16_1', 14.0, 17.8); L('PCIEX1_1', 7.3, 20.3);
    L('PCIEX16_2', 14.0, 23.9); L('PCIEX1_2', 7.3, 28.0); L('ATX_PWR1', 21.9, 7.9);
    L('SATA6G_1-4', 22.0, 20.6); L('F_PANEL', 19.5, 29.0); L('PWR  RST  HDD', 19.4, 30.3, 0.2);
    L('USB3_1', 15.9, 29.0); L('BATTERY', 13.5, 23.0); L('CLR_CMOS', 15.6, 27.0); L('SYS_FAN1', 21.9, 16.4);
    L('SYS_FAN2', 8.4, 29.3); L('HD_AUDIO', 0.8, 24.6);
    text(g, 'PC LAB  B650-ATX', X(15.9), X(26.3), { size: X(0.5), color: silk, font: 'Arial Black, Arial' });
  });
}

function pinFieldTex() {
  return cached('pins', () => canvasTex(512, 512, (g, w) => {
    g.fillStyle = '#1b1b1d'; g.fillRect(0, 0, w, w);
    g.fillStyle = '#0b0b0c'; g.fillRect(170, 170, 172, 172);
    for (let i = 0; i < 56; i++) for (let j = 0; j < 56; j++) {
      const x = 12 + i * 8.9, y = 12 + j * 8.9;
      if (x > 165 && x < 347 && y > 165 && y < 347) continue;
      g.fillStyle = '#d7b35a'; g.fillRect(x, y, 3.2, 3.2);
    }
  }));
}

// ---------- Motherboard ----------
function finnedSink(x0, y0, x1, y1, h, alongY) {
  const w = x1 - x0, d = y1 - y0, cx = (x0 + x1) / 2, cy = -(y0 + y1) / 2;
  const geos = [boxGeo(w, d, h * 0.45, cx, cy, Z + h * 0.225)];
  const n = Math.floor((alongY ? d : w) / 0.34);
  for (let i = 0; i < n; i++) {
    const t = -((alongY ? d : w) / 2) + 0.17 + i * 0.34;
    geos.push(alongY ? boxGeo(w, 0.16, h * 0.55, cx, cy + t, Z + h * 0.725) : boxGeo(0.16, d, h * 0.55, cx + t, cy, Z + h * 0.725));
  }
  return merged(geos, M.aluDark);
}

function ioShieldTex() {
  return canvasTex(Math.round(4.45 * PX), Math.round(15.9 * PX), (g, W, H) => {
    g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, W, H);
    const port = (x, y, w, h, fill, inner) => {
      g.fillStyle = '#050505'; g.fillRect(x * PX, y * PX, w * PX, h * PX);
      if (inner) { g.fillStyle = inner; g.fillRect((x + w * 0.15) * PX, (y + h * 0.35) * PX, w * 0.7 * PX, h * 0.3 * PX); }
      g.strokeStyle = fill; g.lineWidth = 3; g.strokeRect(x * PX, y * PX, w * PX, h * PX);
    };
    const circ = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x * PX, y * PX, r * PX, 0, 7); g.fill(); g.fillStyle = '#050505'; g.beginPath(); g.arc(x * PX, y * PX, r * 0.45 * PX, 0, 7); g.fill(); };
    port(0.6, 0.6, 0.8, 0.8, '#666'); port(1.8, 0.6, 0.8, 0.8, '#666');      // BIOS flashback / clear CMOS
    circ(3.3, 1.0, 0.36, '#c9a24a');                                           // Wi-Fi antenna
    let y = 2.0;
    for (let i = 0; i < 2; i++, y += 1.1) { port(0.4, y, 1.3, 0.5, '#9aa', '#2d6ee8'); port(2.3, y, 1.3, 0.5, '#9aa', '#2d6ee8'); }
    port(0.5, y + 0.2, 1.5, 0.6, '#aaa', '#111'); port(2.4, y + 0.2, 1.8, 0.6, '#aaa', '#111'); y += 1.5; // HDMI, DP
    port(0.4, y, 1.3, 0.5, '#9aa', '#d23b3b'); port(2.3, y, 1.3, 0.5, '#9aa', '#d23b3b'); y += 1.0;
    port(0.6, y, 0.9, 0.35, '#aaa', '#111'); port(2.5, y, 0.9, 0.35, '#aaa', '#111'); y += 0.9; // USB-C
    port(0.9, y, 1.6, 1.4, '#aaa', '#222'); g.fillStyle = '#e8b93a'; g.fillRect(1.0 * PX, y * PX + 4, 10, 8); g.fillStyle = '#35d06a'; g.fillRect(2.2 * PX, y * PX + 4, 10, 8); y += 1.9;
    for (let i = 0; i < 2; i++, y += 1.0) { port(0.4, y, 1.3, 0.5, '#9aa', '#2d6ee8'); port(2.3, y, 1.3, 0.5, '#9aa', '#2d6ee8'); }
    const jack = ['#8fd14f', '#ef7fb4', '#4ea8e8', '#f39c34', '#222', '#999'];
    jack.forEach((c, i) => circ(1.2 + (i % 2) * 2.0, y + 0.5 + Math.floor(i / 2) * 1.05, 0.38, c));
  });
}

export function buildMotherboard() {
  const g = new THREE.Group(); g.name = 'motherboard';
  g.add(faceBox(BOARD_W, BOARD_H, BT, M.pcb, 4, boardTexture(), BOARD_W / 2, -BOARD_H / 2, BT / 2, { roughness: 0.55 }));
  const comp = (x0, y0, x1, y1, h, mat, z0 = 0) => box(x1 - x0, y1 - y0, h, mat, (x0 + x1) / 2, -(y0 + y1) / 2, Z + z0 + h / 2);

  // --- CPU socket (LGA) with hinged load plate, lever and protective cap ---
  const sock = new THREE.Group(); sock.position.copy(bp(...SOCKET, Z)); g.add(sock);
  sock.add(box(5.2, 5.2, 0.35, M.black, 0, 0, 0.175));
  sock.add(merged([boxGeo(6.5, 0.45, 0.14, 0, 3.0, 0.07), boxGeo(6.5, 0.45, 0.14, 0, -3.0, 0.07), boxGeo(0.45, 6.0, 0.14, -3.0, 0, 0.07), boxGeo(0.45, 6.0, 0.14, 3.0, 0, 0.07)], M.steel));
  const pins = mesh(new THREE.PlaneGeometry(4.0, 4.0), new THREE.MeshStandardMaterial({ map: pinFieldTex(), metalness: 0.5, roughness: 0.35 }), 0, 0, 0.352);
  sock.add(pins);
  const plate = new THREE.Group(); plate.position.set(0, 2.8, 0.47); sock.add(plate);
  plate.add(merged([
    boxGeo(5.0, 1.15, 0.08, 0, -0.475, 0), boxGeo(5.0, 1.15, 0.08, 0, -5.125, 0),
    boxGeo(0.75, 3.5, 0.08, -2.125, -2.8, 0), boxGeo(0.75, 3.5, 0.08, 2.125, -2.8, 0),
    boxGeo(1.2, 0.5, 0.08, 0, -5.9, 0),
  ], M.steel));
  const cap = rbox(3.9, 3.9, 0.3, 0.08, new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.25 }), 0, -2.8, 0.2);
  plate.add(cap);
  const lever = new THREE.Group(); lever.position.set(3.35, -3.0, 0.3); sock.add(lever);
  lever.add(cyl(0.09, 6.2, M.steel, 0, 3.1, 0, 'y', 10));
  lever.add(cyl(0.09, 0.9, M.steel, -0.45, 6.2, 0, 'x', 10));
  lever.add(cyl(0.18, 0.9, M.black, 0, 5.9, 0, 'y', 10));
  sock.add(box(0.5, 0.6, 0.35, M.steel, 3.35, 2.6, 0.2));
  const refs = g.refs = { socket: { plate, lever, cap, capHome: cap.position.clone() } };

  // --- VRM: chokes + finned heatsinks + rear I/O cover ---
  const chokes = [];
  for (let i = 0; i < 8; i++) chokes.push(boxGeo(0.85, 0.85, 0.65, 5.7, -(3.9 + i * 1.15), Z + 0.33));
  for (let i = 0; i < 7; i++) chokes.push(boxGeo(0.85, 0.85, 0.65, 7.8 + i * 1.15, -4.3, Z + 0.33));
  g.add(merged(chokes, M.choke));
  g.add(finnedSink(2.9, 2.2, 5.1, 14.5, 3.3, true));
  g.add(finnedSink(6.5, 1.5, 15.3, 3.7, 2.5, false));
  const ioCover = rbox(2.8, 13.0, 3.9, 0.15, new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.35, metalness: 0.5 }), 1.3, -8.2, Z + 1.95);
  g.add(ioCover);
  g.add(decal(2.4, 9, cached('ioLogo', () => canvasTex(128, 480, (c, w, h) => {
    c.fillStyle = '#2a2d33'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#5b6573'; c.lineWidth = 3; for (let i = 0; i < 14; i++) { c.beginPath(); c.moveTo(0, 60 + i * 26); c.lineTo(w, 30 + i * 26); c.stroke(); }
    c.save(); c.translate(80, h - 30); c.rotate(-Math.PI / 2); text(c, 'PC LAB', 0, 0, { size: 44, color: '#aeb7c4', font: 'Arial Black' }); c.restore();
  })), [0, 1, 0], [-1, 0, 0], 1.3, -8.2, Z + 3.91));
  // Rear I/O port blocks + I/O shield plate
  const ports = [];
  for (let i = 0; i < 8; i++) ports.push(boxGeo(2.0, 1.4, 1.5 + (i % 3) * 0.4, 0.1, -(2.0 + i * 1.9), Z + 0.9));
  g.add(merged(ports, M.steel));
  g.add(faceBox(0.08, 15.9, 4.45, M.black, 1, ioShieldTex(), -0.95, -9.05, Z + 1.9));

  // --- DIMM slots with latches ---
  const latches = [];
  DIMM_X.forEach((x, i) => {
    g.add(comp(x - 0.31, 1.6, x + 0.31, 15.9, 0.75, i % 2 ? M.grey : M.black));
    g.add(comp(x - 0.08, 1.8, x + 0.08, 15.7, 0.02, M.rubber, 0.75));
    const mk = (y, dir) => {
      const p = new THREE.Group(); p.position.set(x, y, Z + 0.1);
      p.add(box(0.7, 0.45, 1.0, i % 2 ? M.grey : M.black, 0, dir * 0.22, 0.5));
      g.add(p); p.userData.dir = dir; return p;
    };
    latches.push([mk(-1.6, 1), mk(-15.9, -1)]);
  });
  refs.dimmLatches = latches;

  // --- M.2 slot + standoff ---
  g.add(comp(3.95, 13.9, 4.55, 16.1, 0.45, M.black));
  g.add(cyl(0.25, 0.28, M.gold, 12.0, -15.0, Z + 0.14, 'z', 16));
  const m2Screw = screw(0.28); m2Screw.position.copy(bp(12.0, 15.0, Z + 0.36)); m2Screw.visible = false; g.add(m2Screw);
  refs.m2Screw = m2Screw;

  // --- PCIe slots ---
  const pcie = (by, len, armored) => {
    g.add(comp(4.5, by - 0.38, 4.5 + len, by + 0.38, 1.1, armored ? M.steel : M.black));
    g.add(comp(4.6, by - 0.1, 4.4 + len, by + 0.1, 0.02, M.rubber, 1.1));
  };
  pcie(17.5, 8.9, true); pcie(20.0, 2.5); pcie(23.6, 8.9); pcie(27.7, 2.5);
  const pcieLatch = new THREE.Group(); pcieLatch.position.copy(bp(13.4, 17.5, Z + 0.2)); g.add(pcieLatch);
  pcieLatch.add(box(0.9, 0.7, 0.9, M.black, 0.45, 0, 0.45));
  refs.pcieLatch = pcieLatch;

  // --- Chipset heatsink with logo ---
  g.add(rbox(5.0, 5.5, 1.0, 0.18, M.aluDark, 19.0, -22.25, Z + 0.5));
  g.add(decal(4.4, 4.9, cached('chipset', () => canvasTex(256, 288, (c, w, h) => {
    c.fillStyle = '#3b3f46'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#8b96a5'; c.lineWidth = 4;
    for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(20, 40 + i * 38); c.lineTo(w - 20, 20 + i * 38); c.stroke(); }
    text(c, 'B650', w / 2, h / 2 + 18, { size: 60, color: '#dfe6ee', align: 'center', font: 'Arial Black' });
  })), [1, 0, 0], [0, 1, 0], 19.0, -22.25, Z + 1.005, { metalness: 0.8, roughness: 0.35, transparent: false }));

  // --- Power connectors, SATA, battery, headers, audio ---
  g.add(faceBox(1.0, 5.3, 1.3, M.black, 4, holesTex(2, 12), 23.5, -11.15, Z + 0.65));
  g.add(faceBox(1.8, 0.9, 1.3, M.black, 4, holesTex(4, 2), 4.1, -0.75, Z + 0.65));
  for (let i = 0; i < 2; i++) for (let k = 0; k < 2; k++) {
    g.add(box(1.3, 0.65, 0.55, M.black, 23.6, -(21.8 + i * 1.4), Z + 0.3 + k * 0.6));
    g.add(box(0.05, 0.5, 0.2, M.rubber, 24.27, -(21.8 + i * 1.4), Z + 0.3 + k * 0.6));
  }
  g.add(cyl(1.12, 0.3, M.black, 14.6, -21.3, Z + 0.15, 'z', 32));
  g.add(cyl(1.0, 0.32, M.steel, 14.6, -21.3, Z + 0.3, 'z', 32));
  const hdr = (bx, by, w, h, mat) => g.add(comp(bx - w / 2, by - h / 2, bx + w / 2, by + h / 2, 0.55, mat));
  hdr(11.8, 0.9, 1.0, 0.3, M.white); hdr(22.6, 17.0, 1.0, 0.3, M.white); hdr(8.4, 29.9, 1.0, 0.3, M.white);
  hdr(16.6, 29.9, 1.9, 0.5, M.blue);
  const fp = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) fp.push(boxGeo(0.07, 0.07, 0.6, 19.6 + i * 0.254, -(29.6 + j * 0.254), Z + 0.3));
  g.add(merged(fp, M.gold));
  g.add(comp(0.8, 25.4, 3.6, 28.2, 0.25, M.alu));
  const audioCaps = [];
  for (let i = 0; i < 6; i++) audioCaps.push(cylGeo(0.3, 0.6, 4.2 + (i % 3) * 0.75, -(25.5 + Math.floor(i / 3) * 1.3), Z + 0.3, 'z'));
  g.add(merged(audioCaps, new THREE.MeshStandardMaterial({ color: 0xc9a13c, metalness: 0.4, roughness: 0.4 })));
  const caps = [];
  for (let i = 0; i < 6; i++) caps.push(cylGeo(0.33, 0.8, 21.6, -(7.4 + i * 0.9), Z + 0.4, 'z'));
  for (let i = 0; i < 4; i++) caps.push(cylGeo(0.33, 0.8, 15.6 + i * 0.85, -18.6, Z + 0.4, 'z'));
  g.add(merged(caps, M.aluDark));

  // Motherboard screws (shown once mounted in the case)
  refs.screws = HOLES.map(([x, y]) => {
    const s = screw(0.42); s.position.copy(bp(x, y, Z)); s.visible = false; g.add(s); return s;
  });
  return shadow(g);
}

// ---------- CPU ----------
export function buildCPU() {
  const g = new THREE.Group(); g.name = 'cpu';
  const top = new THREE.MeshStandardMaterial({ roughness: 0.5, map: cached('cpuSub', () => canvasTex(400, 400, (c, w) => {
    c.fillStyle = '#0f4b2d'; c.fillRect(0, 0, w, w);
    c.fillStyle = '#d6ae4c'; c.beginPath(); c.moveTo(12, w - 12); c.lineTo(62, w - 12); c.lineTo(12, w - 62); c.fill();
    c.fillStyle = '#b89346'; for (let i = 0; i < 22; i++) { c.fillRect(30 + i * 16, 14, 8, 12); c.fillRect(30 + i * 16, w - 26, 8, 12); }
  })) });
  const bot = new THREE.MeshStandardMaterial({ metalness: 0.7, roughness: 0.3, map: cached('cpuPads', () => canvasTex(400, 400, (c, w) => {
    c.fillStyle = '#12482c'; c.fillRect(0, 0, w, w);
    c.fillStyle = '#e1b955';
    for (let i = 0; i < 44; i++) for (let j = 0; j < 44; j++) {
      const x = 10 + i * 8.9, y = 10 + j * 8.9;
      if (x > 140 && x < 260 && y > 140 && y < 260) continue;
      c.beginPath(); c.arc(x, y, 2.8, 0, 7); c.fill();
    }
  })) });
  g.add(mesh(new THREE.BoxGeometry(4.0, 4.0, 0.12), [M.pcbGreen, M.pcbGreen, M.pcbGreen, M.pcbGreen, top, bot], 0, 0, 0.06));
  g.add(rbox(3.3, 3.3, 0.36, 0.08, M.alu, 0, 0, 0.12 + 0.18));
  g.add(decal(3.1, 3.1, cached('ihs', () => canvasTex(512, 512, (c, w) => {
    const r = rng(3);
    c.fillStyle = '#c3c8ce'; c.fillRect(0, 0, w, w);
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${r() < 0.5 ? 255 : 0},${r() < 0.5 ? 255 : 0},255,${r() * 0.05})`; c.fillRect(0, r() * w, w, 1); }
    const t = (s, y, size) => text(c, s, 40, y, { size, color: '#4b5058', font: 'Arial' });
    t('PC LAB', 110, 54); t('8-CORE PROCESSOR', 170, 34); t('4.8 GHz · 16 THREADS', 215, 30); t('X3A7K  2437  SGP', 300, 26);
    c.fillStyle = '#4b5058'; for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) if (r() < 0.5) c.fillRect(360 + i * 9, 360 + j * 9, 9, 9);
  })), [1, 0, 0], [0, 1, 0], 0, 0, 0.482, { metalness: 0.85, roughness: 0.32, transparent: false }));
  return shadow(g);
}

// ---------- Tower air cooler ----------
export function buildCooler() {
  const g = new THREE.Group(); g.name = 'cooler';
  g.add(box(4.0, 4.0, 0.3, M.copper, 0, 0, 0.15));
  g.add(box(4.4, 4.8, 1.0, M.alu, 0, 0, 0.8));
  g.add(box(8.6, 1.0, 0.25, M.steel, 0, 0, 1.4));
  // Heat pipes: U-shaped, fanning out into the fin stack
  const pipes = [];
  [-1.35, -0.45, 0.45, 1.35].forEach((y, i) => {
    const xe = i % 2 ? 1.7 : 0.9, yt = y * 3.1;
    const pts = [[-xe, yt, 15.1], [-xe, yt, 5.5], [-xe * 0.9, y * 1.6, 2.4], [-0.8, y, 0.75], [0.8, y, 0.75], [xe * 0.9, y * 1.6, 2.4], [xe, yt, 5.5], [xe, yt, 15.1]];
    pipes.push(cable(pts, 0.3, M.copper, 60));
  });
  pipes.forEach(p => g.add(p));
  const fins = [];
  for (let i = 0; i < 56; i++) fins.push(boxGeo(5.0, 12.0, 0.045, 0, 0, 3.6 + i * 0.205));
  g.add(merged(fins, M.alu));
  g.add(rbox(5.3, 12.3, 0.4, 0.12, M.black, 0, 0, 15.35));
  g.add(decal(4.4, 10, cached('coolerTop', () => canvasTex(220, 500, (c, w, h) => {
    c.fillStyle = '#121315'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#3a3d44'; c.lineWidth = 6; c.strokeRect(14, 14, w - 28, h - 28);
    c.save(); c.translate(w / 2 + 16, h / 2); c.rotate(-Math.PI / 2); text(c, 'FROSTTOWER', 0, 0, { size: 46, color: '#c8d2de', align: 'center', font: 'Arial Black' }); c.restore();
  })), [1, 0, 0], [0, 1, 0], 0, 0, 15.56));
  const fan = makeFan(12, { rgb: 0x6fd3ff });
  fan.position.set(3.85, 0, 9.3); fan.rotation.y = Math.PI / 2;
  g.add(fan);
  g.refs = { fans: [fan] };
  // Wire fan clips
  for (const s of [-1, 1]) g.add(cable([[3.2, s * 6.1, 4.2], [4.2, s * 6.2, 4.5], [4.2, s * 6.2, 14.1], [3.2, s * 6.1, 14.4]], 0.05, M.steel, 20));
  return shadow(g);
}

// ---------- RAM (a pair of DDR5 DIMMs) ----------
function ramStick() {
  const g = new THREE.Group();
  g.add(box(0.12, 13.335, 3.1, M.pcbGreen, 0, 0, 1.55));
  const fingers = new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0.25, map: cached('dimmFingers', () => canvasTex(16, 1024, (c, w, h) => {
    c.fillStyle = '#1f5b3a'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e2b54f';
    for (let i = 0; i < 144; i++) { const y = 6 + i * 7; if (Math.abs(y - h * 0.47) < 10) continue; c.fillRect(0, y, w, 4.5); }
  })) });
  g.add(box(0.13, 13.0, 0.35, fingers, 0, 0, 0.2));
  const label = cached('ramLabel', () => canvasTex(1064, 264, (c, w, h) => {
    const grd = c.createLinearGradient(0, 0, w, h); grd.addColorStop(0, '#2d3036'); grd.addColorStop(1, '#1b1d21');
    c.fillStyle = grd; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#555c66'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(0, 60); c.lineTo(300, 60); c.lineTo(360, 120); c.lineTo(w, 120); c.stroke();
    text(c, 'VELOCITY', 40, 200, { size: 74, color: '#e8ecf0', font: 'Arial Black' });
    text(c, 'DDR5  6000 MT/s  16 GB', 560, 205, { size: 40, color: '#9aa4b0' });
  }));
  g.add(box(0.2, 13.3, 3.4, M.aluDark, 0, 0, 2.55));
  g.add(decal(13.2, 3.3, label, [0, 1, 0], [0, 0, 1], 0.101, 0, 2.55, { metalness: 0.7, roughness: 0.4, transparent: false }));
  g.add(decal(13.2, 3.3, label, [0, -1, 0], [0, 0, 1], -0.101, 0, 2.55, { metalness: 0.7, roughness: 0.4, transparent: false }));
  g.add(box(0.46, 13.3, 0.25, M.aluDark, 0, 0, 4.3));
  const glow = box(0.36, 12.9, 0.35, rgbMaterial(0xff4fd8), 0, 0, 4.6);
  glow.userData.rgb = true;
  g.add(glow);
  return g;
}
export function buildRAM() {
  const g = new THREE.Group(); g.name = 'ram';
  const a = ramStick(), b = ramStick();
  a.position.x = -0.95; b.position.x = 0.95;
  g.add(a, b);
  return shadow(g);
}

// ---------- M.2 NVMe SSD (2280) ----------
export function buildSSD() {
  const g = new THREE.Group(); g.name = 'ssd';
  const pcbTex = cached('ssdPcb', () => canvasTex(800, 220, (c, w, h) => {
    c.fillStyle = '#121418'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e1b955'; for (let i = 0; i < 28; i++) { const y = 12 + i * 7.1; if (y > 60 && y < 76) continue; c.fillRect(0, y, 36, 4.2); }
    c.fillStyle = '#000'; c.fillRect(0, 60, 40, 16); // M key notch
    c.strokeStyle = '#2a3038'; c.lineWidth = 2; for (let i = 0; i < 60; i++) { c.beginPath(); c.moveTo(40 + i * 12, 20); c.lineTo(60 + i * 12, 200); c.stroke(); }
    text(c, '2TB  NVMe  PCIe 4.0 x4', 610, 205, { size: 16, color: '#c9ced4', align: 'center' });
  }));
  g.add(faceBox(8.0, 2.2, 0.08, M.pcb, 4, pcbTex, 4.0, 0, 0.04));
  const chip = (x, w, h, t, lines) => {
    g.add(box(w, h, t, M.chip, x, 0, 0.08 + t / 2));
    g.add(decal(w * 0.96, h * 0.96, chipTex(lines), [1, 0, 0], [0, 1, 0], x, 0, 0.081 + t, { transparent: false }));
  };
  chip(1.7, 1.5, 1.5, 0.12, ['CONTROLLER', 'PCIe 4.0']);
  chip(3.2, 0.8, 1.0, 0.1, ['DRAM', 'CACHE']);
  chip(4.7, 1.6, 1.4, 0.13, ['NAND', '1 TB']);
  chip(6.5, 1.6, 1.4, 0.13, ['NAND', '1 TB']);
  return shadow(g);
}

// ---------- Graphics card ----------
export function buildGPU() {
  const g = new THREE.Group(); g.name = 'gpu';
  const L = 30;
  g.add(box(27.0, 0.16, 10.8, M.pcb, 13.9, 0, 6.5));
  const fingerTex = cached('pcieFingers', () => canvasTex(1024, 32, (c, w, h) => {
    c.fillStyle = '#16191e'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e2b54f';
    for (let i = 0; i < 82; i++) { const x = 6 + i * 12.3; if (x > 128 && x < 150) continue; c.fillRect(x, 0, 7, h); }
  }));
  g.add(box(8.9, 0.14, 0.8, new THREE.MeshStandardMaterial({ map: fingerTex, metalness: 1, roughness: 0.25 }), 5.5 + 4.45, 0, 0.75));
  // Backplate
  g.add(box(L - 0.4, 0.22, 10.9, M.aluDark, L / 2, 0.22, 6.7));
  g.add(decal(28.5, 10.2, cached('backplate', () => canvasTex(1140, 408, (c, w, h) => {
    c.fillStyle = '#34383f'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#23262b'; for (let i = 0; i < 40; i++) c.fillRect(760 + (i % 10) * 34, 60 + Math.floor(i / 10) * 70, 14, 50);
    c.strokeStyle = '#6b7482'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 330); c.lineTo(500, 330); c.lineTo(560, 270); c.lineTo(w, 270); c.stroke();
    text(c, 'HYPERDRAW  X16', 60, 200, { size: 80, color: '#aab4c1', font: 'Arial Black' });
  })), [1, 0, 0], [0, 0, -1], L / 2, 0.332, 6.7, { metalness: 0.7, roughness: 0.4, transparent: false }));
  // Heatsink fins + heat pipes
  const fins = [];
  for (let i = 0; i < 128; i++) fins.push(boxGeo(0.05, 2.9, 10.4, 1.0 + i * 0.22, -2.1, 6.6));
  g.add(merged(fins, M.alu));
  const hp = [];
  for (let i = 0; i < 5; i++) hp.push(cylGeo(0.3, 26, 14.5, -0.75, 2.6 + i * 1.9, 'x', 12));
  g.add(merged(hp, M.copper));
  // Shroud (with 3 fan openings)
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.0); shape.lineTo(L, 1.0); shape.lineTo(L, 12.4); shape.lineTo(0.6, 12.4); shape.lineTo(0, 11.8);
  const fanX = [6.0, 15.2, 24.4];
  for (const fx of fanX) { const h = new THREE.Path(); h.absarc(fx, 6.7, 4.55, 0, Math.PI * 2, true); shape.holes.push(h); }
  const sg = new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false, curveSegments: 40 });
  sg.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0)));
  sg.translate(0, -4.4, 0);
  const shroudMat = new THREE.MeshStandardMaterial({ color: 0x24272c, roughness: 0.4, metalness: 0.6 });
  g.add(mesh(sg, shroudMat));
  const trims = [];
  for (const fx of fanX) trims.push(new THREE.TorusGeometry(4.6, 0.09, 6, 64).translate(fx, 6.7, 0).applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2)).translate(0, -4.85, 0));
  g.add(merged(trims, M.alu));
  g.add(box(L, 1.4, 0.4, shroudMat, L / 2, -4.1, 12.2));
  g.add(box(L, 1.0, 0.3, shroudMat, L / 2, -4.3, 1.15));
  g.add(box(0.4, 4.8, 11.4, shroudMat, L - 0.2, -2.2, 6.7));
  const logoTex = cached('gpuLogo', () => canvasTex(1024, 128, (c, w, h) => {
    c.fillStyle = '#0a0a0b'; c.fillRect(0, 0, w, h);
    text(c, 'HYPERDRAW', w / 2, h / 2 + 4, { size: 88, color: '#ffffff', align: 'center', base: 'middle', font: 'Arial Black' });
  }));
  const logoMat = rgbMaterial(0x7c5cff); logoMat.map = logoTex; logoMat.emissiveMap = logoTex; logoMat.color.set(0xffffff);
  const logo = box(13, 1.6, 0.12, logoMat, 11, -2.4, 12.36);
  logo.userData.rgb = true;
  g.add(logo);
  const stripe = box(L - 1, 0.18, 0.1, rgbMaterial(0x7c5cff), L / 2, -3.35, 12.42); stripe.userData.rgb = true; g.add(stripe);
  // Fans (intake from below)
  g.refs = {};
  g.refs.fans = fanX.map(fx => {
    const f = makeFan(9, { frame: false, blades: 11, depth: 1.4 });
    f.position.set(fx, -4.3, 6.7); f.rotation.x = Math.PI / 2;
    g.add(f); return f;
  });
  // Bracket with display outputs
  g.add(box(0.1, 5.9, 11.3, M.steel, -0.05, -2.0, 6.55));
  g.add(box(0.9, 5.9, 0.1, M.steel, -0.5, -2.0, 12.2));
  g.add(decal(10.8, 5.6, cached('bracketVents', () => canvasTex(432, 224, (c, w, h) => {
    c.fillStyle = '#9aa0a8'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#0c0c0e';
    for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) { c.beginPath(); c.arc(30 + i * 42, 100 + j * 30, 11, 0, 7); c.fill(); }
  })), [0, 0, 1], [0, 1, 0], -0.11, -2.1, 6.55, { metalness: 0.8, roughness: 0.4, transparent: false }));
  [[2.6, 1.9], [4.9, 1.9], [7.2, 1.9], [9.6, 1.6]].forEach(([z, w], i) => {
    g.add(box(1.2, 0.6, w, M.steel, 0.5, -0.55, z));
    g.add(box(0.05, 0.4, w * 0.8, M.rubber, -0.13, -0.55, z));
    if (i === 3) g.add(box(0.06, 0.12, w * 0.6, M.black, -0.14, -0.55, z));
  });
  // PCIe power connectors on the top edge
  g.refs.powerPlugs = [21.5, 23.6].map(x => {
    g.add(faceBox(1.75, 0.95, 1.0, M.black, 4, holesTex(4, 2), x, 0.4, 12.1));
    return new THREE.Vector3(x, 0.4, 12.6);
  });
  return shadow(g);
}

// ---------- Power supply ----------
export function buildPSU() {
  const g = new THREE.Group(); g.name = 'psu';
  const W = 14, H = 8.6, D = 15; // x = depth, y = height, z = width
  const body = new THREE.MeshStandardMaterial({ color: 0x17181b, roughness: 0.75, metalness: 0.3 });
  g.add(box(W, 0.1, D, body, 0, H / 2 - 0.05, 0));
  g.add(box(W, H, 0.1, body, 0, 0, D / 2 - 0.05));
  g.add(box(W, H, 0.1, body, 0, 0, -D / 2 + 0.05));
  g.add(box(0.1, H, D, body, -W / 2 + 0.05, 0, 0));
  g.add(box(0.1, H, D, body, W / 2 - 0.05, 0, 0));
  // Bottom plate with fan opening + wire grille
  const sh = new THREE.Shape(); sh.moveTo(-W / 2, -D / 2); sh.lineTo(W / 2, -D / 2); sh.lineTo(W / 2, D / 2); sh.lineTo(-W / 2, D / 2);
  const hole = new THREE.Path(); hole.absarc(0, 0, 6.4, 0, Math.PI * 2, true); sh.holes.push(hole);
  const bg = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false, curveSegments: 48 });
  bg.rotateX(Math.PI / 2); bg.translate(0, -H / 2 + 0.1, 0);
  g.add(mesh(bg, body));
  const grille = [];
  for (const r of [1.4, 2.6, 3.8, 5.0, 6.2]) grille.push(new THREE.TorusGeometry(r, 0.06, 6, 64).rotateX(Math.PI / 2).translate(0, -H / 2 - 0.05, 0));
  for (let i = 0; i < 4; i++) grille.push(boxGeo(12.8, 0.08, 0.1, 0, -H / 2 - 0.05, 0).rotateY(i * Math.PI / 4));
  g.add(merged(grille, M.steel));
  const fan = makeFan(13.5, { frame: false, blades: 9, depth: 2.2 });
  fan.position.set(0, -H / 2 + 1.5, 0); fan.rotation.x = Math.PI / 2; // intake faces down
  g.add(fan);
  g.refs = { fans: [fan] };
  // Rear: honeycomb vent, AC inlet (IEC C14) and switch
  g.add(decal(9.4, 8.2, null, [0, 0, 1], [0, 1, 0], -W / 2 - 0.01, 0, -2.5, { color: 0x3a3c40, alphaTest: 0.5, metalness: 0.5, alphaMap: meshAlpha(40) }));
  g.add(box(0.3, 2.6, 3.0, M.black, -W / 2 - 0.1, 1.2, 4.5));
  g.add(merged([cylGeo(0.12, 0.6, -W / 2 - 0.2, 1.7, 4.5, 'x'), cylGeo(0.12, 0.6, -W / 2 - 0.2, 0.7, 3.8, 'x'), cylGeo(0.12, 0.6, -W / 2 - 0.2, 0.7, 5.2, 'x')], M.steel));
  g.add(box(0.4, 1.8, 1.0, M.red, -W / 2 - 0.15, -2.2, 4.8));
  // Front: modular sockets
  g.add(decal(14.8, 8.4, cached('psuFront', () => canvasTex(740, 420, (c, w, h) => {
    c.fillStyle = '#17181b'; c.fillRect(0, 0, w, h);
    const t = (s, x, y) => text(c, s, x, y, { size: 22, color: '#d2d6dc', align: 'center' });
    t('CPU / PCIe', 180, 50); t('ATX 24-PIN', 470, 50); t('SATA / PERIF', 640, 250); t('MODULAR  850W', 360, 390);
  })), [0, 0, -1], [0, 1, 0], W / 2 + 0.01, 0, 0));
  for (let i = 0; i < 4; i++) g.add(faceBox(0.9, 1.9, 1.0, M.black, 0, holesTex(2, 4), W / 2 + 0.4, 2.0 - Math.floor(i / 2) * 2.6, 5.4 - (i % 2) * 1.4));
  g.add(faceBox(0.9, 1.0, 5.3, M.black, 0, holesTex(12, 2), W / 2 + 0.4, 2.0, -0.8));
  g.add(faceBox(0.9, 1.9, 1.0, M.black, 0, holesTex(2, 4), W / 2 + 0.4, -1.0, -5.0));
  // Side spec label
  g.add(decal(10, 6.4, cached('psuLabel', () => canvasTex(1000, 640, (c, w, h) => {
    c.fillStyle = '#e9ebee'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#111'; c.fillRect(0, 0, w, 110);
    text(c, 'PC LAB  850W  POWER SUPPLY', 40, 75, { size: 48, color: '#fff' });
    text(c, '80 PLUS GOLD', 40, 170, { size: 44, color: '#b8862b' });
    text(c, 'AC INPUT: 100-240V~  12A  50-60Hz', 40, 230, { size: 30, color: '#222', weight: 'normal' });
    const cols = ['DC OUTPUT', '+3.3V', '+5V', '+12V', '-12V', '+5Vsb'], vals = ['MAX', '20A', '20A', '70.8A', '0.3A', '2.5A'];
    cols.forEach((s, i) => { c.strokeStyle = '#333'; c.lineWidth = 2; c.strokeRect(40 + i * 155, 270, 155, 60); c.strokeRect(40 + i * 155, 330, 155, 60); text(c, s, 117 + i * 155, 310, { size: 24, color: '#111', align: 'center' }); text(c, vals[i], 117 + i * 155, 370, { size: 26, color: '#111', align: 'center', weight: 'normal' }); });
    text(c, '⚠ DANGER: HIGH VOLTAGE INSIDE. DO NOT OPEN.', 40, 460, { size: 34, color: '#c0262d' });
    text(c, 'No user serviceable parts inside.', 40, 510, { size: 28, color: '#333', weight: 'normal' });
  })), [1, 0, 0], [0, 1, 0], 0, 0, D / 2 + 0.01, { transparent: false }));
  return shadow(g);
}

// ---------- Case ----------
export function buildCase() {
  const g = new THREE.Group(); g.name = 'case';
  const S = M.caseSteel;
  const perf = new THREE.MeshStandardMaterial({ color: 0x1a1b1e, metalness: 0.6, roughness: 0.45, alphaMap: meshAlpha(70), alphaTest: 0.5, side: THREE.DoubleSide });
  const XR = -22.35, XF = 22.35;
  // Feet, bottom, top, right side, front
  for (const x of [-18.5, 18.5]) for (const z of [-8, 8]) g.add(rbox(5, 0.7, 2.6, 0.2, M.rubber, x, 0.35, z));
  g.add(box(45, 0.3, 21, S, 0, 0.85, 0));
  g.add(box(39, 0.3, 2, S, -3, 46.29, 9.5), box(39, 0.3, 2, S, -3, 46.29, -9.5), box(1.2, 0.3, 21, S, -21.9, 46.29, 0));
  g.add(box(38, 0.1, 17, M.black, -2.5, 46.1, 0));
  g.add(box(45, 46, 0.3, S, 0, 23.3, -10.35));
  // Top & front: frames with perforated mesh (you can see the fans through it)
  // Front frame (border around the mesh): w along z, h along y
  const frame = (w, h, t, cx, cy, cz) => merged([boxGeo(t, h, 1.6, cx, cy, cz - w / 2 + 0.8), boxGeo(t, h, 1.6, cx, cy, cz + w / 2 - 0.8), boxGeo(t, 1.6, w, cx, cy - h / 2 + 0.8, cz), boxGeo(t, 1.6, w, cx, cy + h / 2 - 0.8, cz)], S);
  const top = mesh(new THREE.PlaneGeometry(38, 17), perf, -2.5, 46.29, 0); top.rotation.x = -Math.PI / 2; g.add(top);
  g.add(box(6, 0.3, 21, S, 19.5, 46.29, 0));
  g.add(frame(21, 46, 0.45, XF + 0.1, 23.3, 0));
  const front = mesh(new THREE.PlaneGeometry(18, 43), perf, XF + 0.1, 23.3, 0); front.rotation.y = Math.PI / 2; g.add(front);
  // Front I/O and power button (top, front)
  const btnGroup = new THREE.Group(); btnGroup.position.set(19.5, 46.45, 3.5); g.add(btnGroup);
  const powerBtn = cyl(0.9, 0.3, M.alu, 0, 0.05, 0, 'y', 40); btnGroup.add(powerBtn);
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: new THREE.Color(0x49b6ff), emissiveIntensity: 0 });
  const led = mesh(new THREE.TorusGeometry(0.95, 0.07, 8, 48), ledMat, 0, 0.2, 0); led.rotation.x = Math.PI / 2; btnGroup.add(led);
  btnGroup.add(decal(0.9, 0.9, cached('pwrIcon', () => canvasTex(128, 128, (c) => {
    c.strokeStyle = '#2b2f36'; c.lineWidth = 12; c.lineCap = 'round';
    c.beginPath(); c.arc(64, 68, 36, -Math.PI / 2 + 0.6, Math.PI * 1.5 - 0.6); c.stroke();
    c.beginPath(); c.moveTo(64, 20); c.lineTo(64, 64); c.stroke();
  })), [1, 0, 0], [0, 0, -1], 0, 0.21, 0, { transparent: true }));
  btnGroup.children.forEach(c => (c.userData.powerButton = true));
  g.add(box(1.2, 0.2, 0.5, M.rubber, 19.5, 46.35, -0.5), box(1.2, 0.2, 0.5, M.rubber, 19.5, 46.35, -2.0), box(0.9, 0.2, 0.35, M.rubber, 19.5, 46.35, -3.5));
  g.add(cyl(0.2, 0.22, M.rubber, 19.5, 46.34, -5.0, 'y', 16));
  g.refs = { power: { btn: btnGroup, led: ledMat } };

  // Motherboard tray + standoffs + grommets
  g.add(box(38.4, 33.4, 0.2, S, -3.0, 27.9, -8.14));
  for (const [x, y] of HOLES) g.add(cyl(0.28, 0.64, M.gold, BOARD_ORIGIN.x + x, BOARD_ORIGIN.y - y, -7.72, 'z', 6));
  g.add(rbox(1.2, 7.5, 0.3, 0.15, M.rubber, 6.4, 32.5, -8.0), rbox(1.2, 7.5, 0.3, 0.15, M.rubber, 6.4, 22.0, -8.0));
  g.add(rbox(6, 0.9, 0.3, 0.15, M.rubber, -16, 45.05, -8.0));

  // Rear panel: solid areas around the I/O, vented fan area, expansion slots, PSU opening
  g.add(box(0.3, 3.8, 21, S, XR, 44.25, 0));
  g.add(box(0.3, 14.7, 3.0, S, XR, 34.95, -9.0));
  const rearVent = mesh(new THREE.PlaneGeometry(13.4, 14.7), perf, XR, 34.95, 3.8); rearVent.rotation.y = Math.PI / 2; g.add(rearVent);
  g.add(box(0.3, 15.6, 3.7, S, XR, 19.8, -8.65), box(0.3, 15.6, 6.9, S, XR, 19.8, 7.05));
  const covers = [];
  for (let i = 0; i < 7; i++) covers.push(boxGeo(0.12, 1.8, 10.4, XR + 0.2, 26.6 - i * 2.03, -1.6));
  g.add(merged(covers.slice(3), M.steel));
  const gpuSlotCovers = merged(covers.slice(0, 3), M.steel); g.add(gpuSlotCovers);
  g.refs.gpuSlotCovers = gpuSlotCovers;
  g.add(box(0.3, 1.1, 21, S, XR, 11.45, 0));
  g.add(box(0.3, 10.0, 2.9, S, XR, 5.9, -8.95), box(0.3, 10.0, 2.9, S, XR, 5.9, 8.95));

  // PSU shroud
  const shroudMat = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.5, metalness: 0.55 });
  g.add(box(38.7, 0.3, 18.2, shroudMat, -2.85, 11.0, 0.9));
  g.add(faceBox(38.7, 10.1, 0.3, shroudMat, 4, cached('shroud', () => canvasTex(1548, 404, (c, w, h) => {
    c.fillStyle = '#1c1e22'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#0c0d0f'; for (let i = 0; i < 18; i++) c.fillRect(960 + i * 30, 120, 12, 160);
    text(c, 'PC LAB', 90, 250, { size: 150, color: '#cfd6df', font: 'Arial Black' });
    c.fillStyle = '#ffc940'; c.fillRect(90, 290, 520, 10);
  })), -2.85, 5.95, 9.85));
  g.add(box(0.3, 10.1, 18.2, shroudMat, 16.35, 5.95, 0.9));
  g.add(rbox(4.6, 0.12, 2.2, 0.1, M.rubber, 0.4, 11.2, 7.9));

  // Glass side panel (separate so it can be removed)
  const panel = new THREE.Group(); panel.name = 'panel';
  const glass = mesh(new THREE.BoxGeometry(45, 45.9, 0.4), M.glass);
  glass.castShadow = false; glass.raycast = () => {};
  panel.add(glass);
  const border = [boxGeo(45, 1.2, 0.02, 0, 22.35, 0.21), boxGeo(45, 1.2, 0.02, 0, -22.35, 0.21), boxGeo(1.2, 45.9, 0.02, -21.9, 0, 0.21), boxGeo(1.2, 45.9, 0.02, 21.9, 0, 0.21)];
  const bm = merged(border, M.black); bm.raycast = () => {}; panel.add(bm);
  for (const x of [-21.2, 21.2]) for (const y of [-21.7, 21.7]) { const t = cyl(0.55, 0.5, M.alu, x, y, 0.45, 'z', 20); t.raycast = () => {}; panel.add(t); }
  panel.refs = { glass };

  // Case fans: 3 × 120 mm front intake, 1 × 120 mm rear exhaust
  const fans = new THREE.Group(); fans.name = 'fans';
  const fanList = [];
  [10.2, 22.4, 34.6].forEach((y, i) => {
    const f = makeFan(12, { rgb: [0xff5fa8, 0x9c6bff, 0x4fd6ff][i] });
    f.position.set(20.6, y, 0); f.rotation.y = Math.PI / 2; f.userData.explode = new THREE.Vector3(12, 0, 0);
    fans.add(f); fanList.push(f);
  });
  const rear = makeFan(12, { rgb: 0x4fd6ff });
  rear.position.set(-20.85, 36, 3.6); rear.rotation.y = Math.PI / 2; rear.userData.explode = new THREE.Vector3(-12, 0, 0);
  fans.add(rear); fanList.push(rear);
  fans.refs = { fans: fanList };
  g.add(fans);

  shadow(g);
  glass.castShadow = false;
  return { pcCase: g, panel, fans };
}

// ---------- Cables (individually sleeved) ----------
const sleeveTex = () => cached('sleeve', () => canvasTex(64, 64, (c, w) => {
  c.fillStyle = '#c9ccd1'; c.fillRect(0, 0, w, w);
  c.strokeStyle = '#eef0f3'; c.lineWidth = 6;
  for (let i = -2; i < 4; i++) { c.beginPath(); c.moveTo(i * 22, 0); c.lineTo(i * 22 + 64, 64); c.stroke(); }
  c.strokeStyle = '#9a9ea5'; c.lineWidth = 2;
  for (let i = -2; i < 4; i++) { c.beginPath(); c.moveTo(i * 22 + 64, 0); c.lineTo(i * 22, 64); c.stroke(); }
}, { repeat: [60, 1] }));

// A bundle of wires following one path: `cols` spread along U, `rows` along the in-plane normal.
function bundle(path, cols, rows, U, pitch = 0.42) {
  const base = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.3);
  const pts = base.getSpacedPoints(60), u = new THREE.Vector3(...U);
  const mat = new THREE.MeshStandardMaterial({ map: sleeveTex(), roughness: 0.75 });
  const g = new THREE.Group();
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const off = pts.map((p, i) => {
      const t = pts[Math.min(i + 1, pts.length - 1)].clone().sub(pts[Math.max(i - 1, 0)]).normalize();
      const v = u.clone().cross(t).normalize();
      return p.clone().addScaledVector(u, (c - (cols - 1) / 2) * pitch).addScaledVector(v, (r - (rows - 1) / 2) * pitch);
    });
    const m = cable(off.map(p => [p.x, p.y, p.z]), 0.17, mat, 90);
    g.add(m);
  }
  return g;
}

export function buildCables() {
  const g = new THREE.Group(); g.name = 'cables';
  const bw = (bx, by, z) => bp(bx, by, z).add(BOARD_ORIGIN);
  // 24-pin ATX
  const a = bw(23.5, 11.15, Z + 1.3);
  g.add(box(1.2, 5.5, 1.3, M.black, a.x, a.y, a.z + 0.2));
  g.add(bundle([[a.x, a.y, a.z + 0.8], [a.x, a.y, a.z + 2.2], [a.x + 1.2, a.y, a.z + 3.1], [a.x + 2.9, a.y, a.z + 2.5], [a.x + 3.8, a.y, a.z - 0.5], [a.x + 3.9, a.y, -8.3], [a.x + 4.2, a.y, -9.5], [a.x + 7, a.y, -9.6]], 12, 2, [0, 1, 0]));
  // 8-pin EPS (CPU)
  const e = bw(4.1, 0.75, Z + 1.3);
  g.add(box(2.0, 1.1, 1.3, M.black, e.x, e.y, e.z + 0.2));
  g.add(bundle([[e.x, e.y, e.z + 0.8], [e.x, e.y, e.z + 2.0], [e.x, e.y + 1.2, e.z + 2.6], [e.x, 45.0, e.z + 1.2], [e.x, 45.3, -8.0], [e.x, 44.8, -9.5], [e.x, 40, -9.6]], 4, 2, [1, 0, 0]));
  // 2 × PCIe 8-pin to the graphics card
  for (const gx of [21.5, 23.6]) {
    const p = new THREE.Vector3(gx + GPU_POS.x, 0.4 + GPU_POS.y, 12.6 + GPU_POS.z);
    g.add(box(1.95, 1.1, 1.3, M.black, p.x, p.y, p.z + 0.3));
    g.add(bundle([[p.x, p.y, p.z + 0.9], [p.x, p.y, p.z + 2.0], [p.x, p.y - 1.4, p.z + 3.0], [p.x, p.y - 6, p.z + 3.2], [p.x, 12.4, 8.1], [p.x, 10.0, 7.9]], 4, 2, [1, 0, 0]));
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export const GPU_POS = new THREE.Vector3(-22.2, 26.5, -7.24);

// Thermal paste blob + syringe
export function buildPaste() {
  const blob = mesh(new THREE.SphereGeometry(0.42, 24, 12), new THREE.MeshStandardMaterial({ color: 0x9da3aa, roughness: 0.35, metalness: 0.2 }));
  blob.scale.set(1, 1, 0.45);
  blob.name = 'paste';
  const blobGroup = new THREE.Group(); blobGroup.add(blob);
  return blobGroup;
}
export function buildSyringe() {
  const g = new THREE.Group();
  g.add(cyl(0.45, 5.0, new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.7, roughness: 0.1, transparent: true, opacity: 0.6 }), 0, 0, 3.5, 'z'));
  g.add(cyl(0.38, 3.2, new THREE.MeshStandardMaterial({ color: 0x9da3aa, roughness: 0.4 }), 0, 0, 2.6, 'z'));
  g.add(mesh(new THREE.ConeGeometry(0.45, 1.0, 20).rotateX(-Math.PI / 2), M.grey, 0, 0, 0.5));
  g.add(cyl(0.12, 3.5, M.white, 0, 0, 7.6, 'z'));
  g.add(cyl(0.7, 0.15, M.white, 0, 0, 9.3, 'z'));
  g.add(box(2.2, 0.4, 0.2, M.white, 0, 0, 6.0));
  return shadow(g);
}

// ---------- Assemble everything + install data ----------
export function buildPC() {
  const root = new THREE.Group();
  const { pcCase, panel, fans } = buildCase();
  root.add(pcCase, panel);
  panel.position.set(0, 23.35, 10.72);
  const mobo = buildMotherboard();
  root.add(mobo);
  const cpu = buildCPU(), cooler = buildCooler(), ram = buildRAM(), ssd = buildSSD(), gpu = buildGPU(), psu = buildPSU();
  const cables = buildCables(), paste = buildPaste();
  const Q = new THREE.Quaternion();
  const qa = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));

  const P = {
    case: { obj: pcCase, fixed: true },
    fans: { obj: fans, fixed: true },
    motherboard: { obj: mobo, parent: root, pos: BOARD_ORIGIN.clone(), quat: Q.clone(), explode: [0, 0, 5] },
    cpu: { obj: cpu, parent: mobo, pos: bp(...SOCKET, Z + 0.3), quat: Q.clone(), approach: [0, 0, 5], explode: [0, 0, 6] },
    paste: { obj: paste, parent: mobo, pos: bp(...SOCKET, Z + 0.78), quat: Q.clone(), explode: [0, 0, 7] },
    cooler: { obj: cooler, parent: mobo, pos: bp(...SOCKET, Z + 0.8), quat: Q.clone(), approach: [0, 0, 10], explode: [0, 0, 16] },
    ram: { obj: ram, parent: mobo, pos: bp(17.8, 8.75, Z + 0.3), quat: Q.clone(), approach: [0, 0, 7], explode: [0, 0, 9] },
    ssd: {
      obj: ssd, parent: mobo, pos: bp(4.0, 15.0, Z + 0.28), quat: Q.clone(), explode: [0, 0, 5],
      path: [
        { pos: bp(5.8, 15.0, Z + 1.6), quat: qa(0, -0.35, 0) },
        { pos: bp(4.0, 15.0, Z + 0.45), quat: qa(0, -0.35, 0) },
        { pos: bp(4.0, 15.0, Z + 0.28), quat: Q.clone() },
      ],
    },
    psu: { obj: psu, parent: root, pos: new THREE.Vector3(-15, 5.45, -0.5), quat: Q.clone(), approach: [0, 0, 24], explode: [0, -1, 30] },
    gpu: { obj: gpu, parent: root, pos: GPU_POS.clone(), quat: Q.clone(), approach: [0, 0, 14], explode: [0, -2, 20] },
    cables: { obj: cables, parent: root, pos: new THREE.Vector3(), quat: Q.clone() },
    panel: { obj: panel, parent: root, pos: panel.position.clone(), quat: Q.clone(), approach: [0, 0, 16], explode: [62, 0, 12] },
  };
  for (const [id, p] of Object.entries(P)) {
    p.id = id;
    p.obj.userData.partId = id;
    if (p.parent && p.obj.parent !== p.parent) p.parent.add(p.obj);
    if (p.pos) { p.obj.position.copy(p.pos); p.obj.quaternion.copy(p.quat); }
    if (p.approach) p.approach = new THREE.Vector3(...p.approach);
    if (p.explode) p.obj.userData.explode = new THREE.Vector3(...p.explode);
  }
  // Where the board sits during the first build steps: flat on its box, like real builders do.
  P.motherboard.flat = { pos: new THREE.Vector3(-67.2, 7.15, -3.25), quat: qa(-Math.PI / 2, 0, 0) };
  const allFans = [...fans.refs.fans, ...cooler.refs.fans, ...gpu.refs.fans, ...psu.refs.fans];
  root.traverse(o => { if (o.userData.explode) o.userData.home = o.position.clone(); });
  return { root, P, mobo, pcCase, panel, fans: allFans };
}
