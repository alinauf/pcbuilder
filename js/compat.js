// Parts-picker compatibility rules (pure: no DOM, no three.js, so it can be tested with node).
export const PSU_HEADROOM = 1.4; // recommend ~40% above estimated draw for load spikes and efficiency

export function estimateWatts(sel) {
  return (sel.cpu?.watts || 0) + (sel.gpu?.watts || 0) + 75; // + board, RAM, SSD, fans
}

// Returns [{ status: 'ok' | 'warn' | 'bad', kid, adult }] for every rule whose parts are chosen.
export function checkBuild(sel) {
  const out = [];
  const add = (status, kid, adult) => out.push({ status, kid, adult });
  const { case: pc, cpu, board, ram, gpu, cooler, psu } = sel;
  if (cpu && board) cpu.socket === board.socket
    ? add('ok', `The CPU fits the socket (${cpu.socket}).`, `Socket match: ${cpu.socket}.`)
    : add('bad', `The CPU won’t fit! A ${cpu.socket} CPU needs a ${cpu.socket} motherboard.`, `Socket mismatch: CPU is ${cpu.socket}, board is ${board.socket}.`);
  if (ram && board) ram.mem === board.mem
    ? add('ok', `The RAM fits the slots (${ram.mem}).`, `Memory type match: ${ram.mem}.`)
    : add('bad', `${ram.mem} sticks won’t go in ${board.mem} slots. The notch is in a different place!`, `Memory mismatch: ${ram.mem} DIMMs in ${board.mem} slots (keyed differently).`);
  if (board && pc) pc.fits.includes(board.size)
    ? add('ok', 'The motherboard fits in the case.', `${board.size} board fits this case.`)
    : add('bad', 'The motherboard is too big for this little case!', `${board.size} board doesn’t fit a case that only takes ${pc.fits.join('/')}.`);
  if (gpu && pc && gpu.length) gpu.length <= pc.gpuMax
    ? add('ok', 'The graphics card fits.', `GPU ${gpu.length} mm ≤ case limit ${pc.gpuMax} mm.`)
    : add('bad', 'The graphics card is too long for this case!', `GPU is ${gpu.length} mm, but the case only fits ${pc.gpuMax} mm.`);
  if (cooler && pc) cooler.height <= pc.coolerMax
    ? add('ok', 'The cooler fits under the side panel.', `Cooler ${cooler.height} mm ≤ case limit ${pc.coolerMax} mm.`)
    : add('bad', 'The cooler is too tall! The side panel won’t close.', `Cooler is ${cooler.height} mm tall; the case allows ${pc.coolerMax} mm.`);
  if (gpu && cpu) gpu.id !== 'none' || cpu.igpu
    ? add('ok', gpu.id === 'none' ? 'The CPU can make pictures by itself.' : 'The graphics card will make the pictures.', gpu.id === 'none' ? 'Using the CPU’s integrated graphics.' : 'A discrete GPU provides video output.')
    : add('bad', 'No pictures! This CPU has no built-in graphics, so you need a graphics card.', 'This CPU has no iGPU and no graphics card was chosen: there’s no video output.');
  if (psu && cpu && gpu) {
    const draw = estimateWatts(sel), rec = Math.ceil((draw * PSU_HEADROOM) / 50) * 50;
    if (psu.watts < draw) add('bad', `The power supply is too weak! The parts need about ${draw} W.`, `Estimated draw ~${draw} W exceeds the ${psu.watts} W PSU.`);
    else if (psu.watts < rec) add('warn', `It might work, but a bigger power supply (${rec} W) would be safer.`, `~${draw} W estimated; ${rec} W+ recommended for headroom.`);
    else add('ok', `Plenty of power: about ${draw} W needed.`, `~${draw} W estimated; ${psu.watts} W gives good headroom.`);
  }
  return out;
}
