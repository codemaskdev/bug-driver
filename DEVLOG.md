# Bug Driver — DEVLOG

## 2026-10-06 — Rules: fixed timestep, sim apart from rendering, English PROMPTS.md
Commit f51d0b9. Three rules added to CLAUDE.md: the simulation moves in fixed 1/60 s steps, it is kept apart from rendering (x1 / x10 / max and headless in Node), and PROMPTS.md stays English-only.
No game yet, no numbers. Nothing broke.

## 2026-10-06 — Step 1: a track and a bug car you can drive
Commit 8267f57. The Neon Loop track is stored as data: 33 centerline points plus a 64 px width, smoothed into 495 samples (3961 px of road). 83 invisible checkpoints sit 48 px apart. The tightest bend is the hairpin, 47.9 px centerline radius.
The car is a cyan pixel ladybug with a 24×16 px hitbox and simple arcade physics: 330 px/s top speed, wheels that turn gradually, less steering at low and at high speed. A wall stops it dead with sparks and CRASHED; R restarts. Each lap saves the car's exact starting state plus one input per step (4 key bits), so the best lap can be replayed later as a ghost.

Real numbers, from a scripted driver (it follows the centerline and slows for curves, pressing the same 4 keys a player has; no AI):
- Careful settings: 17.20 s best lap (1032 steps), no crash in 60 s.
- Fastest of 980 settings (`node tools/reference-lap.js`): 12.88 s (773 steps). 718 of the 980 settings crashed. The fastest lap still brakes for 32 steps and drops to 158 px/s in the hairpin.
- Theoretical floor: 3961 px at 330 px/s, flat out on the centerline, is 12.00 s.
- Cars that finished a lap: 1 (the scripted one). No AI yet, so no generations.

Checks (8 tests, `npm test`, all pass): walls never cross; a full lap counts; a whole wrong-way loop counts nothing; crossing the line, reversing back over it and crossing again counts nothing; skipping 63 of 83 checkpoints counts nothing; flat out with no steering crashes once, the car stays put, and R restarts. A recorded flying lap replayed from its 1032 inputs finishes in exactly 1032 steps, in the same state the real car was in. Two identical runs match bit for bit.
In real Chrome (headless, synthetic key presses driven by the same scripted driver): 2 laps counted, best lap 1032 steps saved to localStorage with 1032 inputs, crash and R work, no errors.

What broke:
- Two tests failed on their first run, and both bugs were in my tests, not the game. The reverse-over-the-line test didn't drive forward long enough to cross the line again. The ghost test compared against the wrong state: a lap event's `start` is where the lap began, not where it ended.
- The first car sprite looked like a cyan capsule, not a bug. I redrew it as a ladybug (head, eyes, spots, antennae) and grew the hitbox from 22×14 to 24×16.
- Not tested: how it feels in human hands. All the driving here came from a script.

🎬 Maybe: 718 of 980 settings for a hand-coded "perfect" driver crashed, on a track a human can drive.

## 2026-10-06 — Stop tracking .DS_Store
Commit 1be3b4b. Step 1's commit accidentally included src/.DS_Store, because I staged everything with `git add -A`. This commit removes it and adds a .gitignore. No game change, nothing else broke.

## 2026-10-06 — Rule: devlog commits are separate
Commit 322ddb5. CLAUDE.md now says DEVLOG/PROMPTS updates go in their own `docs: devlog for <hash>` commit. No game change. Nothing broke.

## 2026-10-06 — A bigger ladybug you can actually see
Commit e5b6bc3. After the first human test drive the car was hard to see. It is now a ladybug drawn from above: a round cyan shell with a dark center line and 5 dots on each wing case, a small dark head with two eyes, antennae, and a glowing cyan outline.
- On screen: 40×30 px with antennae and wheels, up from 30×18. The shell plus head is 36×26 px, up from 26×18. About 2.2× the area.
- Hitbox: it was a 24×16 px rectangle. Now it is a 9-point outline that follows the round shell and the head, 36×26 px, sitting just inside the drawn shell. A rectangle that size would stick out past the round shell's corners, so you would crash before visibly touching the wall.
- The car's center spawns 30 px behind the line (was 20), so its longer nose stays behind the start line.
- PHYSICS_VERSION is now 2, so best laps saved with the old hitbox are no longer loaded. Their ghosts wouldn't replay the same with the new shape.

Reference laps re-run (`node tools/reference-lap.js`), same track, same driver:
- Careful settings: 17.20 s (1032 steps), unchanged.
- Fastest of 980 settings: 13.00 s (780 steps), was 12.88 s (773 steps).
- 806 of 980 settings crash now, up from 718. The track got tighter for a car that is 26 px wide on a 64 px road.
- Theoretical floor still 12.00 s.
- Cars that finished a lap: 1 (scripted). No AI yet.
All 8 tests pass. In headless Chrome: 2 laps counted, best lap saved under the new physics-2 key, crash and R work, no errors.
Nothing broke.

## 2026-10-06 — Direction chevrons at the start
Commit e14a0cb. Three faint cyan chevrons sit on the road 60, 92 and 124 px past the start line, pointing the way to drive. They are drawn once into the track image and have no effect on the simulation. Nothing broke.

## 2026-10-06 — A 90 px road
Commit a6c88e0. The human test drive said the steering and physics feel good but the 64 px road was too tight. The road is now 90 px wide. Car physics and the 36×26 hitbox are unchanged.

Just setting width to 90 broke two things, so the layout was adjusted:
- Hairpin: its tightest centerline radius was 47.9 px, barely more than the new half-width of 45, so the inner wall shrank to an almost-sharp point about 3 px across. It is now a proper half-circle of radius 70. Its two legs are 140 px apart (were 128), its apex moved from x 238 to x 260, and its tightest radius is now 57.4 px, so the inner wall bends at about 12 px (it was 16 px at 64 px). It is still the tightest turn on the track.
- Top: the top wall would have sat at y 47, right under the lap time HUD. The top straight moved down 15 px (y 95 → 110), and the wall is now at y 63.
- To make room, the infield leg under the hairpin moved down 22 px (y 232 → 254), and the long U-turn became a round half-circle from y 258 to 452. The leg after it moved down 12 px (y 440 → 452).
- The right side, the bottom straight, the start line and the turn order are unchanged.
- Track length went from 3961 px to 3939 px, and checkpoints from 83 to 82 (still every 48 px, now on the new centerline).
PHYSICS_VERSION is now 3, so old best laps and ghosts are no longer loaded. A new test checks that the road is full width everywhere, meaning no other wall comes closer than 45 px to the centerline.

Reference laps (`node tools/reference-lap.js`, same 980 driver settings), 64 px → 90 px:
- Careful: 17.20 s (1032 steps) → 17.25 s (1035 steps)
- Fastest: 13.00 s (780 steps) → 12.68 s (761 steps)
- Crashed: 806 of 980 → 543 of 980
- Theoretical floor (flat out on the centerline): 12.00 s → 11.93 s
- Cars that finished a lap: 1 (scripted). No AI yet.
All 9 tests pass. In headless Chrome: 2 laps counted, best lap saved under the physics-3 key, crash and R work, no errors.

🎬 Maybe: the same hand-coded driver, 64 px vs 90 px road: 806 → 543 crashes out of 980.

## 2026-10-06 — Physics freeze
Commit 29a3ff9. CLAUDE.md now says physics and track are frozen at PHYSICS_VERSION 3, and changing them needs the user's OK first, because it would invalidate the ghost lap and all training. No game change. Nothing broke.

## 2026-10-06 — Step 2: the car gets eyes
Commit 6903182. 5 distance rays at −60°, −30°, 0°, +30°, +60° from the heading, each up to 200 px. They live in src/sim/sensors.js:
- castRay(): how far the car can see in one direction.
- readSensors(): the car's whole view, 5 distances in px.
- getInputs(): the brain's future input, and the only 6 numbers the car will ever know. Each eye becomes 1 − distance/200 (1 = touching, 0 = nothing in range), and speed becomes speed/330, with reversing counted as 0.
Each eye sits on the car's hitbox outline, not at its center, so "0 px" really means the wall touches the car. From the center, the nose eye is 21 px out, the 30° eyes 15.9 px and the 60° eyes 12.4 px.
On screen the rays go from cyan (far) to pink-red (close), with a dot at each hit. E toggles the explain overlay: the real distance next to each hit, plus a BRAIN INPUTS panel with the 6 values. With the overlay on, the car is drawn at the exact simulation pose, not the smoothed one, so the numbers on screen are the ones the brain will get. Sensors only read the car; a test confirms a lap with sensors read every step is identical, bit for bit, to one without.

Ray distances at known spots (rays left 60 / left 30 / ahead / right 30 / right 60, px):
- Parked in the middle of the bottom straight, facing along the track: 39.58 / 74.50 / 200 / 73.76 / 39.47. On paper, a wall 45 px to each side gives 39.52 for the 60° rays and 74.14 for the 30° rays. The small left/right difference is because the track there is tilted −0.18°.
- Turned to face the outer wall, 35 px from the car's center: 57.12 / 24.52 / 14.00 / 24.52 / 57.22. Front ray 14.00 = 35 − 21 (the nose), front input 0.930.
- Scripted lap, step 200, right side, 299 px/s: 39.8 / 91.6 / 200 / 65.7 / 39.5, speed input 0.908.
- Scripted lap, step 510, hairpin apex, 125 px/s: 200 / 111.0 / 70.7 / 52.5 / 44.1. That is the closest the front ray gets on the lap.
- Independent check: the test walks along 150 rays from one scripted lap in 0.25 px steps until it leaves the road, with no ray-wall math. Worst disagreement with castRay 0.34 px, mean 0.13 px.
Lap numbers are unchanged (physics frozen): scripted careful lap 17.25 s, browser run 2 laps, no errors. Cars that finished a lap: 1 (scripted). No AI yet.

What broke: one new test failed on its first run because its test wall was ±50 px long, too short for a 30° ray to reach; the code was right. The rays were too faint on the first look, so the line went from 1.5 to 2 px and got brighter, and the panel bars now use the same cyan-to-pink-red as the rays.

🎬 The E overlay: the ladybug in the hairpin with five rays, the 43–153 px labels, and the BRAIN INPUTS panel next to it. "These 6 numbers are all it will ever know" is a ready-made Short.

## 2026-10-06 — Step 3: a brain, and generation 1
Commit e1f268d. The brain is a tiny neural network written from scratch in src/sim/brain.js. 6 inputs (getInputs) go to 6 hidden neurons (tanh), then to 4 outputs (sigmoid): gas, brake, left, right. An output above 0.5 holds that key for the step, so the AI uses exactly the player's 4 keys. The whole brain is one flat array of 70 numbers (6×(6+1) + 4×(6+1)), seeded random in −1..1. The functions are neuron(), layer(), outputs() and think().
100 cars start together and don't collide with each other. A car is out on a crash, or after 3 s without a new checkpoint (stall); a generation ends when all are out or at 60 s. fitness() = checkpoints passed in order plus the fraction of the way to the next one. Progress % = fitness / 83 (82 checkpoints plus the start line again), so 100% is one lap.
Tab switches to AI mode. 1/2/3 set x1/x10/max: max draws nothing while the generation runs, only a "MAX SPEED" line. `?autoplay=1&seed=N` starts in AI mode and reruns generation 1 every 4 s after it ends. E shows the leader's rays, its 6 inputs, and its 4 outputs with the pressed keys lit. The leader is drawn bigger and bright, live cars at 45%, wrecks at 22%. Manual mode, the lap timer and the ghost recording are untouched.

Generation 1, headless (`node tools/generation-report.js`). Rules for counting: "barely moved" = never got 36 px (one car length) from the start; "backwards" = got out more than 36 px behind the start, measured along the track. The categories overlap.

| seed | barely moved | backwards | crashed in first 2 s | all crashes / stalls | best | best car out by |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 57 | 16 | 25 | 33 / 67 | 14.5% | crash at 2.97 s |
| 2 | 46 | 17 | 28 | 40 / 60 | 20.6% | stall at 6.97 s |
| 3 | 61 | 20 | 14 | 24 / 76 | 65.1% | crash at 11.40 s |
| 4 | 68 | 5 | 22 | 30 / 70 | 49.6% | crash at 6.52 s |
| 5 | 48 | 23 | 28 | 40 / 60 | 50.6% | crash at 6.62 s |

No generation came close to the 60 s limit; every one was over in 5.1–11.4 s. Generations finished, cars that finished a lap: 0. Nothing was tuned based on these numbers.
Speed: a whole generation of 100 cars simulates headless in 0.21–0.25 s, so no spatial index was needed and wall collisions still run through the exact same code.
In Chrome, seed 3 (x1, then x10, then max) ended at the same step as headless: 684 steps, best 65.1%, out by crash, 24 crashes. The browser and Node agree. Tab back to manual mode drives and starts the lap timer; the manual lap check still passes (2 laps, best lap saved). 22 tests pass. New tests cover the 70-number brain, the neuron math on a hand example, think() pressing exactly the outputs above 0.5, a do-nothing brain stalling after exactly 180 steps, a gas-only brain crashing in the first turn, and same seed = same generation.

What broke:
- On screen, about 50 stalled cars parked in exactly the same spot on the start line. Their 22% transparency stacked up until the pile looked like a live, bright car, even at ALIVE 2/100. Wrecks in the same spot are now drawn once.
- A leader's "right" output of 0.49982 was shown as "0.500", and in an earlier frame a value just above 0.5 showed "0.500" with the key lit. Both were true but confusing, so values within 0.0005 of 0.5 now show 5 decimals.
- The explain panels' top corner sat on the inner wall of the top-right curve, so they moved 18 px down and got 6 px narrower.

🎬 Seed 2: the best-looking chaos. At 1.5 s there are wrecks scattered all over the start straight, spark bursts on both walls, and cars sitting backwards, and 28 cars are dead in the first 2 seconds. Runner-up for a different Short is seed 3: a random brain, with no learning at all, still gets 65.1% of the way round before crashing in the U-turn. A "beginner's luck" moment.

## 2026-10-06 — My ghost lap, saved to the repo
Commit c5f6489. My best manual lap was exported from my own Chrome's localStorage (origin localhost:3000, key `bug-driver:best:neon-loop-6ujqcw:physics-3`) into ghosts/me-v3.json. The file holds the exact start state, all 1584 inputs (one per step) and the lap time: 1584 steps = 26.40 s.
The page sent the stored text to a local file byte for byte: 1731 bytes, and the SHA-256 in the browser matches the file (8ff671bd9b064d07…). I didn't copy it by hand.
Headless replay (`src/sim/ghost.js`, `tests/ghost.test.js`): the ghost finishes the lap in exactly 1584 steps, on its very last recorded input. CLAUDE.md now says the scoreboard uses this file, never localStorage.
For scale: my 26.40 s is 9.15 s slower than the careful scripted driver (17.25 s) and 13.72 s slower than the fastest one (12.68 s). The same localStorage also still held an old 42.92 s lap from physics 1 (64 px road, old hitbox); it is invalid under the frozen rules and was not exported.
Nothing broke.

## 2026-10-06 — Step 4: evolution
Commit 5ce52d5. How a new generation is made (src/sim/evolution.js, every step its own function):
- fitness(): how far along the track (checkpoints in order + fraction to the next), plus, for a finished lap, 6000 ÷ lap time in seconds. "Go as far as you can; if you finish, finish fast." A finisher always outranks a non-finisher.
- selection(): rank all 100, keep the top 10.
- Elitism: the best brain goes through unchanged. The simulation is deterministic, so it drives the exact same run again, and the best fitness can never go down (tested).
- mutate(): copy a parent's 70 numbers; each has a 10% chance of a gaussian nudge, sigma 0.3. Parents are picked weighted by rank (10:9:…:1).
- nextGeneration(): 1 elite + 99 mutated children. Everything comes from the one seeded RNG.
Every car has an id ("gen-index") and its parent's id. Champions (the best by fitness) of generations 1, 5, 10, 20, 40 and 80 are saved with their 70 numbers and their full ancestor line, to champions/seed-N.json and to localStorage. Per-generation stats go to runs/seed-N.json. The HUD shows "GEN · ALIVE · BEST LAP", plus a live best/average fitness chart and a "FIRST LAP — GEN N" flash. Max speed now runs generation after generation, without drawing the track.

100 generations per seed (`node tools/evolution-report.js <seed>`). Lap times are the fastest lap of any car in that generation, in seconds.

| seed | first lap | gen 1 | gen 5 | gen 10 | gen 20 | gen 40 | gen 80 | gen 100 | Node time |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **never** | — | — | — | — | — | — | — | 58.8 s |
| 2 | gen 8 (18.40 s) | — | — | 16.90 | 13.58 | 13.20 | 12.58 | 12.53 | 268.8 s |
| 3 | gen 4 (38.18 s) | — | 30.02 | 13.17 | 12.65 | 12.52 | 12.47 | 12.43 | 324.3 s |
| 4 | gen 21 (27.27 s) | — | — | — | — | 17.32 | 13.28 | 13.13 | 234.0 s |
| 5 | gen 22 (15.50 s) | — | — | — | — | 13.22 | 12.57 | 12.57 | 292.1 s |

The Node times were measured with all 5 seeds running at once, one process each.
- Cars that finished a lap at gen 100: seed 2: 39, seed 3: 42, seed 4: 34, seed 5: 49 (of 100).
- Against the reference laps (careful script 17.25 s, fastest script 12.68 s, floor 11.93 s): seeds 2, 3 and 5 beat the fastest hand-tuned script by gen 80, and seed 3 already does at gen 20 (12.65). The best, seed 3 at gen 100 (12.43 s), is 0.50 s off the theoretical floor. Seed 4 ends at 13.13 s, between the two scripts.
- Against my ghost (26.40 s): every seed that learned to lap is faster than me within a few generations of its first lap. Only seed 3's gen 5 lap (30.02 s) is slower than mine.

**Seed 1 never finished a lap in 100 generations.** Its best fitness climbed to 43.0 (51.8% of a lap) at generation 6 and stayed exactly there until generation 100: 95 generations of no progress. Its champion crashes at the exit of the hairpin, at (261, 245), 6.57 s in. Per the rules, that's the story, and nothing was tuned.

Champion vs fastest lap: the champion is the best by fitness, not by lap time, so it isn't always the fastest lapper. Seed 3 at gen 40: the fastest lap is 12.52 s, the champion's is 12.53 s. The races against my ghost will use the champions' own laps.

In Chrome: the first 10 generations of seed 1 at max speed (3.3 s of wall time) match the headless history exactly, row for row. The champions of gens 1, 5 and 10 landed in localStorage. Seed 3 flashed "FIRST LAP — GEN 4" at the same lap (car 4-78, 2291 steps) as headless. 30 tests pass.

Suggested official seed, from these numbers only: **seed 3**.
- It has the earliest first lap (gen 4).
- It is the only seed where the scoreboard has a real AI lap that is still slower than mine (gen 5: 30.02 vs 26.40). So the "AI vs me" thread gets a genuine "I'm still winning" moment before the AI passes me at gen 10 (13.17).
- It is faster at every fixed generation from 10 on than any other seed at the same generation, and it has the fastest final lap (12.43 s).
- Its gen 1 already had the 65.1% "beginner's luck" car.
Honest caveat: picking a seed after seeing the results is a choice. The video should say that 5 seeds were run and that seed 1 never learned to finish.

🎬 Official seed 3, generation 4: car 4-78 completes the first lap ever, in 38.18 s, slower than my 26.40. "FIRST LAP — GEN 4" flashes over a track full of generation-4 wrecks. Six generations later the best lap is 13.17 s.
🎬 Seed 1's flat line: best fitness 43.0 for 95 generations straight, all stuck at the same hairpin.
