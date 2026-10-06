// Numbers the whole simulation shares.

// One simulation step is always 1/60 s, no matter how fast the screen refreshes.
export const STEP = 1 / 60;
export const STEPS_PER_SECOND = 60;

// Bump this whenever car physics or lap rules change: saved best laps
// (and their ghost inputs) from an older version would no longer replay.
export const PHYSICS_VERSION = 1;
