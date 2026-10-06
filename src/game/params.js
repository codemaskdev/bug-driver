// URL options: ?autoplay=1 starts with the AI driving, &seed=N picks the random seed (default 1).

const params = new URLSearchParams(location.search);
const seed = Number.parseInt(params.get('seed') ?? '', 10);
export const AUTOPLAY = params.get('autoplay') === '1';
export const SEED = Number.isFinite(seed) ? seed : 1;
