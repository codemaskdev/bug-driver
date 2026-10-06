// Step 7b: training on several tracks at once (pre-registered in DEVLOG.md, Step 7a).
// Every car drives every track, alone, under the usual rules; its fitness is the SUM of
// its single-track fitness scores. Everything else is exactly the one-track evolution:
// 100 cars, top 10 parents, 1 elite, mutation 10% / sigma 0.3, one seeded random generator.

import { makeRng } from './rng.js';
import { createGeneration, randomBrains, runGeneration, fitness, trackProgress, POPULATION } from './generation.js';
import { selection, pickParent, mutate } from './evolution.js';
import { refuseTraining } from './held-out.js';

export const MULTI_CHAMPION_GENERATIONS = [1, 5, 10, 20, 40, 80, 100];

export function createMultiEvolution(tracks, seed) {
  tracks.forEach(refuseTraining); // never on Exam
  const rand = makeRng(seed);
  return {
    seed, tracks, rand,
    number: 1,
    brains: randomBrains(rand),   // the 100 brains of the generation about to drive
    family: [],                   // their parents (none for generation 1)
    history: [], champions: {}, parentOf: {},
  };
}

// Multi-track fitness: drive every track, add up the single-track fitness scores.
export function multiTrackFitness(perTrack) {
  return perTrack.reduce((sum, c) => sum + fitness(c), 0);
}

// One whole generation: the same 100 brains drive each track; returns the ranked cars.
export function runMultiGeneration(evo) {
  const gens = evo.tracks.map((t) => runGeneration(createGeneration(t, evo.brains, evo.number, evo.family)));
  const cars = evo.brains.map((brain, i) => {
    const perTrack = gens.map((g) => g.cars[i]);
    return { id: perTrack[0].id, parentId: perTrack[0].parentId, brain, perTrack, fitness: multiTrackFitness(perTrack) };
  });
  return cars;
}

// Records the stats (and, at the fixed generations, the champion), then makes the next 100 brains:
// 1 elite + 99 mutated children of the top 10, exactly like nextGeneration().
export function stepMultiEvolution(evo) {
  const cars = runMultiGeneration(evo);
  const parents = selection(cars, (c) => c.fitness);
  const best = parents[0];
  const fits = cars.map((c) => c.fitness);
  const row = {
    generation: evo.number,
    bestFitness: best.fitness,
    averageFitness: fits.reduce((a, b) => a + b, 0) / fits.length,
    championId: best.id,
    perTrack: evo.tracks.map((t, k) => {
      const laps = cars.map((c) => c.perTrack[k].bestLapSteps).filter((s) => s !== null);
      return {
        track: t.id,
        finishedLap: laps.length,
        bestLapSteps: laps.length ? Math.min(...laps) : null,
        championLapSteps: best.perTrack[k].bestLapSteps,
        championProgress: trackProgress(best.perTrack[k].world) / (t.checkpoints.length + 1),
      };
    }),
  };
  evo.history.push(row);
  if (MULTI_CHAMPION_GENERATIONS.includes(evo.number)) {
    const line = [];
    for (let p = evo.parentOf[best.id]; p; p = evo.parentOf[p]) line.push(p);
    evo.champions[evo.number] = {
      id: best.id, fitness: best.fitness,
      lapSteps: Object.fromEntries(row.perTrack.map((r) => [r.track, r.championLapSteps])),
      ancestors: line, brain: best.brain.slice(),
    };
  }
  // the next generation
  const brains = [best.brain.slice()];
  const family = [{ parentId: best.id, elite: true }];
  while (brains.length < POPULATION) {
    const parent = pickParent(parents, evo.rand);
    brains.push(mutate(parent.brain, evo.rand));
    family.push({ parentId: parent.id, elite: false });
  }
  evo.number++;
  evo.brains = brains;
  evo.family = family;
  family.forEach((f, i) => { evo.parentOf[`${evo.number}-${i}`] = f.parentId; });
  return row;
}
