// Shared 3D helpers: materials, geometry shortcuts, canvas textures, fans.
// Units: 1 = 1 cm, so parts use real-world dimensions.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export { THREE };

const std = (color, roughness = 0.5, metalness = 0, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

export const M = {
  pcb: std(0x15181c, 0.62),
  pcbGreen: std(0x1f5b3a, 0.55),
  black: std(0x101113, 0.5),
  matte: std(0x1a1b1e, 0.8),
  grey: std(0x5a5e66, 0.5),
  white: std(0xeeeeea, 0.45),
  cream: std(0xe9dfc4, 0.7),
  beige: std(0xd9cfb4, 0.65),
  alu: std(0xc4c8ce, 0.32, 1),
  aluDark: std(0x3b3f46, 0.38, 0.9),
  steel: std(0x9aa0a8, 0.4, 0.95),
  caseSteel: std(0x1c1e22, 0.45, 0.6),
  copper: std(0xc9794a, 0.28, 1),
  gold: std(0xe0b04a, 0.22, 1),
  chip: std(0x18181a, 0.35),
  rubber: std(0x0b0b0c, 0.9),
  blue: std(0x2a6fd6, 0.45),
  red: std(0xd8343a, 0.45),
  yellow: std(0xf2c230, 0.45),
  orange: std(0xf07f22, 0.5),
  brown: std(0x5a3a22, 0.6),
  cardboard: std(0xb58b5a, 0.9),
  choke: std(0x3c3f45, 0.55, 0.4),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0xb8c8d8, metalness: 0, roughness: 0.02, transparent: true, opacity: 0.1,
    envMapIntensity: 1.6, ior: 1.5, side: THREE.DoubleSide, depthWrite: false,
  }),
};

export function shadow(o) {
  o.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  return o;
}

export function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

export const box = (w, h, d, mat, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
export const rbox = (w, h, d, r, mat, x, y, z) => mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat, x, y, z);

// Cylinder along an axis ('x' | 'y' | 'z').
export function cyl(r, len, mat, x, y, z, axis = 'y', seg = 24) {
  const m = mesh(new THREE.CylinderGeometry(r, r, len, seg), mat, x, y, z);
  if (axis === 'x') m.rotation.z = Math.PI / 2;
  if (axis === 'z') m.rotation.x = Math.PI / 2;
  return m;
}

// Geometry builders for merging many repeated pieces into one draw call.
export function boxGeo(w, h, d, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}
export function cylGeo(r, len, x, y, z, axis = 'y', seg = 16) {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}
export function merged(geos, mat) {
  // Strip to position/normal/uv so mixed geometry types merge cleanly.
  const clean = geos.map(g => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
    return n;
  });
  return mesh(mergeGeometries(clean), mat);
}

// Box with a texture on one face only (face index: 0 +x, 1 -x, 2 +y, 3 -y, 4 +z, 5 -z).
export function faceBox(w, h, d, base, face, tex, x, y, z, opts = {}) {
  const top = base.clone();
  top.map = tex;
  top.color = new THREE.Color(0xffffff);
  Object.assign(top, opts);
  const mats = Array(6).fill(base);
  mats[face] = top;
  return mesh(new THREE.BoxGeometry(w, h, d), mats, x, y, z);
}

export function canvasTex(w, h, draw, { repeat, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.userData.canvas = c;
  return t;
}

// Seeded random so procedural details look the same every load.
export function rng(seed = 1) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

// Perforated metal (hex holes) as an alpha map for mesh panels and grilles.
export function meshAlpha(cells = 64) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#000';
    const s = w / cells * 4;
    for (let row = 0; row * s * 0.87 < h + s; row++)
      for (let col = 0; col * s < w + s; col++) {
        const cx = col * s + (row % 2 ? s / 2 : 0), cy = row * s * 0.87;
        g.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 6 + i * Math.PI / 3;
          g.lineTo(cx + Math.cos(a) * s * 0.4, cy + Math.sin(a) * s * 0.4);
        }
        g.fill();
      }
  }, { srgb: false });
}

// ---------- Fans ----------
function bladeGeo(r0, r1, sweep, pitch, thick) {
  const P = (r, a) => new THREE.Vector2(r * Math.cos(a - sweep / 2), r * Math.sin(a - sweep / 2));
  const s = new THREE.Shape();
  const pts = [];
  for (let t = 0; t <= 1.001; t += 0.1) pts.push(P(r0 + (r1 - r0) * t, sweep * 0.3 * t * t));   // leading edge
  for (let t = 0; t <= 1.001; t += 0.1) pts.push(P(r1, sweep * (0.3 + 0.7 * t)));                // tip
  for (let t = 1; t >= -0.001; t -= 0.1) pts.push(P(r0 + (r1 - r0) * t, sweep * (0.55 + 0.45 * t * t))); // trailing
  s.setFromPoints(pts);
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false, curveSegments: 4 });
  g.translate(0, 0, -thick / 2);
  g.rotateX(pitch); // twist around the radial axis gives the blade its angle of attack
  return g;
}

/**
 * Axial fan. Axis = local Z. Intake face = +Z, air leaves toward -Z (the strut side),
 * exactly like real fans: air blows out of the side with the support arms.
 */
export function makeFan(size = 12, { frame = true, rgb = null, blades = 9, bladeMat, hubLabel = true, depth = 2.5 } = {}) {
  const g = new THREE.Group();
  const R = size / 2 - 0.35;
  if (frame) {
    const sh = new THREE.Shape();
    const h = size / 2, rr = 0.6;
    sh.moveTo(-h + rr, -h); sh.lineTo(h - rr, -h); sh.quadraticCurveTo(h, -h, h, -h + rr);
    sh.lineTo(h, h - rr); sh.quadraticCurveTo(h, h, h - rr, h); sh.lineTo(-h + rr, h);
    sh.quadraticCurveTo(-h, h, -h, h - rr); sh.lineTo(-h, -h + rr); sh.quadraticCurveTo(-h, -h, -h + rr, -h);
    const hole = new THREE.Path(); hole.absarc(0, 0, R + 0.15, 0, Math.PI * 2, true);
    sh.holes.push(hole);
    const fg = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 48 });
    fg.translate(0, 0, -depth / 2);
    g.add(mesh(fg, M.black));
    // Corner screw holes
    for (const sx of [-1, 1]) for (const sy of [-1, 1])
      g.add(cyl(0.22, depth + 0.02, M.rubber, sx * (h - 0.75), sy * (h - 0.75), 0, 'z', 12));
    // Motor struts on the exhaust side (-Z)
    const struts = [];
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2;
      const b = boxGeo(R, 0.35, 0.3, R / 2, 0, 0);
      b.rotateZ(a); b.translate(0, 0, -depth / 2 + 0.2);
      struts.push(b);
    }
    g.add(merged(struts, M.black));
    if (rgb) {
      const ring = mesh(new THREE.TorusGeometry(R + 0.12, 0.12, 8, 64), rgbMaterial(rgb));
      ring.position.z = depth / 2 - 0.1;
      ring.userData.rgb = true;
      g.add(ring);
    }
  }
  const hubR = size * 0.19;
  const stator = cyl(hubR * 0.9, 0.4, M.black, 0, 0, -depth / 2 + 0.2, 'z', 32);
  g.add(stator);

  const rotor = new THREE.Group();
  const bg = [];
  for (let i = 0; i < blades; i++) {
    const b = bladeGeo(hubR - 0.1, R, (Math.PI * 2 / blades) * 1.15, 0.5, 0.07);
    b.rotateZ(i * Math.PI * 2 / blades);
    bg.push(b);
  }
  const bm = bladeMat || (rgb ? new THREE.MeshStandardMaterial({ color: 0xdfe6ee, roughness: 0.3, transparent: true, opacity: 0.8, emissive: new THREE.Color(rgb), emissiveIntensity: 0.0 }) : M.black);
  const bladesMesh = merged(bg, bm);
  if (rgb && !bladeMat) { bm.userData.hue = new THREE.Color(rgb).getHSL({}).h; bm.userData.k = 0.3; rgbMats.push(bm); }
  rotor.add(bladesMesh);
  const hub = cyl(hubR, depth * 0.85, M.black, 0, 0, 0.05, 'z', 40);
  rotor.add(hub);
  if (hubLabel) {
    const lab = mesh(new THREE.CircleGeometry(hubR * 0.85, 40), new THREE.MeshStandardMaterial({ map: fanLabel(), roughness: 0.5 }));
    lab.position.z = depth * 0.43 + 0.06;
    rotor.add(lab);
  }
  g.add(rotor);
  g.refs = { rotor };
  return g;
}

let _fanLabel;
function fanLabel() {
  return _fanLabel ||= canvasTex(256, 256, (g, w) => {
    g.fillStyle = '#16171a'; g.fillRect(0, 0, w, w);
    g.strokeStyle = '#3a3d44'; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 110, 0, 7); g.stroke();
    g.fillStyle = '#9aa3ad'; g.font = 'bold 34px Arial'; g.textAlign = 'center';
    g.fillText('12V  0.25A', 128, 118);
    g.font = '24px Arial'; g.fillText('DC BRUSHLESS', 128, 156);
  });
}

// Every RGB material is registered so power on/off and colour cycling can drive them together.
export const rgbMats = [];
export function rgbMaterial(color) {
  const m = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: new THREE.Color(color), emissiveIntensity: 0, roughness: 0.4 });
  m.userData.hue = new THREE.Color(color).getHSL({}).h;
  rgbMats.push(m);
  return m;
}

// Glowing "ghost" copy used to show where a part goes.
export function ghostOf(obj) {
  const mat = new THREE.MeshBasicMaterial({ color: 0x4fe3ff, transparent: true, opacity: 0.28, depthWrite: false });
  const g = obj.clone(true);
  const tags = [];
  g.traverse(c => { if (c.isCSS2DObject) tags.push(c); else if (c.isMesh) { c.material = mat; c.castShadow = false; } });
  tags.forEach(c => c.removeFromParent());
  g.ghostMat = mat;
  return g;
}

// Tube cable along points; drawRange lets it "grow" in an animation.
export function cable(points, r, mat, seg = 80) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.3);
  const geo = new THREE.TubeGeometry(curve, seg, r, 12, false);
  const m = mesh(geo, mat);
  m.userData.total = geo.index.count;
  return m;
}

// Flat textured plane oriented by its right/up axes (normal = right × up).
export function decal(w, h, tex, right, up, x = 0, y = 0, z = 0, opts = {}) {
  const g = new THREE.PlaneGeometry(w, h);
  const r = new THREE.Vector3(...right), u = new THREE.Vector3(...up);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(r, u, r.clone().cross(u)));
  const m = mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, ...opts }), x, y, z);
  m.castShadow = false;
  return m;
}

// Flat rounded-rectangle slab (phones, laptops): w along x, d along z, thickness t along y, bottom at y=0.
export function roundedSlab(w, d, r, t, hole) {
  const path = (P, w, d, r) => {
    const x = -w / 2, y = -d / 2;
    P.moveTo(x + r, y); P.lineTo(x + w - r, y); P.quadraticCurveTo(x + w, y, x + w, y + r); P.lineTo(x + w, y + d - r);
    P.quadraticCurveTo(x + w, y + d, x + w - r, y + d); P.lineTo(x + r, y + d); P.quadraticCurveTo(x, y + d, x, y + d - r); P.lineTo(x, y + r); P.quadraticCurveTo(x, y, x + r, y);
    return P;
  };
  const s = path(new THREE.Shape(), w, d, r);
  if (hole) s.holes.push(path(new THREE.Path(), ...hole));
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 12 });
  g.rotateX(-Math.PI / 2); // shape y -> -z, extrusion -> +y
  return g;
}

// Phillips screw head facing +Z.
export function screw(r = 0.32, mat = M.steel) {
  const g = new THREE.Group();
  g.add(cyl(r, 0.18, mat, 0, 0, 0.09, 'z', 20));
  g.add(merged([boxGeo(r * 1.2, r * 0.22, 0.05, 0, 0, 0.18), boxGeo(r * 0.22, r * 1.2, 0.05, 0, 0, 0.18)], M.black));
  return g;
}

export function text(g, str, x, y, { size = 20, color = '#fff', font = 'Arial', weight = 'bold', align = 'left', base = 'alphabetic' } = {}) {
  g.font = `${weight} ${size}px ${font}`;
  g.fillStyle = color; g.textAlign = align; g.textBaseline = base;
  g.fillText(str, x, y);
}
