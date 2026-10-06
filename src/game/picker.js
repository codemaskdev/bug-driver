// A small picker over the bottom-right corner of the page (AI mode only):
// the seed for training from scratch, which saved champion to run alone (one-track and
// multi-track ones), and which brain to compare with in the 70-numbers grid.

import './ui-style.js';
import { CHAMPION_SEEDS } from './champions.js';
import { CHAMPION_GENERATIONS } from '../sim/evolution.js';
import { MULTI_CHAMPION_GENERATIONS } from '../sim/multi-evolution.js';

const style = document.createElement('style');
style.textContent = `
  #picker { position: fixed; bottom: 8px; right: 8px; display: none; gap: 6px; font: 11px monospace;
            color: rgba(0, 240, 255, 0.75); background: rgba(5, 6, 10, 0.8); padding: 6px 8px;
            border: 1px solid rgba(0, 240, 255, 0.35); z-index: 2; align-items: center; }
  #picker select, #picker input { font: 11px monospace; background: #0b0d13; color: #e6ebf2;
                   border: 1px solid rgba(0, 240, 255, 0.4); }
  #picker input { width: 4em; }
`;
document.head.appendChild(style);

const MULTI_SEEDS = [3]; // Step 7b trained seed 3 on three tracks, Step 7c on four

const box = document.createElement('div');
box.id = 'picker';
const seed = document.createElement('input');
seed.type = 'number';
seed.min = '0';
seed.step = '1';
const run = document.createElement('select');
const compare = document.createElement('select');
const champions = [
  ...CHAMPION_SEEDS.flatMap((s) => CHAMPION_GENERATIONS.map((g) => ({ name: `${s}-${g}`, label: `seed ${s} · gen ${g}` }))),
  ...MULTI_SEEDS.flatMap((s) => MULTI_CHAMPION_GENERATIONS.map((g) => ({ name: `${s}-multi-${g}`, label: `seed ${s} · 3 tracks · gen ${g}` }))),
  ...MULTI_SEEDS.flatMap((s) => MULTI_CHAMPION_GENERATIONS.map((g) => ({ name: `${s}-multi4-${g}`, label: `seed ${s} · 4 tracks · gen ${g}` }))),
];
run.append(new Option('train from scratch', ''), ...champions.map((c) => new Option(`champion ${c.label}`, c.name)));
compare.append(new Option('no comparison', ''), ...champions.map((c) => new Option(c.label, c.name)));
box.append('seed', seed, 'run', run, 'N compare', compare);
document.body.appendChild(box);

// "3-multi-100" -> "seed 3 · 3 tracks · gen 100", "3-multi4-100" -> "seed 3 · 4 tracks · gen 100"
export function championLabel(name) {
  return champions.find((c) => c.name === name)?.label ?? name;
}

// onSeed(number), onRun(name or ''), onCompare(name or '')
export function setupPicker({ onSeed, onRun, onCompare }) {
  seed.addEventListener('change', () => {
    const n = Number.parseInt(seed.value, 10);
    if (Number.isFinite(n) && n >= 0) onSeed(n);
    seed.blur();
  });
  run.addEventListener('change', () => { onRun(run.value); run.blur(); });
  compare.addEventListener('change', () => { onCompare(compare.value); compare.blur(); });
}

export function showPicker(visible, { seed: current = 1, running = '', comparing = '' } = {}) {
  box.style.display = visible ? 'flex' : 'none';
  if (document.activeElement !== seed) seed.value = String(current);
  if (document.activeElement !== run) run.value = running;
  if (document.activeElement !== compare) compare.value = comparing;
}
