// Museum of computing history: real-size models on pedestals, each with a "play" interaction.
import { THREE, M, box, rbox, cyl, boxGeo, cylGeo, merged, canvasTex, mesh, decal, text, shadow, cable } from './kit.js';
import { buildSSD } from './parts.js';
import { EXHIBITS, EXHIBIT_ORDER } from './data.js';

const std = (color, roughness = 0.5, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
const handFont = '"Marker Felt", "Comic Sans MS", "Chalkboard SE", cursive';

// ---------- Punched card (IBM 80-column, real Hollerith code) ----------
function hollerith(ch) {
  if (ch >= '0' && ch <= '9') return [+ch + 2];
  const c = ch.charCodeAt(0) - 65;
  if (c >= 0 && c < 9) return [0, c + 3];     // A–I: zone 12 + 1–9
  if (c >= 9 && c < 18) return [1, c - 6];    // J–R: zone 11 + 1–9
  if (c >= 18 && c < 26) return [2, c - 14];  // S–Z: zone 0 + 2–9
  return [];
}
function punchCard() {
  const IN = 2.54, PXI = 170, W = 7.375, H = 3.25;
  const msg = 'HELLO FUTURE PC BUILDERS';
  const tex = canvasTex(Math.round(W * PXI), Math.round(H * PXI), (g, w, h) => {
    g.fillStyle = '#efe4c4';
    g.beginPath(); g.moveTo(0.25 * PXI, 0); g.lineTo(w, 0); g.lineTo(w, h); g.lineTo(0, h); g.lineTo(0, 0.25 * PXI); g.closePath(); g.fill();
    const colX = c => (0.2785 + c * 0.087) * PXI, rowY = r => (0.25 + r * 0.25) * PXI;
    g.fillStyle = '#b3485a'; g.font = `${0.075 * PXI}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let r = 2; r < 12; r++) for (let c = 0; c < 80; c++) g.fillText(String(r - 2), colX(c), rowY(r));
    g.fillStyle = '#b3485a'; g.font = `${0.05 * PXI}px Arial`;
    for (let c = 0; c < 80; c++) { g.fillText(String(c + 1), colX(c), rowY(2) + 0.1 * PXI); g.fillText(String(c + 1), colX(c), rowY(11) + 0.11 * PXI); }
    g.fillStyle = '#222'; g.font = `bold ${0.1 * PXI}px "Courier New", monospace`;
    [...msg].forEach((ch, c) => g.fillText(ch, colX(c), 0.1 * PXI));
    [...msg].forEach((ch, c) => hollerith(ch).forEach(r => g.clearRect(colX(c) - 0.0275 * PXI, rowY(r) - 0.0625 * PXI, 0.055 * PXI, 0.125 * PXI)));
  });
  const g = new THREE.Group();
  const card = mesh(new THREE.PlaneGeometry(W * IN, H * IN), new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }), 0, H * IN / 2 + 0.6, 0);
  g.add(card);
  g.add(box(W * IN * 0.9, 0.6, 1.2, std(0x2b2f36, 0.4, 0.6), 0, 0.3, 0));
  const light = mesh(new THREE.PlaneGeometry(W * IN * 0.98, H * IN * 0.98), new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0 }), 0, H * IN / 2 + 0.6, -0.4);
  g.add(light);
  return {
    group: g,
    play(on) { this.on = on; },
    update(dt) { light.material.opacity += ((this.on ? 1 : 0) - light.material.opacity) * Math.min(1, dt * 4); },
  };
}

// ---------- Vacuum tube (octal triode) ----------
function vacuumTube() {
  const g = new THREE.Group();
  const bake = std(0x2a1d14, 0.55);
  g.add(cyl(1.6, 1.9, bake, 0, 0.95, 0, 'y', 48));
  g.add(cyl(1.68, 0.25, bake, 0, 0.12, 0, 'y', 48));
  const pins = [];
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.39; pins.push(cylGeo(0.12, 1.0, Math.cos(a) * 0.87, -0.5, Math.sin(a) * 0.87)); }
  g.add(merged(pins, M.steel));
  g.add(cyl(0.4, 1.1, bake, 0, -0.55, 0, 'y', 20));
  const prof = [[1.35, 1.8], [1.45, 2.3], [1.45, 3.6], [1.7, 4.8], [1.85, 6.0], [1.75, 7.2], [1.3, 8.2], [0.6, 8.75], [0.15, 8.9], [0.001, 8.92]].map(([r, y]) => new THREE.Vector2(r, y));
  const glass = mesh(new THREE.LatheGeometry(prof, 64), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0.03, thickness: 0.3, ior: 1.5, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
  glass.castShadow = false;
  g.add(glass);
  const getterProf = prof.slice(6).map(v => new THREE.Vector2(v.x * 0.97, v.y - 0.02));
  g.add(mesh(new THREE.LatheGeometry(getterProf, 48), std(0x9aa0a8, 0.15, 1, { side: THREE.DoubleSide, transparent: true, opacity: 0.85 })));
  const mica = std(0xe8e2d0, 0.4, 0, { transparent: true, opacity: 0.7 });
  g.add(cyl(1.3, 0.05, mica, 0, 3.3, 0, 'y', 32), cyl(1.3, 0.05, mica, 0, 7.0, 0, 'y', 32));
  const plate = std(0x55585e, 0.5, 0.8);
  g.add(box(1.5, 3.4, 0.08, plate, 0, 5.15, 0.5), box(1.5, 3.4, 0.08, plate, 0, 5.15, -0.5), box(0.08, 3.4, 1.0, plate, 0.75, 5.15, 0), box(0.08, 3.4, 1.0, plate, -0.75, 5.15, 0));
  const helix = [];
  for (let i = 0; i <= 120; i++) { const a = i * 0.55; helix.push([Math.cos(a) * 0.32, 3.5 + i * 0.027, Math.sin(a) * 0.32]); }
  g.add(cable(helix, 0.018, M.steel, 400));
  g.add(cyl(0.03, 3.8, M.steel, 0.32, 5.15, 0, 'y', 6), cyl(0.03, 3.8, M.steel, -0.32, 5.15, 0, 'y', 6));
  const fil = std(0x553322, 0.5, 0, { emissive: new THREE.Color(0xff7a1a), emissiveIntensity: 0 });
  g.add(cyl(0.07, 3.4, fil, 0, 5.15, 0, 'y', 10));
  const glow = new THREE.PointLight(0xff8a2a, 0, 20, 2); glow.position.set(0, 5, 0); g.add(glow);
  return {
    group: g,
    play(on) { this.on = on; },
    update(dt, t) {
      const k = this.on ? 1 : 0;
      fil.emissiveIntensity += (k * (3 + Math.sin(t * 17) * 0.2) - fil.emissiveIntensity) * Math.min(1, dt * 2);
      glow.intensity = fil.emissiveIntensity * 3;
    },
  };
}

// ---------- Transistor (TO-92, 2N3904) ----------
function transistor() {
  const g = new THREE.Group();
  const sh = new THREE.Shape(); sh.absarc(0, 0, 0.24, -0.45, Math.PI + 0.45, false); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.48, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, curveSegments: 32 });
  geo.rotateX(-Math.PI / 2); geo.translate(0, 1.3, 0);
  g.add(mesh(geo, std(0x151515, 0.6)));
  g.add(decal(0.36, 0.36, canvasTex(128, 128, (c) => {
    c.clearRect(0, 0, 128, 128);
    text(c, '2N', 64, 52, { size: 34, color: '#c9c9c9', align: 'center' });
    text(c, '3904', 64, 94, { size: 34, color: '#c9c9c9', align: 'center' });
  }), [1, 0, 0], [0, 1, 0], 0, 1.54, 0.107, { transparent: true }));
  const legs = [];
  for (const x of [-0.127, 0, 0.127]) legs.push(boxGeo(0.045, 1.35, 0.04, x, 0.63, -0.02));
  g.add(merged(legs, M.steel));
  const dots = [0, 1, 2].map(() => { const d = mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: 0x7ff3ff })); d.visible = false; g.add(d); return d; });
  return {
    group: g,
    play(on) { this.on = on; dots.forEach(d => (d.visible = on)); },
    update(dt, t) {
      if (!this.on) return;
      dots.forEach((d, i) => {
        const k = (t * 0.8 + i / 3) % 1;
        // electrons flow in on the collector leg and out of the emitter leg
        if (k < 0.5) d.position.set(0.127, 0.05 + k * 2 * 1.25, 0);
        else d.position.set(-0.127, 1.3 - (k - 0.5) * 2 * 1.25, 0);
      });
    },
  };
}

// ---------- 3.5" hard disk drive, lid removed ----------
function hdd() {
  const g = new THREE.Group();
  const W = 10.16, L = 14.7, H = 2.61, T = 0.25;
  const cast = std(0xb9bcc0, 0.45, 0.85);
  g.add(box(W, 0.35, L, cast, 0, 0.175, 0));
  g.add(box(T, H, L, cast, -W / 2 + T / 2, H / 2, 0), box(T, H, L, cast, W / 2 - T / 2, H / 2, 0));
  g.add(box(W, H, T, cast, 0, H / 2, -L / 2 + T / 2), box(W, H, T, cast, 0, H / 2, L / 2 - T / 2));
  g.add(box(W - 0.4, 0.15, L - 1.5, M.pcbGreen, 0, -0.08, 0.3));
  g.add(box(1.6, 0.5, 0.4, M.black, -2.6, 0.25, L / 2 + 0.1), box(2.4, 0.5, 0.4, M.black, 1.4, 0.25, L / 2 + 0.1));
  const screws = [];
  for (const [x, z] of [[-4.7, -6.95], [4.7, -6.95], [-4.7, 6.95], [4.7, 6.95], [-4.7, 0], [4.7, 0]]) screws.push(cylGeo(0.15, 0.05, x, H + 0.02, z));
  g.add(merged(screws, M.steel));
  const spin = new THREE.Group(); spin.position.set(0, 0, -2.05); g.add(spin);
  const chrome = std(0xeef1f5, 0.06, 1);
  spin.add(cyl(4.75, 0.127, chrome, 0, 1.25, 0, 'y', 128), cyl(4.75, 0.127, chrome, 0, 1.75, 0, 'y', 128));
  spin.add(cyl(1.45, 0.25, M.steel, 0, 1.94, 0, 'y', 48));
  const cs = [];
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; cs.push(cylGeo(0.14, 0.08, Math.cos(a) * 1.05, 2.1, Math.sin(a) * 1.05, 'y', 12)); }
  spin.add(merged(cs, M.black));
  // Actuator: pivot, arm, head, voice coil and magnet
  const arm = new THREE.Group(); arm.position.set(3.3, 1.8, 4.3); g.add(arm);
  g.add(cyl(0.55, 1.5, M.steel, 3.3, 1.35, 4.3, 'y', 24));
  const as = new THREE.Shape(); as.moveTo(0, -0.6); as.lineTo(0, 0.6); as.lineTo(-5.9, 0.12); as.lineTo(-5.9, -0.12); as.closePath();
  const ag = new THREE.ExtrudeGeometry(as, { depth: 0.08, bevelEnabled: false }); ag.rotateX(Math.PI / 2);
  arm.add(mesh(ag, M.steel));
  arm.add(box(0.25, 0.1, 0.18, M.black, -5.85, -0.08, 0));
  arm.add(box(1.8, 0.25, 2.1, M.copper, 1.3, 0, 0));
  g.add(rbox(3.0, 0.7, 3.0, 0.2, M.aluDark, 4.3, 1.9, 5.4));
  g.add(box(3.2, 0.03, 0.5, M.orange, 1.2, 0.6, 5.8));
  arm.rotation.y = -1.09;
  let speed = 0;
  return {
    group: g,
    play(on) { this.on = on; },
    update(dt, t) {
      speed += ((this.on ? 28 : 0) - speed) * Math.min(1, dt * 0.8);
      spin.rotation.y += speed * dt;
      const seek = this.on ? Math.sin(t * 3.1) * 0.18 + Math.sin(t * 7.3) * 0.07 : 0.35;
      arm.rotation.y += (-1.09 + seek - arm.rotation.y) * Math.min(1, dt * 6);
    },
  };
}

// ---------- Intel 4004 (16-pin ceramic DIP) ----------
function i4004() {
  const g = new THREE.Group();
  const inner = new THREE.Group(); inner.position.y = 0.55; g.add(inner);
  inner.add(box(2.03, 0.33, 0.76, std(0xf1eee6, 0.6), 0, 0, 0));
  inner.add(decal(2.0, 0.73, canvasTex(800, 292, (c, w, h) => {
    c.fillStyle = '#f1eee6'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#9da0a6'; c.lineWidth = 7;
    for (let i = 0; i < 8; i++) { const x = 45 + i * 101.6; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 50); c.lineTo(400 + (i - 3.5) * 22, 110); c.stroke(); c.beginPath(); c.moveTo(x, h); c.lineTo(x, h - 50); c.lineTo(400 + (i - 3.5) * 22, h - 110); c.stroke(); }
    const grd = c.createLinearGradient(330, 100, 470, 190); grd.addColorStop(0, '#f4d27a'); grd.addColorStop(1, '#b8892f');
    c.fillStyle = grd; c.fillRect(330, 96, 140, 100);
    text(c, 'C4004', 150, 160, { size: 54, color: '#4a4d52', align: 'center' });
    text(c, '1971', 650, 160, { size: 46, color: '#4a4d52', align: 'center', weight: 'normal' });
  }), [1, 0, 0], [0, 0, -1], 0, 0.166, 0, { transparent: false, roughness: 0.45 }));
  const legs = [];
  for (let i = 0; i < 8; i++) for (const s of [-1, 1]) {
    const x = -0.889 + i * 0.254;
    legs.push(boxGeo(0.12, 0.03, 0.12, x, -0.05, s * 0.43), boxGeo(0.12, 0.3, 0.025, x, -0.2, s * 0.49), boxGeo(0.05, 0.35, 0.025, x, -0.5, s * 0.49));
  }
  inner.add(merged(legs, std(0xd9c07a, 0.3, 1)));
  let flip = 0;
  return {
    group: g,
    play(on) { this.on = on; },
    update(dt) { flip += ((this.on ? Math.PI : 0) - flip) * Math.min(1, dt * 4); inner.rotation.x = flip; },
  };
}

// ---------- Soft floppies (8" and 5.25") ----------
function spinDiskTex(size) {
  return canvasTex(512, 512, (c, w) => {
    c.fillStyle = '#3a2616'; c.fillRect(0, 0, w, w);
    for (let i = 0; i < 90; i++) { c.strokeStyle = `rgba(${90 + Math.random() * 40},${60 + Math.random() * 20},30,0.35)`; c.lineWidth = 1 + Math.random() * 2; c.beginPath(); c.arc(256, 256, 60 + Math.random() * 190, 0, 7); c.stroke(); }
    c.fillStyle = '#c9b48a'; c.beginPath(); c.arc(256, 256, 70, 0, 7); c.fill();
    c.fillStyle = '#3a2616'; c.beginPath(); c.arc(256, 256, 42, 0, 7); c.fill();
    c.fillStyle = '#6b5638'; c.fillRect(300, 250, 26, 12);
  });
}
function softFloppy(size, jacket, labelLines) {
  const g = new THREE.Group();
  const h = size / 2, T = size * 0.011;
  const sh = new THREE.Shape();
  const nY = size * 0.18, nH = size * 0.045, nD = size * 0.03;
  sh.moveTo(-h, -h); sh.lineTo(h, -h); sh.lineTo(h, nY - nH); sh.lineTo(h - nD, nY - nH); sh.lineTo(h - nD, nY + nH); sh.lineTo(h, nY + nH); sh.lineTo(h, h); sh.lineTo(-h, h); sh.closePath();
  const hub = new THREE.Path(); hub.absarc(0, 0, size * 0.108, 0, Math.PI * 2, true); sh.holes.push(hub);
  const idx = new THREE.Path(); idx.absarc(size * 0.16, -size * 0.03, size * 0.017, 0, Math.PI * 2, true); sh.holes.push(idx);
  const sw = size * 0.048, sy = -size * 0.3, sl = size * 0.13;
  const slot = new THREE.Path(); slot.absarc(0, sy + sl - sw, sw, 0, Math.PI, false); slot.absarc(0, sy - sl + sw, sw, Math.PI, Math.PI * 2, false); sh.holes.push(slot);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false, curveSegments: 40 });
  geo.translate(0, 0, -T / 2);
  g.add(mesh(geo, std(jacket, 0.8)));
  const disk = mesh(new THREE.CircleGeometry(size * 0.485, 96), std(0xffffff, 0.35, 0.15, { map: spinDiskTex(size), side: THREE.DoubleSide }));
  const hole = mesh(new THREE.CircleGeometry(size * 0.06, 48), new THREE.MeshBasicMaterial({ color: 0x0c0d10, side: THREE.DoubleSide }), 0, 0, 0.001);
  const spinner = new THREE.Group(); spinner.add(disk, hole); g.add(spinner);
  g.add(decal(size * 0.55, size * 0.16, canvasTex(660, 190, (c, w, hh) => {
    c.fillStyle = '#f6f3ea'; c.fillRect(0, 0, w, hh);
    c.strokeStyle = '#8fb3d9'; c.lineWidth = 2; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(0, i * 48); c.lineTo(w, i * 48); c.stroke(); }
    c.fillStyle = '#d33'; c.fillRect(0, 0, w, 10);
    labelLines.forEach((l, i) => text(c, l, 20, 78 + i * 64, { size: 50, color: '#1c3f94', font: handFont, weight: 'normal' }));
  }), [1, 0, 0], [0, 1, 0], -h * 0.36, h * 0.72, T / 2 + 0.005));
  return { group: g, spinner };
}
function spinExhibit(parts, speed = 12) {
  let v = 0;
  return {
    group: parts.group,
    play(on) { this.on = on; },
    update(dt) { v += ((this.on ? speed : 0) - v) * Math.min(1, dt * 1.5); parts.spinner.rotation.z -= v * dt; },
  };
}

// ---------- 3.5" floppy ----------
function floppy35() {
  const g = new THREE.Group();
  const T = 0.33;
  const sh = new THREE.Shape();
  sh.moveTo(-4.5, -4.7); sh.lineTo(4.5, -4.7); sh.lineTo(4.5, 4.25); sh.lineTo(4.05, 4.7); sh.lineTo(-4.5, 4.7); sh.closePath();
  const rect = (x0, y0, x1, y1) => { const p = new THREE.Path(); p.moveTo(x0, y0); p.lineTo(x0, y1); p.lineTo(x1, y1); p.lineTo(x1, y0); p.closePath(); return p; };
  sh.holes.push(rect(-0.5, 1.55, 0.5, 4.05), rect(-4.2, -4.4, -3.8, -3.9), rect(3.8, -4.4, 4.2, -3.9));
  const bg = new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false }); bg.translate(0, 0, -T / 2);
  g.add(mesh(bg, std(0x2356b0, 0.45)));
  g.add(box(0.36, 0.22, T * 0.8, M.black, -4.0, -4.26, 0)); // write-protect slider (half covering = protected off)
  const ssh = new THREE.Shape(); ssh.moveTo(-2.3, 1.35); ssh.lineTo(2.2, 1.35); ssh.lineTo(2.2, 4.72); ssh.lineTo(-2.3, 4.72); ssh.closePath();
  ssh.holes.push(rect(-2.2, 1.55, -1.2, 4.05));
  const sg = new THREE.ExtrudeGeometry(ssh, { depth: T + 0.04, bevelEnabled: false }); sg.translate(0, 0, -(T + 0.04) / 2);
  const shutter = mesh(sg, std(0xc9cdd3, 0.3, 1));
  g.add(shutter);
  const disk = mesh(new THREE.CircleGeometry(4.25, 96), std(0xffffff, 0.35, 0.15, { map: spinDiskTex(9), side: THREE.DoubleSide }));
  const spinner = new THREE.Group(); spinner.position.y = -0.2; spinner.add(disk); g.add(spinner);
  g.add(cyl(1.25, 0.03, M.steel, 0, -0.2, -T / 2 - 0.015, 'z', 48));
  g.add(decal(7.2, 5.3, canvasTex(720, 530, (c, w, h) => {
    c.fillStyle = '#fbfaf5'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#a9c3de'; c.lineWidth = 2; for (let i = 1; i < 7; i++) { c.beginPath(); c.moveTo(20, 60 + i * 64); c.lineTo(w - 20, 60 + i * 64); c.stroke(); }
    text(c, 'HD  1.44 MB', 24, 44, { size: 34, color: '#2356b0', font: 'Arial Black' });
    text(c, 'MY GAMES', 40, 172, { size: 78, color: '#1b1b1b', font: handFont, weight: 'normal' });
    text(c, 'Disk 1 of 3', 40, 300, { size: 62, color: '#c0262d', font: handFont, weight: 'normal' });
    text(c, "DON'T ERASE!!", 40, 430, { size: 62, color: '#1b1b1b', font: handFont, weight: 'normal' });
  }), [1, 0, 0], [0, 1, 0], 0, -1.75, T / 2 + 0.005, { transparent: false }));
  g.add(decal(0.6, 0.6, canvasTex(64, 64, (c) => { c.fillStyle = '#e8eef8'; c.beginPath(); c.moveTo(32, 6); c.lineTo(58, 56); c.lineTo(6, 56); c.fill(); }), [1, 0, 0], [0, 1, 0], -3.6, 3.9, T / 2 + 0.005, { transparent: true }));
  let open = 0, v = 0;
  return {
    group: g,
    play(on) { this.on = on; },
    update(dt) {
      open += ((this.on ? 1.7 : 0) - open) * Math.min(1, dt * 5);
      shutter.position.x = open;
      v += ((this.on ? 10 : 0) - v) * Math.min(1, dt * 1.5);
      spinner.rotation.z -= v * dt;
    },
  };
}

// ---------- IBM PC 5150 + monochrome monitor + keyboard ----------
function ibmpc() {
  const g = new THREE.Group();
  const beige = std(0xd9cfb6, 0.7), dark = std(0x2d2b28, 0.6), darker = std(0x1d1c1a, 0.7);
  g.add(rbox(50, 14.2, 41, 0.5, beige, 0, 7.1, 0));
  for (const x of [2.35, 17.45]) {
    g.add(box(14.7, 8.3, 0.4, dark, x, 6.65, 20.6));
    g.add(box(11, 0.28, 0.1, M.black, x, 7.3, 20.82));
    g.add(box(0.7, 3.2, 0.7, darker, x, 7.3, 21.0));
    g.add(box(0.5, 0.25, 0.1, std(0x551111, 0.4, 0, { emissive: new THREE.Color(0xff2222), emissiveIntensity: 0.2 }), x - 6.3, 3.3, 20.82));
  }
  g.add(decal(14, 6, canvasTex(560, 240, (c, w, h) => {
    c.fillStyle = '#d9cfb6'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#3b3a38'; for (let i = 0; i < 9; i++) c.fillRect(20, 20 + i * 12, 160, 6);
    text(c, 'Personal', 210, 70, { size: 46, color: '#3b3a38' }); text(c, 'Computer', 210, 125, { size: 46, color: '#3b3a38' });
    for (let i = 0; i < 10; i++) c.fillRect(20 + i * 52, 170, 34, 50);
  }), [1, 0, 0], [0, 1, 0], -16, 8, 20.51, { transparent: false }));
  g.add(box(3.0, 5, 0.6, M.red, 25.2, 5, -14));
  // Monitor
  const mon = new THREE.Group(); mon.position.set(-6, 14.2, 2); g.add(mon);
  mon.add(rbox(38, 28, 22, 1.2, beige, 0, 14, 5));
  mon.add(rbox(30, 22, 14, 2, beige, 0, 13, -12));
  const scr = canvasTex(640, 480, () => {});
  const sg = new THREE.PlaneGeometry(26, 19.5, 24, 18);
  const pos = sg.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) / 13, y = pos.getY(i) / 9.75; pos.setZ(i, 0.6 * (1 - (x * x + y * y) / 2)); }
  sg.computeVertexNormals();
  const screen = mesh(sg, new THREE.MeshStandardMaterial({ color: 0x0a120c, roughness: 0.15, metalness: 0.1, emissive: 0xffffff, emissiveMap: scr, emissiveIntensity: 1.1 }), 0, 15, 16.25);
  mon.add(screen);
  const bz = [boxGeo(38, 3.6, 1.2, 0, 27.2 - 1.8, 16.2), boxGeo(38, 4.4, 1.2, 0, 2.2, 16.2), boxGeo(6, 22, 1.2, -16, 15, 16.2), boxGeo(6, 22, 1.2, 16, 15, 16.2)];
  mon.add(merged(bz, beige));
  mon.add(cyl(0.6, 1, dark, 12, 2.2, 17, 'z'), cyl(0.6, 1, dark, 14, 2.2, 17, 'z'));
  // Keyboard (83 keys)
  const kb = new THREE.Group(); kb.position.set(0, 0, 33); g.add(kb);
  const tilt = new THREE.Group(); tilt.rotation.x = 0.1; kb.add(tilt);
  tilt.add(rbox(50, 3.4, 21, 0.6, beige, 0, 1.7, 0));
  const keys = [], grey = [];
  const key = (x, z, w = 1.6, list = keys) => list.push(boxGeo(w, 0.9, 1.6, x, 3.8, z));
  for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) key(-22.4 + c * 1.9, -7.2 + r * 1.9, 1.6, grey);
  const rows = [14, 14, 13, 12];
  rows.forEach((n, r) => { for (let c = 0; c < n; c++) key(-17.5 + r * 0.5 + c * 1.9, -7.2 + r * 1.9); });
  key(-2.5, -7.2 + 4 * 1.9, 16);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) key(12.6 + c * 1.9, -7.2 + r * 1.9, 1.6, grey);
  tilt.add(merged(keys, std(0xe6dfcc, 0.6)), merged(grey, std(0x8f8a80, 0.6)));
  g.add(cable([[0, 2, 22.5], [2, 1.5, 21.5], [6, 0.5, 20.5]], 0.25, darker, 20));

  const lines = ['The IBM Personal Computer DOS', 'Version 1.00 (C)Copyright IBM Corp 1981', '', 'A>dir', 'COMMAND  COM     3231   8-04-81', 'BASIC    COM    10880   8-04-81', 'GAMES    BAS     2944   8-04-81', '        3 File(s)', 'A>'];
  const draw = (n, cursor) => {
    const c = scr.userData.canvas.getContext('2d');
    c.fillStyle = '#000'; c.fillRect(0, 0, 640, 480);
    c.font = 'bold 22px "Courier New", monospace'; c.fillStyle = '#39ff6a'; c.shadowColor = '#39ff6a'; c.shadowBlur = 8;
    let y = 60, shown = 0;
    for (const l of lines) {
      const s = l.slice(0, Math.max(0, n - shown)); shown += l.length + 1;
      c.fillText(s, 40, y); y += 34;
      if (n < shown) { if (cursor) c.fillRect(40 + c.measureText(s).width + 2, y - 54, 12, 22); break; }
    }
    if (n >= shown && cursor) c.fillRect(40 + c.measureText('A>').width + 2, y - 54, 12, 22);
    c.shadowBlur = 0;
    scr.needsUpdate = true;
  };
  const total = lines.join(' ').length + 1;
  let chars = 0, last = '';
  draw(0, true);
  return {
    group: g,
    play(on) { this.on = on; chars = on ? 0 : chars; },
    update(dt, t) {
      if (this.on && chars < total) chars += dt * 24;
      const n = this.on ? Math.floor(chars) : 0, cur = Math.sin(t * 6) > 0, k = n + '|' + cur;
      if (k !== last) { last = k; draw(n, cur); }
    },
  };
}

// ---------- CD-ROM ----------
function cdrom() {
  const g = new THREE.Group();
  const disc = new THREE.Group(); disc.rotation.x = -Math.PI / 2; disc.position.y = 6.3; // rainbow data side faces you
  const spinner = new THREE.Group(); disc.add(spinner); g.add(disc);
  const ring = (r0, r1, t, mat) => mesh(new THREE.LatheGeometry([new THREE.Vector2(r0, -t / 2), new THREE.Vector2(r1, -t / 2), new THREE.Vector2(r1, t / 2), new THREE.Vector2(r0, t / 2), new THREE.Vector2(r0, -t / 2)], 128), mat);
  const clear = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0.05, thickness: 0.12, transparent: true, opacity: 0.5 });
  spinner.add(ring(0.75, 2.25, 0.12, clear));
  spinner.add(ring(1.6, 1.75, 0.16, clear));
  // Data side: mirror-like with a diffraction rainbow (the tracks split light like a prism)
  const rainbow = canvasTex(512, 512, (c, w) => {
    const g = c.createConicGradient(0, w / 2, w / 2);
    ['#ffd1dc', '#fff3c4', '#d4ffd9', '#cdeeff', '#e5d4ff', '#ffd1dc', '#fff3c4', '#d4ffd9', '#cdeeff', '#e5d4ff', '#ffd1dc'].forEach((col, i, a) => g.addColorStop(i / (a.length - 1), col));
    c.fillStyle = g; c.fillRect(0, 0, w, w);
  });
  const data = ring(2.25, 5.9, 0.12, new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: rainbow, metalness: 1, roughness: 0.08, envMapIntensity: 3, iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [200, 900] }));
  // Lathe UVs run around the ring; remap to planar so the conic rainbow sits centred.
  const pos = data.geometry.attributes.position, uv = data.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 12 + 0.5, pos.getZ(i) / 12 + 0.5);
  spinner.add(data);
  spinner.add(ring(5.9, 6.0, 0.12, clear));
  const label = mesh(new THREE.RingGeometry(2.3, 5.88, 128), new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTex(512, 512, (c, w) => {
    const grd = c.createRadialGradient(256, 256, 60, 256, 256, 256); grd.addColorStop(0, '#fff7d6'); grd.addColorStop(1, '#ffd166');
    c.fillStyle = grd; c.fillRect(0, 0, w, w);
    text(c, 'SUPER', 256, 150, { size: 58, color: '#d62d57', align: 'center', font: 'Arial Black' });
    text(c, 'COMPUTER GAMES', 256, 380, { size: 38, color: '#1c3f94', align: 'center', font: 'Arial Black' });
    text(c, 'CD-ROM  ·  650 MB  ·  1995', 256, 430, { size: 22, color: '#333', align: 'center' });
  }) }));
  label.rotation.x = -Math.PI / 2; label.position.y = 0.062;
  spinner.add(label);
  const laser = mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3030 }), 3.5, -0.2, 0);
  laser.visible = false; disc.add(laser);
  g.add(box(4, 0.5, 2.4, std(0x2b2f36, 0.4, 0.6), 0, 0.25, 0));
  g.add(box(0.8, 0.4, 0.8, std(0x2b2f36, 0.4, 0.6), 0, 0.5, 0));
  let v = 0;
  return {
    group: g,
    play(on) { this.on = on; laser.visible = on; },
    update(dt) { v += ((this.on ? 25 : 0) - v) * Math.min(1, dt * 1.2); spinner.rotation.y += v * dt; },
  };
}

// ---------- USB flash drive ----------
function usbStick() {
  const g = new THREE.Group();
  g.add(rbox(5.2, 0.9, 1.9, 0.35, std(0xd8343a, 0.35), 0, 0.45, 0));
  g.add(decal(2.6, 0.9, canvasTex(260, 90, (c, w, h) => { c.clearRect(0, 0, w, h); text(c, '8 MB', w / 2, 62, { size: 54, color: '#fff', align: 'center', font: 'Arial Black' }); }), [1, 0, 0], [0, 0, -1], -0.4, 0.905, 0, { transparent: true }));
  const shell = [boxGeo(1.25, 0.03, 1.2, 3.2, 0.68, 0), boxGeo(1.25, 0.03, 1.2, 3.2, 0.22, 0), boxGeo(1.25, 0.46, 0.03, 3.2, 0.45, 0.6), boxGeo(1.25, 0.46, 0.03, 3.2, 0.45, -0.6)];
  g.add(merged(shell, M.steel));
  g.add(box(1.1, 0.18, 1.1, M.white, 3.25, 0.34, 0));
  g.add(box(0.25, 0.01, 0.25, M.black, 3.3, 0.7, 0.28), box(0.25, 0.01, 0.25, M.black, 3.3, 0.7, -0.28));
  const gold = [];
  for (let i = 0; i < 4; i++) gold.push(boxGeo(0.5, 0.01, 0.14, 3.5, 0.435, -0.36 + i * 0.24));
  g.add(merged(gold, M.gold));
  const ledMat = std(0x331111, 0.4, 0, { emissive: new THREE.Color(0x33ff66), emissiveIntensity: 0 });
  g.add(box(0.2, 0.05, 0.2, ledMat, 2.0, 0.92, 0.5));
  g.add(mesh(new THREE.TorusGeometry(0.35, 0.08, 8, 24), M.steel, -2.9, 0.45, 0));
  const cap = rbox(1.7, 1.0, 2.0, 0.3, std(0xd8343a, 0.35, 0, { transparent: true, opacity: 0.9 }), 3.3, 0.45, 0);
  g.add(cap);
  let k = 0;
  return {
    group: g,
    play(on) { this.on = on; },
    update(dt, t) {
      k += ((this.on ? 1 : 0) - k) * Math.min(1, dt * 4);
      cap.position.set(3.3 + k * 3, 0.45 + Math.sin(k * Math.PI) * 1.2, 0);
      ledMat.emissiveIntensity = this.on && Math.sin(t * 14) > 0 ? 3 : 0;
    },
  };
}

function nvme() {
  const g = new THREE.Group();
  const s = buildSSD(); s.position.set(-4, 1.2, 0); g.add(s);
  g.add(box(3, 0.5, 2, std(0x2b2f36, 0.4, 0.6), 0, 0.25, 0));
  let flip = 0;
  return { group: g, play(on) { this.on = on; }, update(dt) { flip += ((this.on ? Math.PI : 0) - flip) * Math.min(1, dt * 4); s.rotation.y = flip; s.position.x = -4 * Math.cos(flip); s.position.z = 4 * Math.sin(flip); } };
}


// ---------- ENIAC (a section of three panels) ----------
function eniac() {
  const g = new THREE.Group();
  const cab = std(0x23262b, 0.6, 0.4);
  const lamps = [];
  for (let p = 0; p < 3; p++) {
    const x = (p - 1) * 62;
    g.add(box(60, 240, 60, cab, x, 120, 0));
    g.add(decal(54, 220, canvasTex(270, 1100, (c, w, h) => {
      c.fillStyle = '#2d3036'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#555b63'; c.lineWidth = 4; c.strokeRect(10, 10, w - 20, h - 20);
      for (let r = 0; r < 10; r++) for (let k = 0; k < 6; k++) { c.fillStyle = '#111'; c.beginPath(); c.arc(40 + k * 38, 80 + r * 30, 11, 0, 7); c.fill(); c.fillStyle = '#9aa0a8'; c.fillRect(38 + k * 38, 72 + r * 30, 4, 10); }
      for (let r = 0; r < 12; r++) for (let k = 0; k < 10; k++) { c.fillStyle = '#0b0b0c'; c.beginPath(); c.arc(30 + k * 23, 450 + r * 26, 6, 0, 7); c.fill(); }
      c.fillStyle = '#c9ced4'; c.font = 'bold 26px Courier New'; c.fillText(['ACCUMULATOR', 'MULTIPLIER', 'FUNCTION TBL'][p], 26, 800);
    }), [1, 0, 0], [0, 1, 0], x, 125, 30.1, { transparent: false }));
    for (let r = 0; r < 5; r++) for (let k = 0; k < 10; k++) {
      const m = new THREE.MeshStandardMaterial({ color: 0x331a0a, emissive: 0xff7a2a, emissiveIntensity: 0 });
      lamps.push(m);
      g.add(cyl(1.4, 1.2, m, x - 21 + k * 4.7, 205 - r * 5.5, 30.6, 'z', 10));
    }
  }
  for (let i = 0; i < 6; i++) g.add(cable([[-70 + i * 22, 70, 31], [-60 + i * 22, 30, 38], [-40 + i * 22, 60, 31]], 1.2, std(0x151515, 0.6), 30));
  let acc = 0;
  return {
    group: g,
    play(on) { this.on = on; },
    update(dt, t) {
      acc += dt;
      if (acc < 0.08) return; acc = 0;
      lamps.forEach(m => (m.emissiveIntensity = this.on ? (Math.random() < 0.4 ? 3 : 0) : (Math.random() < 0.02 ? 1.5 : m.emissiveIntensity * 0.8)));
    },
  };
}

// ---------- NES console + controller + cartridge ----------
function nes() {
  const g = new THREE.Group();
  const light = std(0xc9c6bd, 0.6), dark = std(0x55565a, 0.6);
  g.add(box(25.4, 4.4, 20.3, light, 0, 2.2, 0));
  g.add(box(25.4, 4.5, 20.3, dark, 0, 6.65, 0));
  g.add(box(14.5, 3.4, 0.3, std(0x3c3d40, 0.6), -3, 5.6, 10.2));
  const led = std(0x330505, 0.4); led.emissive = new THREE.Color(0xff1a1a); led.emissiveIntensity = 0;
  g.add(box(0.6, 0.35, 0.2, led, 9.6, 3.3, 10.2));
  g.add(box(1.6, 0.8, 0.4, std(0x222222, 0.5), 7.3, 3.2, 10.2), box(1.6, 0.8, 0.4, std(0x222222, 0.5), 9.6, 1.6, 10.2));
  const cart = new THREE.Group(); g.add(cart);
  cart.add(box(12, 13.3, 1.8, std(0x8f8d86, 0.6), 0, 0, 0));
  cart.add(decal(9, 7, canvasTex(360, 280, (c, w, h) => { c.fillStyle = '#1b2a6b'; c.fillRect(0, 0, w, h); text(c, 'SUPER', w / 2, 110, { size: 64, color: '#ffc940', align: 'center', font: 'Arial Black' }); text(c, 'BLOCK BROS', w / 2, 190, { size: 44, color: '#fff', align: 'center', font: 'Arial Black' }); }), [1, 0, 0], [0, 1, 0], 0, 2.5, 0.91, { transparent: false }));
  const pad = new THREE.Group(); pad.position.set(-4, 0.6, 20); g.add(pad);
  pad.add(box(12, 1.2, 5.3, std(0xc9c6bd, 0.6), 0, 0, 0));
  pad.add(box(10.8, 0.1, 4.2, std(0x1c1c1e, 0.5), 0, 0.62, 0));
  pad.add(box(2.4, 0.4, 0.8, M.black, -3.3, 0.8, 0.4), box(0.8, 0.4, 2.4, M.black, -3.3, 0.8, 0.4));
  pad.add(cyl(0.55, 0.4, M.red, 3.2, 0.8, 0.8, 'y'), cyl(0.55, 0.4, M.red, 4.6, 0.8, 0.8, 'y'));
  pad.add(box(1.2, 0.2, 0.4, std(0x44454a, 0.5), -0.6, 0.72, 1.0), box(1.2, 0.2, 0.4, std(0x44454a, 0.5), 1.0, 0.72, 1.0));
  g.add(cable([[-4, 0.6, 17.3], [-6, 0.6, 14], [7.3, 3.2, 10.4]], 0.2, std(0x151515, 0.6), 30));
  let k = 0;
  cart.position.set(-3, 19.15, 22);
  return {
    group: g,
    play(on) { this.on = on; },
    update(dt) {
      k += ((this.on ? 1 : 0) - k) * Math.min(1, dt * 3);
      cart.position.set(-3, 6.65 + 12 * (1 - k) + 0.5, 22 - k * 16);
      cart.rotation.x = -Math.PI / 2 * k;
      led.emissiveIntensity = k > 0.95 ? 3 : 0;
    },
  };
}

// ---------- Game Boy ----------
function gameboy() {
  const g = new THREE.Group();
  const body = std(0xc9c8c2, 0.55);
  g.add(rbox(9, 14.8, 3.2, 0.6, body, 0, 7.4, 0));
  g.add(rbox(7.2, 6.2, 0.2, 0.4, std(0x5a5c6e, 0.5), 0, 10.6, 1.62));
  const scr = canvasTex(160, 144, () => {});
  const screen = mesh(new THREE.PlaneGeometry(4.7, 4.25), new THREE.MeshStandardMaterial({ map: scr, roughness: 0.6 }), 0, 10.6, 1.74);
  scr.magFilter = THREE.NearestFilter; scr.minFilter = THREE.NearestFilter;
  g.add(screen);
  g.add(box(2.4, 0.7, 0.4, M.black, -2.4, 4.9, 1.7), box(0.7, 2.4, 0.4, M.black, -2.4, 4.9, 1.7));
  const ab = std(0x8b1f4d, 0.4);
  g.add(cyl(0.55, 0.4, ab, 2.0, 4.4, 1.7, 'z'), cyl(0.55, 0.4, ab, 3.3, 5.2, 1.7, 'z'));
  g.add(box(1.0, 0.25, 0.2, std(0x777777, 0.5), -0.7, 2.6, 1.65), box(1.0, 0.25, 0.2, std(0x777777, 0.5), 0.7, 2.6, 1.65));
  // Falling-blocks demo in 4 shades of green
  const shades = ['#9bbc0f', '#8bac0f', '#306230', '#0f380f'];
  const grid = Array.from({ length: 18 }, () => Array(10).fill(0));
  let piece = { x: 4, y: 0, c: 3 }, acc = 0;
  const draw = () => {
    const c = scr.userData.canvas.getContext('2d');
    c.fillStyle = shades[0]; c.fillRect(0, 0, 160, 144);
    c.fillStyle = shades[2]; c.fillRect(80, 0, 2, 144);
    grid.forEach((row, y) => row.forEach((v, x) => { if (v) { c.fillStyle = shades[v]; c.fillRect(x * 8, y * 8, 7, 7); } }));
    c.fillStyle = shades[piece.c]; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) c.fillRect((piece.x + i) * 8, (piece.y + j) * 8, 7, 7);
    c.fillStyle = shades[3]; c.font = '10px monospace'; c.fillText('SCORE', 100, 20); c.fillText(String(grid.flat().filter(Boolean).length * 10), 100, 34);
    scr.needsUpdate = true;
  };
  draw();
  return {
    group: g,
    play(on) { this.on = on; },
    update(dt) {
      if (!this.on) return;
      acc += dt; if (acc < 0.12) return; acc = 0;
      const below = piece.y + 2 >= 18 || grid[piece.y + 2][piece.x] || grid[piece.y + 2][piece.x + 1];
      if (below) {
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) grid[piece.y + j][piece.x + i] = piece.c;
        for (let y = 17; y >= 0; y--) if (grid[y].every(Boolean)) { grid.splice(y, 1); grid.unshift(Array(10).fill(0)); }
        if (grid[1].some(Boolean)) grid.forEach(r => r.fill(0));
        piece = { x: Math.floor(Math.random() * 9), y: 0, c: 1 + Math.floor(Math.random() * 3) };
      } else piece.y++;
      draw();
    },
  };
}

// ---------- First iPhone ----------
function iphone() {
  const g = new THREE.Group();
  // Rounded-rectangle outline (the 2007 iPhone had big, soft corners)
  const rr = (w, h, r, depth, bevel) => {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 4, curveSegments: 16 });
    geo.translate(0, 0, -depth / 2);
    return geo;
  };
  g.add(mesh(rr(5.9, 11.3, 1.0, 0.9, 0.12), std(0xb9bdc3, 0.3, 1), 0, 5.75, 0));
  g.add(mesh(rr(5.8, 11.2, 0.95, 0.04, 0), std(0x050506, 0.1, 0.2), 0, 5.75, 0.58));
  const scr = canvasTex(320, 480, () => {});
  const mat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: scr, emissiveIntensity: 0 });
  g.add(mesh(new THREE.PlaneGeometry(4.95, 7.43), mat, 0, 6.0, 0.62));
  g.add(cyl(0.55, 0.05, std(0x1b1b1d, 0.3), 0, 1.2, 0.61, 'z', 32));
  const c = scr.userData.canvas.getContext('2d');
  const grd = c.createLinearGradient(0, 0, 0, 480); grd.addColorStop(0, '#0c1a3a'); grd.addColorStop(1, '#2b5cd6');
  c.fillStyle = grd; c.fillRect(0, 0, 320, 480);
  const cols = ['#4ade80', '#ffc940', '#ff6b6b', '#4fe3ff', '#b064e6', '#f39a3d', '#59c7d8', '#d97ab5', '#7aa36d', '#e0584f', '#8c96a8', '#3f8fe8'];
  cols.forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.roundRect(22 + (i % 4) * 74, 40 + Math.floor(i / 4) * 90, 56, 56, 12); c.fill(); });
  c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(0, 400, 320, 80);
  ['#4ade80', '#4fe3ff', '#ffc940', '#ff6b6b'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.roundRect(22 + i * 74, 412, 56, 56, 12); c.fill(); });
  scr.needsUpdate = true;
  return {
    group: g,
    play(on) { this.on = on; },
    update(dt) { mat.emissiveIntensity += ((this.on ? 1 : 0.02) - mat.emissiveIntensity) * Math.min(1, dt * 4); },
  };
}


// ---------- 56k external dial-up modem ----------
function modem() {
  const g = new THREE.Group();
  const shell = std(0x2b2d31, 0.5, 0.2);
  g.add(rbox(17, 3.2, 12.5, 0.8, shell, 0, 1.6, 0));
  g.add(box(15, 0.9, 0.2, std(0x15161a, 0.3), 0, 1.9, 6.26));
  const labels = ['HS', 'AA', 'CD', 'OH', 'RD', 'SD', 'TR', 'MR'];
  const leds = labels.map((l, i) => {
    const m = std(0x1a0505, 0.4); m.emissive = new THREE.Color(0xff3322); m.emissiveIntensity = 0;
    g.add(box(0.6, 0.35, 0.15, m, -6.3 + i * 1.8, 2.05, 6.38));
    return m;
  });
  g.add(decal(15, 1.2, canvasTex(750, 60, (c, w, h) => { c.fillStyle = '#15161a'; c.fillRect(0, 0, w, h); labels.forEach((l, i) => text(c, l, 60 + i * 90, 42, { size: 26, color: '#c9ced6', align: 'center' })); }), [1, 0, 0], [0, 1, 0], 0, 1.0, 6.27, { transparent: false }));
  g.add(decal(8, 2, canvasTex(400, 100, (c, w, h) => { c.clearRect(0, 0, w, h); text(c, '56K', 20, 70, { size: 64, color: '#e8ecf0', font: 'Arial Black' }); text(c, 'V.90 FAX MODEM', 170, 64, { size: 26, color: '#9aa4b0' }); }), [1, 0, 0], [0, 0, -1], -2, 3.21, -1, { transparent: true }));
  g.add(cable([[0, 1, -6.3], [2, 0.3, -10], [8, 0.3, -12]], 0.18, std(0xd9d6cc, 0.6), 30));
  let t0 = 0;
  return {
    group: g,
    play(on) { this.on = on; t0 = performance.now(); },
    update(dt, t) {
      const s = (performance.now() - t0) / 1000;
      leds[0].emissiveIntensity = 2;     // HS: high speed
      leds[7].emissiveIntensity = 2;     // MR: modem ready
      leds[3].emissiveIntensity = this.on ? 2 : 0;                  // OH: off hook
      leds[2].emissiveIntensity = this.on && s > 6.1 ? 2 : 0;       // CD: carrier detect (connected)
      const data = this.on && s > 8;
      leds[4].emissiveIntensity = data && Math.random() < 0.5 ? 2 : 0; // RD: receive data
      leds[5].emissiveIntensity = data && Math.random() < 0.3 ? 2 : 0; // SD: send data
      leds[6].emissiveIntensity = 2;     // TR: terminal ready
      leds[1].emissiveIntensity = 0;
    },
  };
}

// ---------- Museum hall ----------
const BUILDERS = {
  punchcard: [punchCard, 18, { tilt: 0 }],
  tube: [vacuumTube, 13],
  transistor: [transistor, 12],
  hdd: [hdd, 15, { tilt: 0.55 }],
  i4004: [i4004, 12, { tilt: 0.45 }],
  floppy8: [() => spinExhibit(softFloppy(20.32, 0x1b1b1d, ['SYSTEM', 'MICROCODE'])), 16],
  floppy525: [() => spinExhibit(softFloppy(13.335, 0x141414, ['SPACE GAME', 'side A'])), 14],
  ibmpc: [ibmpc, 22, { spin: false }],
  floppy35: [floppy35, 12],
  cd: [cdrom, 13],
  usb: [usbStick, 12, { tilt: 0.4 }],
  eniac: [eniac, 22, { spin: false }],
  nes: [nes, 16],
  gameboy: [gameboy, 13],
  iphone: [iphone, 13],
  modem: [modem, 14, { tilt: 0.35 }],
  nvme: [nvme, 14],
};

function plaqueTex(ex) {
  return canvasTex(640, 220, (c, w, h) => {
    const grd = c.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#2a2f3a'); grd.addColorStop(1, '#171a21');
    c.fillStyle = grd; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#ffc940'; c.lineWidth = 6; c.strokeRect(8, 8, w - 16, h - 16);
    text(c, ex.year, w / 2, 90, { size: 64, color: '#ffc940', align: 'center', font: 'Fredoka, Arial Black' });
    text(c, ex.name, w / 2, 160, { size: 40, color: '#eef3fb', align: 'center', font: 'Fredoka, Arial' });
  });
}

export function buildMuseum(envTex) {
  const scene = new THREE.Scene();
  scene.environment = envTex;
  scene.environmentIntensity = 0.35;
  scene.background = canvasTex(4, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0b0e16'); g.addColorStop(1, '#1d2230'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  scene.fog = new THREE.Fog(0x141824, 160, 420);
  const SP = 44, N = EXHIBIT_ORDER.length, len = SP * (N - 1);
  const floor = mesh(new THREE.PlaneGeometry(len + 400, 300), std(0x1a1d25, 0.32, 0.3), len / 2, 0, 0);
  floor.rotation.x = -Math.PI / 2; floor.castShadow = false; scene.add(floor);
  const wall = box(len + 400, 80, 2, std(0x232838, 0.8), len / 2, 40, -48);
  wall.castShadow = false; scene.add(wall);
  const sign = decal(90, 14, canvasTex(1800, 280, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    text(c, 'THE TIME MACHINE MUSEUM', w / 2, 150, { size: 150, color: '#ffc940', align: 'center', font: 'Fredoka, Arial Black' });
    text(c, 'How computers got small, fast and smart', w / 2, 250, { size: 70, color: '#aebbd0', align: 'center', font: 'Fredoka, Arial' });
  }), [1, 0, 0], [0, 1, 0], len / 2, 52, -46.9, { transparent: true, emissive: 0xffffff, emissiveIntensity: 0.35 });
  scene.add(sign);
  const line = mesh(new THREE.PlaneGeometry(len + 60, 0.5), new THREE.MeshBasicMaterial({ color: 0xffc940 }), len / 2, 0.03, 16);
  line.rotation.x = -Math.PI / 2; scene.add(line);

  scene.add(new THREE.HemisphereLight(0xc8d6ff, 0x221a14, 0.45));
  const key = new THREE.DirectionalLight(0xfff0dd, 1.3);
  key.position.set(30, 80, 60); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 250 });
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.03;
  scene.add(key, key.target);

  const pool = canvasTex(256, 256, (c, w) => { const g = c.createRadialGradient(128, 128, 10, 128, 128, 128); g.addColorStop(0, 'rgba(255,230,180,0.18)'); g.addColorStop(1, 'rgba(255,230,180,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); });
  const stone = std(0x2c313d, 0.55, 0.2); // dark plinths so the exhibits stand out
  const shine = o => { if (o.material?.metalness > 0.9 && o.material.roughness < 0.15) { o.material.envMap = envTex; o.material.envMapIntensity = 2.2; } };
  const items = EXHIBIT_ORDER.map((id, i) => {
    const [make, size, opt = {}] = BUILDERS[id];
    const x = i * SP;
    const ex = make();
    const model = ex.group;
    shadow(model);
    model.traverse(shine);
    model.traverse(o => { if (o.material && o.material.transparent && o.material.depthWrite === false) o.castShadow = false; });
    // Fit to display size and note the real scale honestly
    const b = new THREE.Box3().setFromObject(model), dim = b.getSize(new THREE.Vector3());
    const s = size / Math.max(dim.x, dim.y, dim.z);
    const inner = new THREE.Group(); inner.add(model);
    model.position.set(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
    inner.scale.setScalar(s);
    inner.rotation.x = opt.tilt || 0;
    inner.position.y = -new THREE.Box3().setFromObject(inner).min.y;
    const holder = new THREE.Group(); holder.position.set(x, 10.2, 0); holder.add(inner);
    scene.add(holder);
    const ped = mesh(new THREE.CylinderGeometry(8, 8.8, 10, 64), stone, x, 5, 0);
    scene.add(ped);
    scene.add(mesh(new THREE.TorusGeometry(8, 0.15, 8, 64).rotateX(Math.PI / 2), M.gold, x, 10.05, 0));
    const pl = mesh(new THREE.PlaneGeometry(22, 1), new THREE.MeshBasicMaterial({ map: pool, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), x, 0.05, 0);
    pl.scale.y = 22; pl.rotation.x = -Math.PI / 2; scene.add(pl);
    const plaque = decal(9, 3.1, plaqueTex(EXHIBITS[id]), [1, 0, 0], [0, 0.8, -0.6], x, 1.2, 13.5, { transparent: false });
    plaque.castShadow = false; scene.add(plaque, box(9.6, 0.5, 2.2, std(0x2b2f36, 0.4, 0.6), x, 0.25, 13.5));
    const note = s > 1.3 ? `Shown ${Math.round(s)}× bigger than real life` : s < 0.77 ? `Shown at about 1/${Math.round(1 / s)} of real size` : 'Shown at real size';
    const h = dim.y * s;
    return { id, index: i, x, holder, ex, note, spin: opt.spin !== false, focus: new THREE.Vector3(x, 10.2 + Math.min(h, size) / 2, 0), size, playing: false };
  });

  return {
    scene, items, key,
    update(dt, t, current) {
      items.forEach((it, i) => {
        it.ex.update?.(dt, t);
        if (it.spin) it.holder.rotation.y = Math.sin(t * 0.35 + i) * 0.45;
      });
      const f = items[current];
      key.position.set(f.x + 30, 80, 60); key.target.position.set(f.x, 10, 0);
    },
  };
}
