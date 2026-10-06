// The scoreboard: my ghost lap against the champion of each fixed generation.
// Built only from the saved files (ghosts/me-v3.json and champions/seed-N.json), nothing typed in.

import { STEPS_PER_SECOND } from './constants.js';
import { CHAMPION_GENERATIONS } from './evolution.js';

// rows: one per fixed generation, with both lap times (in steps), the winner and the running score
export function buildScoreboard(ghost, champions) {
  const score = { me: 0, ai: 0 };
  const rows = CHAMPION_GENERATIONS.filter((g) => champions[g]).map((generation) => {
    const champ = champions[generation];
    const aiSteps = champ.lapSteps ?? null;
    const winner = aiSteps === null || ghost.steps < aiSteps ? 'me' : aiSteps < ghost.steps ? 'ai' : 'tie';
    if (winner !== 'tie') score[winner]++;
    const by = aiSteps === null ? null : Math.abs(ghost.steps - aiSteps) / STEPS_PER_SECOND;
    return { generation, id: champ.id, meSteps: ghost.steps, aiSteps, winner, by, score: { ...score } };
  });
  return { rows, total: score };
}
