// URL options:
//   ?autoplay=1     start with the AI driving
//   &seed=N         the random seed of the evolution (default 1)
//   ?champion=3-40  run one saved champion alone (seed 3, generation 40)
//   &compare=3-1    the brain shown next to it in the 70-numbers grid (N)
//   ?race=3-10      my ghost lap against the seed 3 generation 10 champion's best lap
//   ?scoreboard=3   my ghost lap against seed 3's champions of generations 1, 5, 10, 20, 40, 80
//   (with &autoplay=1 the race starts, and the scoreboard reveals itself, right away)

const params = new URLSearchParams(location.search);
const seed = Number.parseInt(params.get('seed') ?? '', 10);
export const AUTOPLAY = params.get('autoplay') === '1';
export const SEED = Number.isFinite(seed) ? seed : 1;
export const CHAMPION = params.get('champion');
export const COMPARE = params.get('compare');
export const RACE = params.get('race');
const board = Number.parseInt(params.get('scoreboard') ?? '', 10);
export const SCOREBOARD = Number.isFinite(board) ? board : null;
