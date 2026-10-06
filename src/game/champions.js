// Saved champions: champions/seed-N.json, written by tools/evolution-report.js.
// A champion is named "seed-generation", e.g. "3-40".

export const CHAMPION_SEEDS = [1, 2, 3, 4, 5];
const files = new Map();

// "3-40" -> {seed: 3, generation: 40}, or null if it isn't a champion name.
export function parseChampionName(text) {
  const m = /^(\d+)-(\d+)$/.exec(text ?? '');
  return m ? { seed: Number(m[1]), generation: Number(m[2]) } : null;
}

// The whole champions/seed-N.json file, or null.
export function loadChampionsFile(seed) {
  if (!files.has(seed)) {
    files.set(seed, fetch(`champions/seed-${seed}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  }
  return files.get(seed);
}

// My official ghost lap, ghosts/me-v3.json (the scoreboard never uses localStorage).
let ghostFile = null;
export function loadGhost() {
  ghostFile ??= fetch('ghosts/me-v3.json').then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return ghostFile;
}

// Loads one champion: {seed, generation, id, brain, lapSteps, fitness, ...}, or null if it doesn't exist.
export async function loadChampion({ seed, generation }) {
  const file = await loadChampionsFile(seed);
  const champ = file?.champions?.[generation];
  return champ ? { seed, generation, ...champ } : null;
}
