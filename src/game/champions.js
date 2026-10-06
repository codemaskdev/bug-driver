// Saved champions: champions/seed-N.json (tools/evolution-report.js, trained on Neon Loop)
// champions/seed-N-multi.json (tools/multi-train.js, trained on three tracks, Step 7b)
// and champions/seed-N-multi4.json (tools/multi-train.js multi4, trained on four tracks, Step 7c).
// A champion is named "seed-generation", e.g. "3-40", or "seed-multi-generation", e.g. "3-multi-100" or "3-multi4-100".

export const CHAMPION_SEEDS = [1, 2, 3, 4, 5];
const files = new Map();

// "3-40" -> {seed: 3, generation: 40, multi: false}; "3-multi-100" -> {..., multi: 'multi'}; "3-multi4-100" -> {..., multi: 'multi4'}; else null.
export function parseChampionName(text) {
  const m = /^(\d+)(?:-(multi4?))?-(\d+)$/.exec(text ?? '');
  return m ? { seed: Number(m[1]), generation: Number(m[3]), multi: m[2] ?? false } : null;
}

// How many tracks a champion trained on: 1, 3 (Step 7b) or 4 (Step 7c)
export const trainingTracks = (multi) => ({ multi: 3, multi4: 4 })[multi] ?? 1;

// The whole champions/seed-N.json (or seed-N-multi.json, seed-N-multi4.json) file, or null.
export function loadChampionsFile(seed, multi = false) {
  const name = `champions/seed-${seed}${multi ? `-${multi}` : ''}.json`;
  if (!files.has(name)) {
    files.set(name, fetch(name).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  }
  return files.get(name);
}

// My ghost lap on a track: ghosts/me-v3.json on Neon Loop, ghosts/me-exam.json on Exam; null if there is none.
// No me-exam.json means I haven't driven Exam yet, so nothing races there.
const GHOST_FILES = { 'neon-loop': 'ghosts/me-v3.json', exam: 'ghosts/me-exam.json' };
const ghosts = new Map();
export function loadGhostFor(trackId) {
  const path = GHOST_FILES[trackId];
  if (!path) return Promise.resolve(null);
  if (!ghosts.has(path)) ghosts.set(path, fetch(path).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  return ghosts.get(path);
}

// My official ghost lap on Neon Loop, ghosts/me-v3.json (the scoreboard never uses localStorage).
export function loadGhost() {
  return loadGhostFor('neon-loop');
}

// Loads one champion: {seed, generation, id, brain, lapSteps, fitness, ...}, or null if it doesn't exist.
export async function loadChampion({ seed, generation, multi = false }) {
  const file = await loadChampionsFile(seed, multi);
  const champ = file?.champions?.[generation];
  return champ ? { seed, generation, multi, ...champ } : null;
}
