import assert from 'node:assert/strict';
import { checkBuild } from './compat.js';
import { PICKER } from './data.js';

const pick = (cat, id) => PICKER[cat].find(p => p.id === id);
const good = { case: pick('case', 'mid'), cpu: pick('cpu', 'am5'), board: pick('board', 'b650'), ram: pick('ram', 'ddr5'), gpu: pick('gpu', 'big'), cooler: pick('cooler', 'tower'), psu: pick('psu', 850) };
assert.ok(checkBuild(good).every(r => r.status === 'ok'), 'a sensible build passes every check');

const bad = r => checkBuild(r).filter(x => x.status === 'bad').length;
assert.equal(bad({ ...good, board: pick('board', 'b760d4') }), 2, 'wrong socket + DDR4 board');
assert.equal(bad({ ...good, case: pick('case', 'itx') }), 3, 'ATX board, long GPU and tall cooler in a Mini-ITX case');
assert.equal(bad({ ...good, cpu: pick('cpu', 'am4'), board: pick('board', 'b550'), ram: pick('ram', 'ddr4'), gpu: pick('gpu', 'none') }), 1, 'AM4 without iGPU needs a graphics card');
assert.equal(bad({ ...good, psu: pick('psu', 450) }), 1, '450 W can’t feed a 320 W GPU build');
assert.equal(checkBuild({ ...good, psu: pick('psu', 650) }).find(r => r.status === 'warn') !== undefined, true, '650 W is only a warning');
console.log('compat checks passed');
