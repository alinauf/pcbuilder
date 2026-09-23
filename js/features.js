// Journey of a click, Fix It game, parts picker and player profiles.
import { THREE, mesh } from './kit.js';
import { PARTS, JOURNEY, FIXES, PICKER, BADGES, AVATARS } from './data.js';
import { checkBuild, estimateWatts } from './compat.js';

// ---------- Profiles & badges ----------
export function createProfiles({ $, $$, esc, toast, confetti, sfx, store }) {
  let data;
  try { data = JSON.parse(store.get('pcl-profiles')); } catch { data = null; }
  if (!data?.list?.length) data = { current: 0, list: [{ name: 'Builder', avatar: AVATARS[0], badges: {}, seen: {} }] };
  const save = () => store.set('pcl-profiles', JSON.stringify(data));
  const me = () => data.list[data.current];
  const paint = () => { $('#profileBtn').textContent = me().avatar; $('#profileBtn').title = `${me().name}: ${Object.keys(me().badges).length} badges`; };

  function award(id) {
    if (me().badges[id]) return;
    me().badges[id] = Date.now(); save(); paint();
    const b = BADGES.find(x => x.id === id);
    setTimeout(() => { toast(`🏅 <b>Badge unlocked: ${b.emoji} ${esc(b.name)}</b><br>${esc(b.desc)}`, 'good'); confetti(90); sfx.ok(); }, 400);
  }
  // Count distinct things seen (parts, chips, exhibits) toward a badge.
  function track(kind, value, goal, badge) {
    const seen = (me().seen[kind] ||= []);
    if (!seen.includes(value)) { seen.push(value); save(); }
    if (seen.length >= goal) award(badge);
  }

  function render() {
    const p = me();
    $('#profile .players').innerHTML = data.list.map((pl, i) => `<button data-i="${i}" class="${i === data.current ? 'on' : ''}"><i>${pl.avatar}</i>${esc(pl.name)}</button>`).join('') + '<button class="add">➕ New player</button>';
    $('#profile .avatars').innerHTML = AVATARS.map(a => `<button class="${a === p.avatar ? 'on' : ''}">${a}</button>`).join('');
    $('#profile input').value = p.name;
    $('#profile .badges').innerHTML = BADGES.map(b => `<div class="badge ${p.badges[b.id] ? 'got' : ''}"><i>${b.emoji}</i><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`).join('');
    $('#profile .count').textContent = `${Object.keys(p.badges).length} of ${BADGES.length} badges`;
    $$('#profile .players button[data-i]').forEach(b => (b.onclick = () => { data.current = +b.dataset.i; save(); paint(); render(); sfx.click(); }));
    $('#profile .players .add').onclick = () => { data.list.push({ name: `Player ${data.list.length + 1}`, avatar: AVATARS[data.list.length % AVATARS.length], badges: {}, seen: {} }); data.current = data.list.length - 1; save(); paint(); render(); $('#profile input').select(); };
    $$('#profile .avatars button').forEach(b => (b.onclick = () => { me().avatar = b.textContent; save(); paint(); render(); sfx.pop(); }));
  }
  $('#profile input').oninput = e => { me().name = e.target.value.slice(0, 24) || 'Builder'; save(); paint(); $$('#profile .players button.on').forEach(b => (b.lastChild.textContent = me().name)); };
  $('#profileBtn').onclick = () => { render(); $('#profile').classList.add('open'); };
  $('#certBtn').onclick = () => {
    const p = me(), got = BADGES.filter(b => p.badges[b.id]);
    $('#cert .who').textContent = `${p.avatar} ${p.name}`;
    $('#cert .date').textContent = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    $('#cert .got').innerHTML = got.length ? got.map(b => `<span>${b.emoji} ${esc(b.name)}</span>`).join('') : '<span>🌱 Just getting started!</span>';
    $('#profile').classList.remove('open');
    $('#cert').classList.add('open');
  };
  // Embedded pages (e.g. a shared link) can't open the print dialog, so suggest a screenshot there instead.
  if (window.top !== window) $('#cert .print').outerHTML = '<p class="tip">📸 Take a screenshot to save your certificate!</p>';
  else $('#cert .print').onclick = () => window.print();
  paint();
  return { me, award, track };
}

// ---------- Journey of a click ----------
export function createJourney(ctx) {
  const { $, esc, P, pc, camera, controls, tween, wait, say, sfx, confetti, level, isMuted } = ctx;
  const dotMat = new THREE.MeshStandardMaterial({ color: 0x0b2a33, emissive: 0x4fe3ff, emissiveIntensity: 6, depthTest: false });
  const dot = mesh(new THREE.SphereGeometry(0.7, 16, 12), dotMat);
  dot.renderOrder = 999; dot.castShadow = false; dot.visible = false;
  const light = new THREE.PointLight(0x4fe3ff, 0, 30, 1.5); dot.add(light);
  pc.root.add(dot);
  let run = 0, next = null, offset = new THREE.Vector3();
  const W = (o, x = 0, y = 0, z = 0) => o.localToWorld(new THREE.Vector3(x, y, z));
  const V3 = a => new THREE.Vector3(...a);

  function stops() {
    const cpu = W(P.cpu.obj, 0, 0, 0.8), ram = W(P.ram.obj, 0, -6, 5), gpu = W(P.gpu.obj, 15, -2, 6);
    const scr = pc.monitor.refs.screen, mon = W(pc.monitor, 0, 24, -6);
    const usb = pc.periph.USB, dp = pc.periph.DP;
    const monNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(pc.monitor.quaternion);
    return {
      key: { path: [W(pc.keyboard.refs.keyA, 0, 1.5, 0)], off: [8, 26, 34] },
      usb: { path: pc.periph.paths.kb.map(V3), off: [-50, 26, 40], dur: 4 },
      cpu: { path: [usb, new THREE.Vector3(-17, 41, -6.8), cpu], off: [14, 10, 42] },
      ram: { path: [cpu, new THREE.Vector3(-8, 37, -6.6), ram], off: [14, 12, 36] },
      cpu2: { path: [ram, cpu], off: [14, 10, 42] },
      gpu: { path: [cpu, new THREE.Vector3(-13, 29, -6.8), new THREE.Vector3(-13, 26.8, -6.5), gpu], off: [22, 0, 44] },
      cable: { path: [gpu, dp, ...pc.periph.paths.dp.map(V3).reverse(), mon], off: [-20, 70, 110], dur: 4.5 },
      screen: { path: [mon, scr.getWorldPosition(new THREE.Vector3())], off: monNormal.multiplyScalar(70).add(new THREE.Vector3(0, 6, 0)).toArray() },
    };
  }
  function moveAlong(pts, dur) {
    if (pts.length === 1) { dot.position.copy(pts[0]); return wait(0.3); }
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2);
    return tween(dur, k => curve.getPointAt(k, dot.position), t => t);
  }
  function panel(i) {
    const s = JOURNEY[i], text = level() === 'kid' ? s.kid : s.adult;
    $('#journey .n').textContent = `Stop ${i + 1} of ${JOURNEY.length}`;
    $('#journey .t').textContent = text;
    $('#journey .next').textContent = i === JOURNEY.length - 1 ? '🎉 Finish' : 'Next ▶';
    if (!isMuted()) say(text);
    return text;
  }
  async function start() {
    const my = ++run;
    ctx.prepare();
    pc.monitor.refs.set('desktop', '');
    $('#journey').classList.add('open');
    dot.visible = true; light.intensity = 40;
    const S = stops();
    dot.position.copy(S.key.path[0]);
    offset.set(...S.key.off);
    for (let i = 0; i < JOURNEY.length; i++) {
      const st = S[JOURNEY[i].at];
      const o0 = offset.clone(), o1 = new THREE.Vector3(...st.off);
      tween(1.2, k => offset.lerpVectors(o0, o1, k));
      if (i === 0) {
        const a = pc.keyboard.refs.keyA;
        await tween(0.25, k => (a.position.y = 2.2 - 0.5 * Math.sin(k * Math.PI)));
        sfx.key();
      }
      if (my !== run) return;
      const text = panel(i);
      await moveAlong(st.path, st.dur || 2.2);
      if (my !== run) return;
      if (JOURNEY[i].at === 'screen') { pc.monitor.refs.set('desktop', 'A'); sfx.ok(); confetti(80); ctx.onDone(); }
      await new Promise(res => { next = res; setTimeout(res, Math.max(4500, text.length * 70)); });
      if (my !== run) return;
    }
    stop();
  }
  function stop() {
    run++;
    dot.visible = false; light.intensity = 0;
    $('#journey').classList.remove('open');
    speechSynthesis?.cancel?.();
    ctx.restore();
  }
  $('#journey .next').onclick = () => next?.();
  $('#journey .stop').onclick = stop;
  return {
    start, stop,
    get running() { return dot.visible; },
    // Camera follows the dot while the journey plays
    update() {
      if (!dot.visible) return;
      controls.target.lerp(dot.position, 0.08);
      camera.position.lerp(controls.target.clone().add(offset), 0.06);
    },
  };
}

// ---------- Fix It: diagnose real first-build problems ----------
export function createFixIt(ctx) {
  const { $, esc, P, pc, power, sfx, tone, toast, confetti, level, tween } = ctx;
  const S = { list: [], i: 0, tries: 0, phase: 'intro', solved: 0, beeper: null };
  const cablesKids = () => P.cables.obj.children; // [24 plug, 24 wires, EPS plug, EPS wires, GPU plug, GPU wires, GPU plug, GPU wires]
  const t = f => (level() === 'kid' ? f.kid : f.adult);

  function clean() {
    clearInterval(S.beeper);
    cablesKids().forEach(c => (c.visible = true));
    pc.psu.refs.rocker.rotation.z = 0;
    pc.gpu.refs.errLed.emissiveIntensity = 0;
    pc.periph.dpCable.visible = true; pc.periph.hdmiCable.visible = false;
    pc.cooler.refs.fans[0].userData.stopped = false;
  }
  function setup(f) {
    clean();
    if (f.id === 'psuSwitch') pc.psu.refs.rocker.rotation.z = 0.35;
    if (f.id === 'atx24') cablesKids().slice(0, 2).forEach(c => (c.visible = false));
    if (f.id === 'ram') P.ram.obj.position.z = P.ram.pos.z + 0.8;
    if (f.id === 'gpuPower') cablesKids().slice(4).forEach(c => (c.visible = false));
    if (f.wrongPort) { pc.periph.dpCable.visible = false; pc.periph.hdmiCable.visible = true; }
  }
  function card(html) { $('#fixUI .body').innerHTML = html; }
  function start() {
    S.list = [...FIXES].sort(() => Math.random() - 0.5);
    Object.assign(S, { i: 0, solved: 0 });
    load();
  }
  function load() {
    const f = S.list[S.i];
    S.tries = 0; S.phase = 'intro';
    ctx.resetPC(true);
    setup(f);
    power.target = 0; power.level = 0;
    pc.monitor.refs.set('off');
    $('#fixUI .n').textContent = `Case ${S.i + 1} of ${S.list.length}`;
    card(`<p class="task">🩺 ${level() === 'kid' ? 'This computer has a problem!' : 'Customer complaint:'}</p><p class="how">${esc(t(f))}</p>
      <button class="primary" id="fixPower">⚡ Press the power button</button>`);
    $('#fixPower').onclick = symptoms;
    ctx.view();
  }
  function symptoms() {
    const f = S.list[S.i];
    S.phase = 'diagnose';
    power.target = f.power;
    if (f.coolerOff) pc.cooler.refs.fans[0].userData.stopped = true;
    if (f.gpuLed) pc.gpu.refs.errLed.emissiveIntensity = 4;
    pc.monitor.refs.set(f.power ? (f.coolerOff ? 'hot' : f.screen) : 'off');
    if (f.beeps) { const beep = () => tone(880, 0.9, 'square', 0.05); beep(); S.beeper = setInterval(beep, 1600); }
    if (!f.power) sfx.click();
    card(`<p class="how">${esc(t(f))}</p><p class="task">👆 ${level() === 'kid' ? 'Tap the part you think is causing the problem.' : 'Click the component you suspect.'}</p><p class="hint" id="fixHint"></p>`);
  }
  function answer(id) {
    if (S.phase !== 'diagnose' || !id) return;
    const f = S.list[S.i];
    if (!f.fix.includes(id)) {
      S.tries++; sfx.no();
      $('#fixHint').innerHTML = `❌ ${level() === 'kid' ? 'That’s the' : 'Checked the'} <b>${esc(PARTS[id]?.name || id)}</b>: ${level() === 'kid' ? 'it looks fine.' : 'no fault found.'}${S.tries >= 2 ? `<br>💡 <b>Hint:</b> ${esc(f.hint)}` : ''}`;
      return;
    }
    S.phase = 'fixed';
    fixIt(f).then(() => {
      sfx.ok(); confetti(60); S.solved++;
      card(`<p class="task">✅ ${level() === 'kid' ? 'You found it!' : 'Fault found.'}</p><p class="how">${esc(f.done)}</p><button class="primary" id="fixAgain">⚡ Power on again</button>`);
      $('#fixAgain').onclick = () => {
        power.target = 1; pc.monitor.refs.set('desktop'); tone(1000, 0.2, 'square', 0.06);
        const last = S.i === S.list.length - 1;
        card(`<p class="task">🎉 ${level() === 'kid' ? 'It works now!' : 'System boots normally.'}</p><button class="primary" id="fixNext">${last ? '🏁 See results' : 'Next case ▶'}</button>`);
        $('#fixNext').onclick = () => { if (last) finish(); else { S.i++; load(); } };
      };
    });
  }
  async function fixIt(f) {
    clearInterval(S.beeper);
    power.target = 0;
    if (f.id === 'psuSwitch') { await tween(0.3, k => (pc.psu.refs.rocker.rotation.z = 0.35 * (1 - k))); sfx.snap(); }
    if (f.id === 'atx24' || f.id === 'gpuPower') {
      const kids = f.id === 'atx24' ? cablesKids().slice(0, 2) : cablesKids().slice(4);
      kids.forEach(c => { c.visible = true; if (c.userData.total === undefined) c.traverse(m => m.userData.total && m.geometry.setDrawRange(0, 0)); });
      await tween(1.2, k => kids.forEach(c => c.traverse(m => m.userData.total && m.geometry.setDrawRange(0, Math.floor(m.userData.total * k / 3) * 3))));
      pc.gpu.refs.errLed.emissiveIntensity = 0; sfx.snap();
    }
    if (f.id === 'ram') { const z0 = P.ram.obj.position.z; await tween(0.4, k => (P.ram.obj.position.z = z0 + (P.ram.pos.z - z0) * k)); sfx.snap(); }
    if (f.wrongPort) { pc.periph.hdmiCable.visible = false; pc.periph.dpCable.visible = true; sfx.snap(); }
    if (f.coolerOff) { pc.cooler.refs.fans[0].userData.stopped = false; sfx.snap(); }
  }
  function finish() {
    card(`<p class="task">🏆 ${level() === 'kid' ? `You fixed all ${S.list.length} computers!` : `All ${S.list.length} cases solved.`}</p>
      <p class="how">${level() === 'kid' ? 'Real computer fixers check the simple things first, just like you did.' : 'Most first-build failures are power cables, seating (RAM/GPU) or the display cable. Check the simple things first.'}</p>
      <button class="primary" id="fixRestart">↺ Play again</button>`);
    $('#fixRestart').onclick = start;
    ctx.onDone();
  }
  return { start, answer, clean };
}

// ---------- Parts picker ----------
export function createPicker({ $, $$, esc, sfx, confetti, level, onDone }) {
  const CATS = [['case', 'Case'], ['cpu', 'CPU'], ['board', 'Motherboard'], ['ram', 'RAM'], ['gpu', 'Graphics'], ['cooler', 'Cooler'], ['psu', 'Power supply']];
  const sel = {};
  function render() {
    $('#picker .cats').innerHTML = CATS.map(([k, label]) => `<div class="cat"><b>${label}</b><div class="opts">${PICKER[k].map(o =>
      `<button data-k="${k}" data-id="${o.id}" class="${sel[k] === o ? 'on' : ''}"><i>${o.emoji}</i><span>${esc(o.name)}<small>${esc(o.note)}</small></span></button>`).join('')}</div></div>`).join('');
    $$('#picker .opts button').forEach(b => (b.onclick = () => { sel[b.dataset.k] = PICKER[b.dataset.k].find(o => String(o.id) === b.dataset.id); sfx.click(); render(); }));
    const res = checkBuild(sel), kid = level() === 'kid';
    const done = CATS.every(([k]) => sel[k]), bad = res.some(r => r.status === 'bad');
    const icon = { ok: '✅', warn: '⚠️', bad: '❌' };
    const w = sel.cpu && sel.gpu ? estimateWatts(sel) : 0;
    $('#picker .res').innerHTML = `${res.map(r => `<p class="${r.status}">${icon[r.status]} ${esc(kid ? r.kid : r.adult)}</p>`).join('') || `<p>${kid ? 'Pick one of each part, and I’ll check they all fit together!' : 'Choose parts; compatibility checks appear here.'}</p>`}
      ${w ? `<div class="watts"><span>⚡ ${kid ? 'Power needed' : 'Estimated draw'}: ~${w} W${sel.psu ? ` / ${sel.psu.watts} W` : ''}</span><div class="bar"><i style="width:${Math.min(100, sel.psu ? (w / sel.psu.watts) * 100 : 50)}%"></i></div></div>` : ''}
      <button class="primary" id="pickBuild" ${done && !bad ? '' : 'disabled'}>${done ? (bad ? '❌ Fix the red problems first' : '🛠️ Everything fits, build it!') : `Choose ${CATS.filter(([k]) => !sel[k]).length} more`}</button>`;
    const btn = $('#pickBuild');
    if (btn && done && !bad) btn.onclick = () => { sfx.ok(); confetti(); onDone(); btn.textContent = kid ? '🎉 Great choices!' : '🎉 Compatible build!'; };
  }
  $('#pickBtn').onclick = () => { render(); $('#picker').classList.add('open'); };
  return { render };
}
