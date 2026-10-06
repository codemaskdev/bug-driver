// Evolution: how one generation of brains turns into the next.
// Rank the cars, keep the best 10 as parents, copy the very best unchanged,
// and fill the rest with slightly mutated copies of the parents.
// Everything random comes from one seeded generator: same seed, same evolution.

import { makeRng } from './rng.js';
import { POPULATION, createGeneration, randomBrains, stepGeneration, fitness, trackProgress } from './generation.js';

export const PARENTS = 10;          // the top 10 cars become parents
export const MUTATION_RATE = 0.1;   // each of the 70 numbers has a 10% chance to change...
export const MUTATION_SIZE = 0.3;   // ...by a random nudge of typical size 0.3 (gaussian sigma)
export const CHAMPION_GENERATIONS = [1, 5, 10, 20, 40, 80]; // fixed in advance, never picked by looks

// A fresh evolution: generation 1 is 100 random brains from the seed.
export function createEvolution(track, seed) {
  const rand = makeRng(seed);
  return {
    seed,
    track,
    rand,
    gen: createGeneration(track, randomBrains(rand), 1),
    history: [],      // one row of stats per finished generation
    champions: {},    // generation number -> the best car's 70 numbers (only CHAMPION_GENERATIONS)
    parentOf: {},     // car id -> its parent's id, for every car that ever lived (the family tree)
    firstLap: null,   // {generation, steps, id} of the first lap ever completed
  };
}

// Selection: rank all cars by fitness, best first, and keep the top 10 as parents.
// (Step 7b scores a car differently, by its fitness summed over three tracks, and passes that in as `score`.)
export function selection(cars, score = fitness) {
  const ranked = cars.slice();
  ranked.sort((a, b) => score(b) - score(a));
  return ranked.slice(0, PARENTS);
}

// A random number from a bell curve around 0 (most nudges small, a few bigger), from the seeded generator.
export function gaussian(rand) {
  const u = 1 - rand(), v = rand(); // u in (0, 1] so the log is safe
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Mutation: copy a parent's 70 numbers, and give each one a 10% chance to be nudged a little.
export function mutate(brain, rand) {
  const child = [];
  for (const number of brain) {
    if (rand() < MUTATION_RATE) {
      child.push(number + gaussian(rand) * MUTATION_SIZE);
    } else {
      child.push(number);
    }
  }
  return child;
}

// Picks a parent, weighted by rank: the best of the 10 is picked 10x as often as the 10th.
export function pickParent(parents, rand) {
  const total = (parents.length * (parents.length + 1)) / 2; // 10 + 9 + ... + 1 = 55
  let ticket = rand() * total;
  for (let i = 0; i < parents.length; i++) {
    ticket -= parents.length - i;
    if (ticket < 0) return parents[i];
  }
  return parents[parents.length - 1];
}

// The numbers we track for every generation (all straight from the cars, nothing estimated).
export function generationStats(gen) {
  const fits = gen.cars.map(fitness);
  const laps = gen.cars.map((c) => c.bestLapSteps).filter((s) => s !== null);
  const best = selection(gen.cars)[0];
  return {
    generation: gen.number,
    bestFitness: Math.max(...fits),
    averageFitness: fits.reduce((a, b) => a + b, 0) / fits.length,
    finishedLap: laps.length,                       // cars that completed at least one lap
    bestLapSteps: laps.length ? Math.min(...laps) : null,
    bestProgress: trackProgress(best.world) / (gen.track.checkpoints.length + 1), // share of one lap
    championId: best.id,
    steps: gen.step,
  };
}

// The next generation: 1 elite (the best brain, unchanged, so the best can never get worse) + 99 mutated children.
export function nextGeneration(evo) {
  const gen = evo.gen;
  const parents = selection(gen.cars);
  const elite = parents[0];
  const brains = [elite.brain.slice()];
  const family = [{ parentId: elite.id, elite: true }];
  while (brains.length < POPULATION) {
    const parent = pickParent(parents, evo.rand);
    brains.push(mutate(parent.brain, evo.rand));
    family.push({ parentId: parent.id, elite: false });
  }
  evo.gen = createGeneration(evo.track, brains, gen.number + 1, family);
  for (const c of evo.gen.cars) evo.parentOf[c.id] = c.parentId;
  return evo.gen;
}

// Wraps up a finished generation: records its stats and, at the fixed generations, its champion.
export function finishGeneration(evo) {
  const gen = evo.gen;
  const stats = generationStats(gen);
  evo.history.push(stats);
  if (CHAMPION_GENERATIONS.includes(gen.number)) {
    const champ = selection(gen.cars)[0];
    evo.champions[gen.number] = {
      id: champ.id,
      fitness: fitness(champ),
      lapSteps: champ.bestLapSteps,
      progress: stats.bestProgress,
      ancestors: ancestors(evo, champ.id),
      brain: champ.brain.slice(),
    };
  }
  return stats;
}

// The champion's family line, parent first, all the way back to generation 1.
export function ancestors(evo, id) {
  const line = [];
  for (let p = evo.parentOf[id]; p; p = evo.parentOf[p]) line.push(p);
  return line;
}

// One simulation step of the whole evolution. When a generation ends, it is recorded and the next one starts.
// Returns {events, firstLap, finished}: firstLap is set on the step the first lap ever is completed,
// finished is the stats row of a generation that just ended.
export function stepEvolution(evo) {
  const events = stepGeneration(evo.gen);
  let firstLap = null, finished = null;
  if (!evo.firstLap) {
    const lap = events.find((e) => e.type === 'lap');
    if (lap) firstLap = evo.firstLap = { generation: evo.gen.number, steps: lap.steps, id: evo.gen.cars[lap.index].id };
  }
  if (evo.gen.over) {
    finished = finishGeneration(evo);
    nextGeneration(evo);
  }
  return { events, firstLap, finished };
}

// Runs whole generations headless, as fast as possible, until `generations` have finished.
export function runEvolution(evo, generations, onGeneration = () => {}) {
  while (evo.history.length < generations) {
    const { finished } = stepEvolution(evo);
    if (finished) onGeneration(finished, evo);
  }
  return evo;
}
