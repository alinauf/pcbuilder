import { THREE, rgbMats, ghostOf, canvasTex, mesh, box } from './kit.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { buildPC, buildSyringe, BOARD_ORIGIN } from './parts.js';
import { buildMuseum } from './museum.js';
import { PARTS, STEPS, TRAY, FIND, EXHIBITS, EXHIBIT_ORDER, FLOPPY_ITEMS, HEIGHTS } from './data.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const store = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Renderer, camera, post-processing ----------
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const envTex = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 1, 3000);
camera.position.set(80, 60, 120);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 6;
controls.maxDistance = 420;
controls.target.set(0, 22, 0);

const labels = new CSS2DRenderer();
labels.setSize(innerWidth, innerHeight);
labels.domElement.className = 'labels';
document.body.appendChild(labels.domElement);

// ---------- Workshop scene ----------
const workshop = new THREE.Scene();
workshop.environment = envTex;
workshop.environmentIntensity = 0.55;
workshop.background = canvasTex(4, 256, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0c111b'); g.addColorStop(0.6, '#1a2333'); g.addColorStop(1, '#262f40');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});
workshop.fog = new THREE.Fog(0x1b2332, 260, 720);
workshop.add(new THREE.HemisphereLight(0xdfe9ff, 0x2a2016, 0.55));
const key = new THREE.DirectionalLight(0xfff1e0, 2.3);
key.position.set(70, 130, 90);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -100, right: 80, top: 90, bottom: -60, near: 10, far: 400 });
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
workshop.add(key);
const rim = new THREE.DirectionalLight(0x8fb4ff, 0.8); rim.position.set(-90, 50, -70); workshop.add(rim);

const wood = canvasTex(1024, 1024, (c, w, h) => {
  c.fillStyle = '#6b4a2f'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) {
    const y = Math.random() * h, a = 0.05 + Math.random() * 0.12;
    c.strokeStyle = Math.random() < 0.5 ? `rgba(40,24,12,${a})` : `rgba(160,110,70,${a})`;
    c.lineWidth = 1 + Math.random() * 4; c.beginPath(); c.moveTo(0, y);
    for (let x = 0; x <= w; x += 32) c.lineTo(x, y + Math.sin(x * 0.01 + i) * 6);
    c.stroke();
  }
  for (let i = 1; i < 4; i++) { c.fillStyle = 'rgba(20,12,6,0.5)'; c.fillRect(0, i * h / 4, w, 3); }
}, { repeat: [4, 3] });
const desk = mesh(new THREE.PlaneGeometry(700, 500), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.6 }), -20, 0, 0);
desk.rotation.x = -Math.PI / 2; desk.castShadow = false; workshop.add(desk);
const matTex = canvasTex(1024, 720, (c, w, h) => {
  c.fillStyle = '#3f6c8f'; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 2;
  for (let x = 0; x < w; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
  for (let y = 0; y < h; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,0.6)'; c.font = 'bold 34px Fredoka, Arial'; c.fillText('⚡ ANTI-STATIC WORK MAT', 30, h - 30);
});
const antiMat = mesh(new THREE.PlaneGeometry(76, 54), new THREE.MeshStandardMaterial({ map: matTex, roughness: 0.9 }), -55, 0.06, 12);
antiMat.rotation.x = -Math.PI / 2; antiMat.castShadow = false; workshop.add(antiMat);
const moboBox = box(34, 7, 28, new THREE.MeshStandardMaterial({ color: 0x1d2330, roughness: 0.8 }), -55, 3.5, 12);
workshop.add(moboBox);

const pc = buildPC();
const P = pc.P;
workshop.add(pc.root);
const socketGroup = pc.mobo.refs.socket.plate.parent;
const powerRefs = pc.pcCase.refs.power;

// ---------- Post-processing ----------
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(workshop, camera);
const outline = new OutlinePass(new THREE.Vector2(innerWidth, innerHeight), workshop, camera);
Object.assign(outline, { edgeStrength: 4, edgeGlow: 0.6, edgeThickness: 1.5, pulsePeriod: 2.5 });
outline.visibleEdgeColor.set(0xffc940); outline.hiddenEdgeColor.set(0x7a5a10);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.45, 0.95);
composer.addPass(renderPass); composer.addPass(outline); composer.addPass(bloom); composer.addPass(new OutputPass());

// ---------- Tweens ----------
const ease = {
  inOut: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  out: k => 1 - Math.pow(1 - k, 3),
  back: k => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2),
  lin: k => k,
};
const tweens = new Set();
const tween = (dur, fn, e = ease.inOut) => new Promise(res => tweens.add({ t: 0, dur: reduceMotion ? Math.min(dur, 0.15) : dur, fn, e, res }));
const wait = s => tween(s, () => {}, ease.lin);
function runTweens(dt) {
  for (const tw of tweens) {
    tw.t += dt;
    const k = Math.min(1, tw.t / tw.dur);
    tw.fn(tw.e(k));
    if (k >= 1) { tweens.delete(tw); tw.res(); }
  }
}
function fly(target, camPos, dur = 1.3) {
  const t0 = controls.target.clone(), c0 = camera.position.clone();
  return tween(dur, k => { controls.target.lerpVectors(t0, target, k); camera.position.lerpVectors(c0, camPos, k); });
}
async function path(obj, keys, dur = 0.8) {
  for (const k of keys) {
    const p0 = obj.position.clone(), q0 = obj.quaternion.clone();
    await tween(k.dur || dur, e => { obj.position.lerpVectors(p0, k.pos, e); if (k.quat) obj.quaternion.slerpQuaternions(q0, k.quat, e); });
  }
}
const pop = (obj, dur = 0.35) => { obj.visible = true; return tween(dur, k => obj.scale.setScalar(Math.max(0.001, k)), ease.back); };

// ---------- Sound (tiny WebAudio synth) ----------
let ac, muted = store.get('muted') === '1';
function tone(f, d = 0.12, type = 'sine', vol = 0.12, when = 0, slide) {
  if (muted) return;
  ac ||= new AudioContext();
  const t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
}
function whoosh(d = 2.5) {
  if (muted) return;
  ac ||= new AudioContext();
  const len = ac.sampleRate * d, buf = ac.createBuffer(1, len, ac.sampleRate), data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.min(1, i / (len * 0.5)) * (1 - i / len) * 0.5;
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  f.type = 'lowpass'; f.frequency.value = 700; g.gain.value = 0.25;
  src.buffer = buf; src.connect(f).connect(g).connect(ac.destination); src.start();
}
const sfx = {
  click: () => tone(880, 0.05, 'square', 0.04),
  snap: () => { tone(1400, 0.03, 'square', 0.06); tone(700, 0.05, 'square', 0.05, 0.03); },
  ok: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.1, i * 0.08)),
  no: () => tone(220, 0.25, 'sawtooth', 0.05, 0, 140),
  pop: () => tone(500, 0.12, 'sine', 0.1, 0, 900),
  beep: () => tone(1000, 0.22, 'square', 0.07),
};

// ---------- Reading level + speech ----------
let level = store.get('level') || 'kid';
const say = text => {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, ''));
  u.rate = level === 'kid' ? 0.92 : 1; u.pitch = level === 'kid' ? 1.1 : 1;
  speechSynthesis.speak(u);
};

// ---------- Power / RGB ----------
const power = { level: 0, target: 0 };
function updatePower(dt, t) {
  power.level += (power.target - power.level) * Math.min(1, dt * 1.2);
  for (const f of pc.fans) f.refs.rotor.rotation.z += dt * 30 * power.level;
  for (const m of rgbMats) {
    m.emissiveIntensity = power.level * 2.4 * (m.userData.k ?? 1);
    m.emissive.setHSL((m.userData.hue + t * 0.04) % 1, 1, 0.55);
  }
  const pulse = build.awaitPower ? 1.5 + Math.sin(t * 6) * 1.5 : 0;
  powerRefs.led.emissiveIntensity = Math.max(power.level * 3, pulse);
}

// ---------- PC state ----------
const explodeState = { k: 0 };
function setExplode(k) {
  explodeState.k = k;
  pc.root.traverse(o => { if (o.userData.explode && o.userData.home) o.position.copy(o.userData.home).addScaledVector(o.userData.explode, k); });
  P.cables.obj.visible = k < 0.02;
}
function setCables(k) {
  P.cables.obj.traverse(o => { if (o.userData.total) o.geometry.setDrawRange(0, Math.floor(o.userData.total * k / 3) * 3); });
}
function resetPC(assembled) {
  tweens.clear();
  clearActive();
  setExplode(0);
  for (const p of Object.values(P)) {
    if (p.fixed) continue;
    const o = p.obj;
    o.scale.setScalar(1);
    if (p.id === 'motherboard') {
      const pose = assembled ? p : p.flat;
      o.position.copy(pose.pos); o.quaternion.copy(pose.quat); o.visible = true;
      continue;
    }
    p.parent.add(o);
    o.position.copy(p.pos); o.quaternion.copy(p.quat);
    o.visible = assembled;
  }
  const s = pc.mobo.refs.socket;
  s.plate.rotation.x = 0; s.lever.rotation.x = 0;
  s.cap.visible = !assembled; s.cap.position.copy(s.capHome); s.cap.rotation.set(0, 0, 0);
  pc.mobo.refs.dimmLatches.flat().forEach(l => (l.rotation.x = 0));
  pc.mobo.refs.screws.forEach(sc => { sc.visible = assembled; sc.scale.setScalar(1); });
  pc.mobo.refs.m2Screw.visible = assembled;
  pc.pcCase.refs.gpuSlotCovers.visible = !assembled;
  P.paste.obj.scale.set(assembled ? 3.4 : 1, assembled ? 3.4 : 1, assembled ? 0.2 : 1);
  setCables(assembled ? 1 : 0);
  moboBox.visible = antiMat.visible = true;
}

// ---------- Labels ----------
const labelObjs = [];
for (const id of ['cpu', 'cooler', 'ram', 'ssd', 'gpu', 'psu', 'motherboard', 'fans', 'cables', 'case']) {
  const obj = P[id].obj, el = document.createElement('div');
  el.className = 'tag'; el.textContent = `${PARTS[id].emoji} ${PARTS[id].name.split(' (')[0]}`;
  const anchor = {
    cpu: V(0, 0, 0.6), cooler: V(0, 0, 15.8), ram: V(0, -6.6, 4.8), ssd: V(4, 0, 0.3), gpu: V(22, -2, 12.5),
    psu: V(4, 4.3, 7.5), motherboard: V(21, -26, 0.3), fans: V(20.6, 34.6, 6), cables: V(3, 33, -2), case: V(22, 46, 10),
  }[id];
  const lo = new CSS2DObject(el); lo.position.copy(anchor); lo.center.set(0.5, 1.2);
  obj.add(lo); labelObjs.push(lo);
}
let labelsOn = true;
const showLabels = on => { labelsOn = on; labels.domElement.classList.toggle('off', !on); };

// ---------- Picking ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function hits(e, roots) {
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObjects(roots, true).filter(h => shown(h.object));
}
function shown(o) { for (; o; o = o.parent) if (!o.visible) return false; return true; }
function partOf(o) { for (; o; o = o.parent) if (o.userData.partId) return o.userData.partId; return null; }
function pickPart(e) {
  for (const h of hits(e, [pc.root])) { const id = partOf(h.object); if (id) return id; }
  return null;
}

// ---------- UI helpers ----------
const toastEl = $('#toast');
let toastTimer;
function toast(msg, kind = '') {
  toastEl.innerHTML = msg; toastEl.className = 'show ' + kind;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (toastEl.className = ''), 3600);
}
function confetti(n = 140) {
  if (reduceMotion) return;
  for (let i = 0; i < n; i++) {
    const d = document.createElement('i');
    d.className = 'confetti';
    d.style.left = Math.random() * 100 + 'vw';
    d.style.background = `hsl(${Math.random() * 360} 90% 60%)`;
    d.style.animationDelay = Math.random() * 0.7 + 's';
    d.style.setProperty('--dx', Math.random() * 240 - 120 + 'px');
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 4200);
  }
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Info card
const info = $('#info');
let infoId = null;
function showInfo(id) {
  const d = PARTS[id]; if (!d) return;
  infoId = id;
  info.querySelector('.emoji').textContent = d.emoji;
  info.querySelector('h2').textContent = d.name;
  info.querySelector('.role').textContent = d.role;
  info.querySelector('.body').textContent = level === 'kid' ? d.kid : d.adult;
  info.querySelector('.facts').innerHTML = d.facts.map(f => `<li>${esc(f)}</li>`).join('');
  info.querySelector('.specs').innerHTML = level === 'kid' ? '' : Object.entries(d.specs).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  info.classList.add('open');
}
const hideInfo = () => { info.classList.remove('open'); infoId = null; };
info.querySelector('.close').onclick = hideInfo;
info.querySelector('.speak').onclick = () => { const d = PARTS[infoId]; if (d) say(`${d.name}. ${d.role}. ${level === 'kid' ? d.kid : d.adult}`); };

// ---------- Modes ----------
let mode = null;
const views = {
  overview: () => fly(V(0, 20, 0), V(62, 48, 92)),
  build: () => fly(V(-28, 8, 6), V(-8, 70, 120)),
};
function setMode(m) {
  if (mode === m) return;
  mode = m;
  store.set('mode', m);
  tweens.clear();
  speechSynthesis?.cancel?.();
  hideInfo();
  $$('.modes button').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
  document.body.dataset.mode = m;
  outline.selectedObjects = [];
  const isMuseum = m === 'museum';
  renderPass.scene = outline.renderScene = isMuseum ? museum.scene : workshop;
  controls.maxPolarAngle = Math.PI * 0.495;
  if (m === 'explore') enterExplore();
  if (m === 'build') enterBuild();
  if (m === 'find') enterFind();
  if (isMuseum) enterMuseum();
}

// --- Explore ---
function enterExplore() {
  resetPC(true);
  moboBox.visible = false;
  power.target = 1;
  showLabels(labelsOn);
  $('#tExplode').classList.remove('on'); $('#tGlass').classList.add('on'); $('#tPower').classList.add('on');
  views.overview();
}
$('#tExplode').onclick = e => {
  const on = e.currentTarget.classList.toggle('on');
  const k0 = explodeState.k;
  sfx.pop();
  tween(1.1, k => setExplode(k0 + ((on ? 1 : 0) - k0) * k));
  if (on) fly(V(0, 22, 12), V(75, 55, 120));
};
$('#tGlass').onclick = e => { P.panel.obj.visible = e.currentTarget.classList.toggle('on'); sfx.click(); };
$('#tPower').onclick = e => { const on = e.currentTarget.classList.toggle('on'); power.target = on ? 1 : 0; on ? whoosh(2) : sfx.click(); };
$('#tLabels').onclick = e => { showLabels(e.currentTarget.classList.toggle('on')); sfx.click(); };
$('#tReset').onclick = () => views.overview();

function focusPart(id) {
  const o = P[id].obj, b = new THREE.Box3().setFromObject(o), c = b.getCenter(V()), r = b.getSize(V()).length();
  const dir = camera.position.clone().sub(controls.target).normalize();
  if (dir.z < 0.3) { dir.z = 0.6; dir.normalize(); }
  fly(c, c.clone().addScaledVector(dir, Math.max(18, r * 1.3)), 1.1);
}

// --- Build ---
const build = { step: 0, active: null, ghost: null, hover: null, hoverBase: null, hoverAxis: null, busy: false, mistakes: 0, t0: 0, awaitPower: false };
const EXTRA = { power: { name: 'Power Button', emoji: '⏻' } };
const meta = id => PARTS[id] || EXTRA[id];
const WHY_NOT = {
  cooler: s => (s < 3 ? 'The cooler sits ON TOP of the CPU, and it needs thermal paste underneath first!' : null),
  paste: s => (s < 3 ? 'Thermal paste goes on the CPU, so the CPU has to be in its socket first.' : null),
  gpu: s => (s < 7 ? 'The graphics card plugs into the motherboard, and the motherboard isn’t in the case yet!' : null),
  cables: () => 'There’s nothing to plug the cables into yet!',
  panel: () => 'Close the window last, after everything is inside.',
  power: () => 'Not so fast! The computer isn’t finished yet 😄',
  motherboard: s => (s < 5 ? 'It’s easier to put the CPU, RAM, SSD and cooler on the motherboard BEFORE it goes in the case.' : 'Put the power supply in first. It’s hard to reach once the motherboard is in!'),
};
const PLACE_LABEL = { paste: '🧴 Squeeze!', cables: '🔌 Plug them in!', power: '⏻ Press power!', motherboard: '✨ Move it in!', panel: '✨ Put it on!' };

let thumbs = {};
function renderTray() {
  $('#tray').innerHTML = TRAY.map(id => {
    const m = meta(id);
    const img = thumbs[id] ? `<img src="${thumbs[id]}" alt="">` : `<span class="big-emoji">${m.emoji}</span>`;
    return `<button class="part" data-id="${id}">${img}<b>${esc(m.name.split(' (')[0])}</b><small>${esc(PARTS[id]?.role || 'Turn it on!')}</small></button>`;
  }).join('');
  $$('#tray .part').forEach(b => (b.onclick = () => pickCard(b.dataset.id)));
}
function renderProgress() {
  $('#progress').innerHTML = STEPS.map((s, i) => `<span class="${i < build.step ? 'done' : i === build.step ? 'now' : ''}" title="${esc(s.title)}">${i < build.step ? '✓' : i + 1}</span>`).join('');
  $$('#tray .part').forEach(b => b.classList.toggle('done', STEPS.findIndex(s => s.part === b.dataset.id) < build.step));
}
function showTask(extra = '') {
  const s = STEPS[build.step];
  if (!s) return;
  $('#stepno').textContent = `Step ${build.step + 1} of ${STEPS.length}`;
  $('#task').textContent = level === 'kid' ? s.kidTask : s.title;
  $('#how').innerHTML = extra || (level === 'kid' ? 'Find the right part in the box below 👇' : 'Pick the correct part from the tray.');
  $('#placeBtn').hidden = true;
}
function enterBuild() {
  resetPC(false);
  power.target = 0; power.level = 0;
  Object.assign(build, { step: 0, active: null, busy: false, mistakes: 0, t0: performance.now(), awaitPower: false });
  showLabels(false);
  renderTray(); renderProgress(); showTask();
  views.build();
}
function clearActive() {
  if (build.ghost) { build.ghost.removeFromParent(); build.ghost = null; }
  if (build.syringe) { build.syringe.removeFromParent(); build.syringe = null; }
  build.hover = null; build.active = null; build.awaitPower = false;
  $$('#tray .part').forEach(b => b.classList.remove('sel'));
}
function viewFor(step) {
  const v = step.view;
  let t;
  if (v.target === 'socket') t = socketGroup.getWorldPosition(V());
  else if (v.target === 'ghost') t = (build.ghost || build.hover || P[step.part].obj).getWorldPosition(V());
  // Keep both the floating part and its glowing target in frame
  if (build.hover && (v.target === 'socket' || v.target === 'ghost')) t.lerp(build.hover.getWorldPosition(V()), 0.45);
  else if (v.target === 'power') t = powerRefs.btn.getWorldPosition(V());
  else t = V(0, v.focusY ?? 20, 0);
  return fly(t, t.clone().add(V(...v.offset)), 1.2);
}
async function pickCard(id) {
  if (build.busy || mode !== 'build' || build.step >= STEPS.length) return;
  const step = STEPS[build.step];
  if (build.active === id) return;
  if (id !== step.part) {
    sfx.no(); build.mistakes++;
    const btn = $(`#tray .part[data-id="${id}"]`);
    btn?.classList.remove('shake'); void btn?.offsetWidth; btn?.classList.add('shake');
    setTimeout(() => btn?.classList.remove('shake'), 600);
    const done = STEPS.findIndex(s => s.part === id) < build.step;
    const why = done ? 'You already did that one! ✅' : WHY_NOT[id]?.(build.step) || (level === 'kid' ? `Not yet! The ${meta(id).name.split(' (')[0]} comes later.` : `Not yet: ${meta(id).name} comes later.`);
    toast(`<b>${esc(why)}</b><br>${level === 'kid' ? 'Right now:' : 'Next:'} ${esc(level === 'kid' ? step.kidTask : step.title)}`, 'bad');
    return;
  }
  clearActive();
  sfx.click();
  build.active = id;
  $(`#tray .part[data-id="${id}"]`)?.classList.add('sel');
  const p = P[id];
  const place = p?.path ? p.path[0].pos : p?.pos;
  if (id === 'cpu') {
    const s = pc.mobo.refs.socket;
    await tween(0.5, k => (s.lever.rotation.x = 1.75 * k));
    await tween(0.6, k => (s.plate.rotation.x = -1.95 * k));
  }
  if (id === 'ram') await tween(0.4, k => pc.mobo.refs.dimmLatches.forEach(([a, b], i) => { if (i % 2) { a.rotation.x = -0.55 * k; b.rotation.x = 0.55 * k; } }));
  if (['cpu', 'ssd', 'ram', 'cooler', 'psu', 'gpu', 'panel'].includes(id)) {
    build.ghost = ghostOf(p.obj);
    build.ghost.position.copy(p.pos); build.ghost.quaternion.copy(p.quat); build.ghost.visible = true;
    p.parent.add(build.ghost);
    const axis = p.approach ? p.approach.clone() : V(0, 0, 3);
    p.parent.add(p.obj);
    p.obj.position.copy(place).addScaledVector(axis, p.path ? 0 : 1.6);
    if (p.path) p.obj.position.add(V(0, 0, 3));
    p.obj.quaternion.copy(p.path ? p.path[0].quat : p.quat);
    p.obj.scale.setScalar(0.001);
    build.hover = p.obj; build.hoverBase = p.obj.position.clone(); build.hoverAxis = axis.clone().normalize();
    sfx.pop();
    pop(p.obj, 0.4).then(() => { p.obj.scale.setScalar(1); });
  } else if (id === 'paste') {
    build.syringe = buildSyringe();
    build.syringe.position.copy(P.paste.pos).add(V(0, 0, 3));
    pc.mobo.add(build.syringe);
    build.hover = build.syringe; build.hoverBase = build.syringe.position.clone(); build.hoverAxis = V(0, 0, 1);
    P.paste.obj.visible = true; P.paste.obj.scale.setScalar(0.001);
  } else if (id === 'motherboard') {
    build.ghost = ghostOf(pc.mobo);
    build.ghost.position.copy(BOARD_ORIGIN); build.ghost.quaternion.identity();
    pc.root.add(build.ghost);
    build.hover = null;
  } else if (id === 'power') {
    build.awaitPower = true;
  }
  $('#task').textContent = level === 'kid' ? step.kidTask : step.title;
  $('#how').textContent = level === 'kid' ? step.kidHow : step.how;
  const btn = $('#placeBtn');
  btn.textContent = PLACE_LABEL[id] || '✨ Place it!'; btn.hidden = false;
  await viewFor(step);
}

async function place() {
  if (!build.active || build.busy) return;
  build.busy = true;
  const id = build.active, p = P[id], s = pc.mobo.refs.socket;
  $('#placeBtn').hidden = true;
  if (build.ghost) { build.ghost.removeFromParent(); build.ghost = null; }
  build.hover = null;
  const approach = p?.approach && p.pos.clone().add(p.approach);
  switch (id) {
    case 'cpu':
      await path(p.obj, [{ pos: p.pos.clone().add(V(0, 0, 1.0)), quat: p.quat }, { pos: p.pos, dur: 0.5 }]);
      sfx.snap();
      await tween(0.6, k => (s.plate.rotation.x = -1.95 * (1 - k)));
      await tween(0.4, k => (s.lever.rotation.x = 1.75 * (1 - k)));
      sfx.snap();
      { const c0 = s.cap.position.clone(); await tween(0.6, k => { s.cap.position.set(c0.x + k * 6, c0.y + k * 2, c0.z + Math.sin(k * Math.PI) * 5); s.cap.rotation.z = k * 3; }); s.cap.visible = false; }
      break;
    case 'ssd':
      await path(p.obj, p.path.map(k => ({ ...k, dur: 0.6 })));
      sfx.snap();
      await pop(pc.mobo.refs.m2Screw);
      break;
    case 'ram':
      await path(p.obj, [{ pos: approach, quat: p.quat, dur: 0.5 }, { pos: p.pos, dur: 0.5 }]);
      await tween(0.25, k => pc.mobo.refs.dimmLatches.forEach(([a, b], i) => { if (i % 2) { a.rotation.x = -0.55 * (1 - k); b.rotation.x = 0.55 * (1 - k); } }));
      sfx.snap();
      break;
    case 'paste': {
      const sy = build.syringe, s0 = sy.position.clone();
      await tween(0.6, k => sy.position.lerpVectors(s0, P.paste.pos.clone().add(V(0, 0, 0.6)), k));
      await tween(0.8, k => P.paste.obj.scale.setScalar(Math.max(0.001, k)), ease.out);
      await tween(0.5, k => sy.position.z = P.paste.pos.z + 0.6 + k * 8);
      sy.removeFromParent(); build.syringe = null;
      break;
    }
    case 'cooler':
      await path(p.obj, [{ pos: approach, quat: p.quat, dur: 0.6 }, { pos: p.pos, dur: 0.8 }]);
      P.paste.obj.scale.set(3.4, 3.4, 0.2);
      sfx.snap();
      break;
    case 'psu': case 'gpu': case 'panel':
      if (id === 'gpu') { pc.pcCase.refs.gpuSlotCovers.visible = false; sfx.pop(); }
      await path(p.obj, [{ pos: approach, quat: p.quat, dur: 0.6 }, { pos: p.pos, dur: 0.7 }]);
      sfx.snap();
      break;
    case 'motherboard': {
      const f = p.flat, Q = new THREE.Quaternion();
      await path(p.obj, [
        { pos: f.pos.clone().add(V(0, 14, 0)), quat: f.quat, dur: 0.6 },
        { pos: BOARD_ORIGIN.clone().add(V(0, 0, 26)), quat: Q, dur: 1.4 },
        { pos: BOARD_ORIGIN.clone().add(V(0, 0, 2)), dur: 0.7 },
        { pos: BOARD_ORIGIN.clone(), dur: 0.4 },
      ]);
      moboBox.visible = false;
      for (const sc of pc.mobo.refs.screws) { sc.scale.setScalar(0.001); sc.visible = true; tone(1200, 0.04, 'square', 0.04); await pop(sc, 0.15); }
      break;
    }
    case 'cables':
      P.cables.obj.visible = true;
      await tween(2.2, k => setCables(k), ease.inOut);
      sfx.snap();
      break;
    case 'power':
      build.awaitPower = false;
      build.busy = false;
      return boot();
  }
  build.busy = false;
  if (mode !== 'build') return;
  const done = STEPS[build.step];
  $(`#tray .part[data-id="${id}"]`)?.classList.remove('sel');
  build.active = null;
  build.step++;
  sfx.ok();
  renderProgress();
  const praise = ['Great job! 🎉', 'Nailed it! ⭐', 'Perfect! 👏', 'You’re a builder! 🛠️', 'Awesome! 🚀'][build.step % 5];
  showTask(`<b>${praise}</b> ${esc(level === 'kid' ? PARTS[done.part]?.kid.split('. ')[0] + '.' : done.how)}`);
}

async function boot() {
  power.target = 1;
  whoosh(3);
  await wait(1.2);
  sfx.beep();
  const secs = Math.round((performance.now() - build.t0) / 1000);
  const lines = [
    'PC LAB BIOS v2.6  (C) 2026 PC Lab Inc.',
    '',
    'CPU  : 8-Core Processor @ 4.80 GHz ........ OK',
    'RAM  : 32768 MB DDR5-6000 (dual channel) .. OK',
    'GPU  : HyperDraw X16, 16 GB ............... OK',
    'NVMe : 2 TB SSD ........................... OK',
    `FANS : ${pc.fans.length} spinning ......................... OK`,
    '',
    '*BEEP*  One short beep = everything is fine!',
    '',
    'Starting your computer...',
  ];
  const bootEl = $('#boot'), crt = bootEl.querySelector('.crt');
  bootEl.classList.add('open'); bootEl.querySelector('.done').hidden = true;
  crt.textContent = '';
  let out = '';
  for (const l of lines) {
    if (!bootEl.classList.contains('open')) return;
    for (let i = 3; i < l.length; i += 3) { crt.textContent = out + l.slice(0, i); await wait(0.012); }
    out += l + '\n'; crt.textContent = out;
    await wait(0.08);
  }
  await wait(0.6);
  build.step = STEPS.length; renderProgress();
  const d = bootEl.querySelector('.done');
  d.querySelector('.stats').innerHTML = `⏱️ ${Math.floor(secs / 60)}m ${secs % 60}s &nbsp;·&nbsp; ${build.mistakes === 0 ? '🌟 No mistakes!' : `🔁 ${build.mistakes} tr${build.mistakes === 1 ? 'y' : 'ies'} to get it right`}`;
  d.hidden = false;
  sfx.ok(); confetti();
  say(level === 'kid' ? 'Hooray! You built a computer!' : 'System booted successfully. Build complete.');
}
$('#placeBtn').onclick = place;
$('#restartBtn').onclick = () => { mode = null; setMode('build'); };
$('#autoBtn').onclick = async () => {
  if (build.busy) return;
  const m = mode;
  while (mode === m && build.step < STEPS.length) {
    await pickCard(STEPS[build.step].part);
    await wait(0.7);
    if (mode !== m) return;
    const last = STEPS[build.step].part === 'power';
    await place();
    if (last) return;
    await wait(0.5);
  }
};
$('#boot .again').onclick = () => { $('#boot').classList.remove('open'); mode = null; setMode('build'); };
$('#boot .explore').onclick = () => { $('#boot').classList.remove('open'); setMode('explore'); };

// --- Find it ---
const find = { list: [], i: 0, score: 0, tries: 0, lock: false };
function enterFind() {
  resetPC(true);
  moboBox.visible = false;
  power.target = 1;
  showLabels(false);
  find.list = [...FIND].sort(() => Math.random() - 0.5);
  Object.assign(find, { i: 0, score: 0, tries: 0, lock: false });
  views.overview();
  askFind();
}
function askFind() {
  const q = find.list[find.i];
  $('#findQ').textContent = level === 'kid' ? q.kid : q.adult;
  $('#findFb').textContent = level === 'kid' ? 'Tap the part in the computer! You can spin it around.' : 'Click the part in the 3D model.';
  $('#findScore').innerHTML = find.list.map((_, i) => `<span class="${i < find.i ? 'done' : i === find.i ? 'now' : ''}">${i < find.i ? '⭐' : ''}</span>`).join('');
  if (level === 'kid') say(q.kid);
}
function answerFind(id) {
  if (find.lock || !id) return;
  const q = find.list[find.i];
  if (id === q.part) {
    find.lock = true; find.score += find.tries === 0 ? 1 : 0.5;
    sfx.ok(); confetti(60);
    $('#findFb').innerHTML = `✅ <b>Yes! That’s the ${esc(PARTS[id].name)}.</b> ${esc(level === 'kid' ? PARTS[id].kid.split('. ')[0] + '.' : '')}`;
    focusPart(id);
    setTimeout(() => {
      find.i++; find.tries = 0; find.lock = false;
      if (mode !== 'find') return;
      if (find.i >= find.list.length) {
        const stars = Math.round(find.score / find.list.length * 3);
        $('#findQ').textContent = `You found them all! ${'⭐'.repeat(stars) || '👍'}`;
        $('#findFb').innerHTML = `Score: ${find.score} / ${find.list.length}. <button class="link" id="findAgain">Play again ↺</button>`;
        $('#findAgain').onclick = () => { mode = null; setMode('find'); };
        views.overview();
      } else { askFind(); views.overview(); }
    }, 2600);
  } else {
    find.tries++; sfx.no();
    $('#findFb').innerHTML = `❌ That’s the <b>${esc(PARTS[id].name)}</b> (${esc(PARTS[id].role.toLowerCase())}). Try again!`;
  }
}

// --- Museum ---
const museum = buildMuseum(envTex);
let exIndex = 0;
function enterMuseum() {
  $('#timeline').innerHTML = EXHIBIT_ORDER.map((id, i) => `<button data-i="${i}"><i>${EXHIBITS[id].emoji}</i><span>${esc(EXHIBITS[id].year.split(' ')[0])}</span></button>`).join('');
  $$('#timeline button').forEach(b => (b.onclick = () => focusExhibit(+b.dataset.i)));
  focusExhibit(exIndex, true);
}
function focusExhibit(i, instant) {
  exIndex = (i + museum.items.length) % museum.items.length;
  const it = museum.items[exIndex], ex = EXHIBITS[it.id];
  museum.items.forEach(m => { if (m !== it && m.playing) { m.playing = false; m.ex.play(false); } });
  // On wide screens the info card covers the right side, so aim a little right of the exhibit to shift it left.
  const t = it.focus.clone().add(V(innerWidth > 900 ? it.size * 0.45 : 0, innerWidth > 900 ? 0 : -it.size * 0.25, 0));
  const cam = t.clone().add(V(4, 6, (24 + it.size * 1.25) * Math.max(1, 0.9 / camera.aspect)));
  if (instant) { controls.target.copy(t); camera.position.copy(cam); } else fly(t, cam, 1.2);
  const card = $('#exhibit');
  card.querySelector('.emoji').textContent = ex.emoji;
  card.querySelector('.year').textContent = ex.year;
  card.querySelector('h2').textContent = ex.name;
  card.querySelector('.stats').innerHTML = ex.stats.map(([k, v]) => `<div><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('');
  card.querySelector('.body').textContent = level === 'kid' ? ex.kid : ex.adult;
  card.querySelector('.fact').textContent = '💡 ' + ex.fact;
  card.querySelector('.scale').textContent = '🔍 ' + it.note;
  const pb = card.querySelector('.play');
  pb.textContent = '▶ ' + ex.play; pb.classList.remove('on');
  $$('#timeline button').forEach((b, j) => b.classList.toggle('on', j === exIndex));
  $('#timeline button.on')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: instant ? 'auto' : 'smooth' });
}
function togglePlay() {
  const it = museum.items[exIndex];
  it.playing = !it.playing; it.ex.play(it.playing);
  $('#exhibit .play').classList.toggle('on', it.playing);
  it.playing ? sfx.pop() : sfx.click();
  if (it.playing && it.id === 'hdd') whoosh(1.5);
}
$('#exhibit .play').onclick = togglePlay;
// On phones the card starts folded so the exhibit stays visible; tap its header to unfold.
const exCard = $('#exhibit');
exCard.classList.toggle('compact', innerWidth <= 900);
exCard.querySelector('.head').onclick = () => exCard.classList.toggle('compact');
$('#exhibit .speak').onclick = () => { const ex = EXHIBITS[museum.items[exIndex].id]; say(`${ex.name}. ${level === 'kid' ? ex.kid : ex.adult} ${ex.fact}`); };
$('#mPrev').onclick = () => { sfx.click(); focusExhibit(exIndex - 1); };
$('#mNext').onclick = () => { sfx.click(); focusExhibit(exIndex + 1); };

// Floppy calculator
const FLOPPY = 1474560, FLOPPY_MM = 3.3;
function renderCalc(i) {
  const item = FLOPPY_ITEMS[i];
  $$('#calc .items button').forEach((b, j) => b.classList.toggle('on', j === i));
  const n = Math.ceil(item.bytes / FLOPPY), m = n * FLOPPY_MM / 1000;
  const below = [...HEIGHTS].reverse().find(h => h.m <= m), above = HEIGHTS.find(h => h.m > m);
  const fmt = v => (v >= 1000 ? (v / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' km' : v >= 1 ? v.toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' m' : Math.round(v * 100) + ' cm');
  let compare;
  if (!below) compare = `That’s a small stack, shorter than ${above.emoji} ${above.name}.`;
  else if (!above) compare = `That’s taller than ${below.emoji} ${below.name}! (${(m / below.m).toFixed(1)}× taller)`;
  else compare = `Taller than ${below.emoji} ${below.name}, but shorter than ${above.emoji} ${above.name}.`;
  const bars = [below, { name: 'Your floppy stack', emoji: '💾', m, stack: true }, above].filter(Boolean);
  const max = Math.max(...bars.map(b => b.m));
  $('#calc .result').innerHTML = `
    <div class="big">${n.toLocaleString()} <span>floppy disk${n === 1 ? '' : 's'}</span></div>
    <p>${item.emoji} ${esc(item.name)} would fill <b>${n.toLocaleString()}</b> floppy disks. Stacked up they’d be <b>${fmt(m)}</b> tall and weigh <b>${(n * 0.02).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg</b>.</p>
    <p class="cmp">${compare}</p>
    <div class="bars">${bars.map(b => `<div class="bar ${b.stack ? 'stack' : ''}"><div class="col" style="height:${Math.max(2, b.m / max * 100)}%"></div><span>${b.emoji}</span><small>${esc(b.name)}<br>${fmt(b.m)}</small></div>`).join('')}</div>`;
}
$('#calc .items').innerHTML = FLOPPY_ITEMS.map((it, i) => `<button data-i="${i}">${it.emoji}<span>${esc(it.name)}</span></button>`).join('');
$$('#calc .items button').forEach(b => (b.onclick = () => { sfx.click(); renderCalc(+b.dataset.i); }));
$('#calcBtn').onclick = () => { $('#calc').classList.add('open'); renderCalc(3); };
$$('.modal .x').forEach(b => (b.onclick = () => b.closest('.modal').classList.remove('open')));

// ---------- Pointer input ----------
let down = null;
canvas.addEventListener('pointerdown', e => (down = { x: e.clientX, y: e.clientY }));
canvas.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
  down = null;
  onClick(e);
});
function onClick(e) {
  if (mode === 'explore') {
    const id = pickPart(e);
    if (id && PARTS[id]) { sfx.click(); showInfo(id); if (id !== 'case') focusPart(id); }
    else hideInfo();
  } else if (mode === 'find') {
    answerFind(pickPart(e));
  } else if (mode === 'build') {
    if (build.awaitPower) {
      if (hits(e, [powerRefs.btn]).length) place();
      return;
    }
    const targets = [build.ghost, build.hover, build.active === 'motherboard' && pc.mobo].filter(Boolean);
    if (targets.length && hits(e, targets).length) place();
  } else if (mode === 'museum') {
    const h = hits(e, museum.items.map(i => i.holder))[0];
    if (!h) return;
    let o = h.object; while (o && !museum.items.find(i => i.holder === o)) o = o.parent;
    const it = museum.items.find(i => i.holder === o);
    if (it.index === exIndex) togglePlay(); else { sfx.click(); focusExhibit(it.index); }
  }
}
let hoverId = null;
const tip = $('#tooltip');
canvas.addEventListener('pointermove', e => {
  if (mode !== 'explore' && mode !== 'find') { tip.className = ''; return; }
  const id = pickPart(e);
  if (id !== hoverId) {
    hoverId = id;
    outline.selectedObjects = id && PARTS[id] && id !== 'case' ? [P[id].obj] : [];
    canvas.style.cursor = id ? 'pointer' : '';
  }
  if (id && PARTS[id] && mode === 'explore') {
    tip.textContent = `${PARTS[id].emoji} ${PARTS[id].name}`;
    tip.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 14}px)`;
    tip.className = 'show';
  } else tip.className = '';
});
canvas.addEventListener('pointerleave', () => { tip.className = ''; });

addEventListener('keydown', e => {
  if (e.key === 'Escape') { hideInfo(); $$('.modal').forEach(m => m.classList.remove('open')); }
  if (mode === 'museum' && e.key === 'ArrowRight') focusExhibit(exIndex + 1);
  if (mode === 'museum' && e.key === 'ArrowLeft') focusExhibit(exIndex - 1);
  if (mode === 'museum' && e.key === ' ' && e.target === document.body) { e.preventDefault(); togglePlay(); }
});

// ---------- Top bar ----------
$$('.modes button').forEach(b => (b.onclick = () => { sfx.click(); setMode(b.dataset.mode); }));
function setLevel(l) {
  level = l; store.set('level', l);
  $$('.level button').forEach(b => b.classList.toggle('on', b.dataset.level === l));
  document.body.dataset.level = l;
  if (infoId) showInfo(infoId);
  if (mode === 'build' && !build.busy) { build.active ? pickCardText() : showTask(); }
  if (mode === 'find' && find.i < find.list.length) askFind();
  if (mode === 'museum') focusExhibit(exIndex, true);
}
function pickCardText() { const s = STEPS[build.step]; $('#task').textContent = level === 'kid' ? s.kidTask : s.title; $('#how').textContent = level === 'kid' ? s.kidHow : s.how; }
$$('.level button').forEach(b => (b.onclick = () => { sfx.click(); setLevel(b.dataset.level); }));
const muteBtn = $('#mute');
const paintMute = () => { muteBtn.textContent = muted ? '🔇' : '🔊'; muteBtn.setAttribute('aria-label', muted ? 'Sound off' : 'Sound on'); };
muteBtn.onclick = () => { muted = !muted; store.set('muted', muted ? '1' : '0'); paintMute(); };
paintMute();

// ---------- Thumbnails for the build tray (rendered from the real 3D parts) ----------
function makeThumbs() {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(180, 180); r.setPixelRatio(1);
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.1;
  const s = new THREE.Scene();
  s.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
  const l = new THREE.DirectionalLight(0xffffff, 2); l.position.set(3, 5, 4); s.add(l, new THREE.HemisphereLight(0xffffff, 0x333344, 0.6));
  const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 1000);
  const dirs = { motherboard: [0.25, 0.35, 1], gpu: [0.5, -0.7, 1], cpu: [0.3, -0.5, 1], ram: [1, 0.3, 0.9], psu: [0.9, 0.5, 1], ssd: [0.2, -0.4, 1], cooler: [1.1, 0.5, 0.9], panel: [0.35, 0.25, 1], paste: [1, 0.4, 0.5] };
  const out = {};
  for (const [id, d] of Object.entries(dirs)) {
    const c = (id === 'paste' ? buildSyringe() : P[id].obj).clone(true);
    c.position.set(0, 0, 0); c.quaternion.identity(); c.scale.setScalar(1); c.visible = true;
    const tags = []; c.traverse(o => o.isCSS2DObject && tags.push(o)); tags.forEach(o => o.removeFromParent());
    s.add(c);
    const sph = new THREE.Box3().setFromObject(c).getBoundingSphere(new THREE.Sphere());
    const dir = V(...d).normalize();
    cam.position.copy(sph.center).addScaledVector(dir, sph.radius / Math.sin(THREE.MathUtils.degToRad(14)) * 1.02);
    cam.up.set(0, 1, 0);
    if (Math.abs(dir.y) > 0.9) cam.up.set(0, 0, -1);
    cam.lookAt(sph.center);
    r.render(s, cam);
    out[id] = r.domElement.toDataURL();
    s.remove(c);
  }
  r.dispose(); r.forceContextLoss();
  return out;
}

// ---------- Resize + loop ----------
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  labels.setSize(innerWidth, innerHeight);
});

const clock = new THREE.Clock();
function tick(dt = Math.min(clock.getDelta(), 0.05)) {
  const t = clock.elapsedTime;
  runTweens(dt);
  if (mode === 'museum') museum.update(dt, t, exIndex);
  else {
    updatePower(dt, t);
    if (build.hover && !build.busy) build.hover.position.copy(build.hoverBase).addScaledVector(build.hoverAxis, Math.sin(t * 2.5) * 0.5);
    if (build.ghost) build.ghost.ghostMat.opacity = 0.18 + 0.14 * Math.sin(t * 4);
  }
  controls.update();
  composer.render();
  labels.render(mode === 'museum' ? museum.scene : workshop, camera);
}
function loop() { tick(); requestAnimationFrame(loop); }

// ---------- Start ----------
resetPC(false);
try { thumbs = makeThumbs(); } catch (err) { console.warn('thumbnails skipped', err); }
setLevel(level);
const startMode = new URLSearchParams(location.search).get('mode') || store.get('mode') || 'explore';
setMode(['explore', 'build', 'find', 'museum'].includes(startMode) ? startMode : 'explore');
window.pcLab = { camera, controls, P, pc, museum, setMode, fly, V, tick }; // handy for poking around in the console
loop();
$('#loading').classList.add('gone');
