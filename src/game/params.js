// URL options:
//   ?autoplay=1     start with the AI driving
//   &seed=N         the random seed of the evolution (default 1)
//   ?champion=3-40  run one saved champion alone (seed 3, generation 40)
//   &compare=3-1    the brain shown next to it in the 70-numbers grid (N)

const params = new URLSearchParams(location.search);
const seed = Number.parseInt(params.get('seed') ?? '', 10);
export const AUTOPLAY = params.get('autoplay') === '1';
export const SEED = Number.isFinite(seed) ? seed : 1;
export const CHAMPION = params.get('champion');
export const COMPARE = params.get('compare');
