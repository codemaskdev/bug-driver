// A small picker over the bottom-right corner of the page (AI mode only):
// which saved champion to run alone, and which brain to compare with in the 70-numbers grid.

import { CHAMPION_SEEDS } from './champions.js';
import { CHAMPION_GENERATIONS } from '../sim/evolution.js';

const style = document.createElement('style');
style.textContent = `
  #picker { position: fixed; bottom: 8px; right: 8px; display: none; gap: 6px; font: 11px monospace;
            color: rgba(0, 240, 255, 0.75); background: rgba(5, 6, 10, 0.8); padding: 6px 8px;
            border: 1px solid rgba(0, 240, 255, 0.35); z-index: 2; align-items: center; }
  #picker select { font: 11px monospace; background: #0b0d13; color: #e6ebf2;
                   border: 1px solid rgba(0, 240, 255, 0.4); }
`;
document.head.appendChild(style);

const box = document.createElement('div');
box.id = 'picker';
const run = document.createElement('select');
const compare = document.createElement('select');
const champions = CHAMPION_SEEDS.flatMap((s) => CHAMPION_GENERATIONS.map((g) => ({ name: `${s}-${g}`, label: `seed ${s} · gen ${g}` })));
run.append(new Option('live evolution', ''), ...champions.map((c) => new Option(`champion ${c.label}`, c.name)));
compare.append(new Option('no comparison', ''), ...champions.map((c) => new Option(c.label, c.name)));
box.append('run', run, 'N compare', compare);
document.body.appendChild(box);

// onRun(name or ''), onCompare(name or '')
export function setupPicker({ onRun, onCompare }) {
  run.addEventListener('change', () => { onRun(run.value); run.blur(); });
  compare.addEventListener('change', () => { onCompare(compare.value); compare.blur(); });
}

export function showPicker(visible, { running = '', comparing = '' } = {}) {
  box.style.display = visible ? 'flex' : 'none';
  if (document.activeElement !== run) run.value = running;
  if (document.activeElement !== compare) compare.value = comparing;
}
