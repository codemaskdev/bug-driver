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

Addendum to the Step 4 entry (precision; the numbers above are unchanged):
- When each seed first beat my 26.40 s, outside the fixed scoreboard generations: seed 2 at gen 8 (18.40 s, its very first lap), seed 3 at gen 6 (19.25 s), seed 4 at gen 23 (19.88 s), seed 5 at gen 22 (15.07 s).
- So seed 4's first lap (27.27 s, gen 21) was also slower than mine, but that is not a scoreboard generation. On the fixed scoreboard, seed 3 still beats me only at gen 5, and first overtakes me at gen 10.
- "First lap" in the table is the first lap ever completed, not the fastest lap of that generation. For seed 5 at gen 22, the first car over the line did 15.50 s, while the fastest lap of that generation was 15.07 s.

## 2026-10-06 — Step 5: see the brain think
Commit 4106a20 (game). Plan update in the CodeMask repo: c29dd37.
- **B, live brain panel:** the real network from brain.js, drawn from explainThink(), for the leader or any clicked car. 6 inputs, 6 hidden neurons, 4 outputs, and all 60 connections: thickness = |weight|, cyan +, pink −. Nodes glow by value, and an output turns solid yellow when its key is pressed.
- **F, explain one decision:** freezes the simulation and shows one hidden neuron (the one with the biggest say in the chosen key) and that key's output neuron. Every input × weight, the sum, + bias, the total, tanh or sigmoid, then pressed or not. ← → pick the key.
- **N, the 70 numbers:** a grid of every weight and bias, optionally next to a second brain.
- **Champion viewer:** `?champion=3-40` (and a picker in the bottom-right corner) runs one saved champion alone, then shows its best lap against the time recorded during evolution.
- The panels never compute their own version. Each car now keeps the 5 distances and 6 inputs of its last decision, and while you look inside its head it is drawn at the pose where it made that decision (its previous pose), with the rays it actually saw.

Checks (34 tests pass):
- On 100 random frames of seed 3's evolution, explainThink() matches what the car really did. Its keys equal the keys the car pressed, its outputs equal outputs(), and every product, sum, total and squashed value adds up to within 1e-9. It is the same arithmetic in the same order, so in practice the values are identical.
- The view and inputs a car keeps are exactly readSensors() and getInputs() at its pose before the move (400 steps of the seed 3 gen 20 champion).
- All 30 saved champions (5 seeds × 6 generations), run alone, reproduce their recorded best lap to the step and their fitness exactly.
- Seed 3's first 6 generations still reproduce runs/seed-3.json row for row, so storing the decisions changed nothing.
- In Chrome, with B, E and N open at x10, seed 3's first 3 generations equal the recorded history. Clicking car 4-1 selects car 4-1. While frozen, the step counter doesn't move.
- Champion 3-40 alone at max speed drove laps of 12.78, 12.57, 12.55 and 12.53 s. Best 752 steps = 12.53 s, recorded 752: exact match. The first lap is slower because it starts from a standstill 30 px behind the line.
- Seed 3's gen 80 champion vs gen 1 champion: 62 of the 70 numbers differ, and its family line runs 79 generations straight back to the gen 1 champion, car 1-85. Same shape, mostly different numbers, one family.

What broke: nothing in the simulation. The on-screen problems were all found in screenshots:
- The champion header ran under the picker, and the picker covered the speed indicator. The picker moved to the bottom-right corner, and FROZEN moved under the speed indicator.
- The champion's solo car showed id "40-0" (the solo run renumbered it). It now keeps its evolution id "40-69".
- The "EXACT MATCH" line overlapped the brain panel, so it moved into the empty infield.

🎬 "Explain one decision", the seed 3 gen 40 champion at the hairpin, step 368 of its solo run (the champion viewer, not the live evolution leader). Its left-60° eye sees the inside wall only 23 px away (input 0.883), and ahead is 94 px. Hidden neuron h6: 0.883 × −1.117 = −0.987 is the biggest term; sum −0.380, + bias −1.173 = −1.554, tanh → −0.914. Output LEFT: h6's −0.914 × −0.615 = +0.562 is the biggest push; sum 1.758, + bias −1.086 = 0.672, sigmoid → 0.662 > 0.5 → LEFT PRESSED. It is braking at the same time (BRAKE 0.549). "The wall on my left is 23 px away, so... turn left", because it is hugging the inside of the hairpin.

## 2026-10-06 — The beginner guide, chapters 0–5
Commits 7c64ea0 (rules in CLAUDE.md), 84e10d9 (figures), 6713931 (guide), fbf6b21 (a correction). No game code changed.
- HOW-IT-WORKS.md: chapters 0–5 plus a glossary, each chapter in the fixed template, every number with a "reproduce it" note.
- tools/figures.js draws all 19 figures from the real simulation in 14 s and writes every number it uses to docs/img/figure-data.json. Running it twice gives byte-identical files.

New facts found while checking the claims (all reproducible with `node tools/figures.js`):
- **Seed 1's dead end.** In generation 31, 0 of the 100 cars pressed BRAKE even once. The best car (31-0, an unchanged elite copy) drives flat out and hits the outer wall at the hairpin exit at 330 px/s. 9 cars crashed on exactly that spot. 6 of the top 10 have exactly the same fitness, 43.0. Of the 100 crashes, 48 hit the inner wall and 52 the outer wall. Best fitness stayed at 43.0 from gen 6 to 100, and the 9306 children of gens 7–100 never beat it.
- **The inside line is real, but it isn't a full racing line.** Distance toward the inner wall at the hairpin apex: gen 1 7.4 px, gen 5 19.6, gen 10 2.2 (and −14.6 just after, drifting wide), gen 20 16.4, gen 40 22.7, gen 80 27.2 (about 5 px of air between the shell and the wall, at 143 px/s). None of them swings wide before the turn the way a racing driver does.
- **The family line.** Seed 3's gen 80 champion (80-0) has an unbroken line of 80 cars back to 1-85: 41 unchanged elite copies and 38 mutated children. The last change was in gen 62, and 54 of the 80 were their generation's champion. The hairpin car 40-69 is in the line. Car 4-78, the very first lap, is not: the line went through 4-0.
- **Gen 1 vs gen 80:** 62 of the 70 numbers changed.
- **One generation, really (seed 3 gen 4 → 5):** 4-78 (291.0) got 20 of the 99 children, the 10th parent got 1. Number of changed values per child: 1 to 14, 6.85 on average.

What broke:
- **Missing glow lines.** Every glowing line that was perfectly vertical or horizontal disappeared from the first SVGs: the simulation-step ticks and the walls in the road-width figure. An SVG filter sized to the shape's own box has nothing to draw on when the box is 0 px wide. The filter now covers the whole picture.
- **Charts too low.** The fitness charts were capped at 500, but fitness reaches 875 (several laps plus the lap bonus).
- **Unrepresentative mutation example.** The first example was child 5-1, which happened to have 14 changes, the most of all 99 children. It was swapped for a typical child, 5-13, with 7 changes, and the figure now states the range.
- **Labels running into each other.** Text overlapped in several figures: the hairpin views' legends sat on the road, and the seed labels piled up at the right edge of a chart. The legends moved below the maps (with the maps clipped), and the end labels are now nudged apart.
- **Two wrong claims in my first draft:**
  - "Skipping 63 checkpoints": that was the old 83-checkpoint track; it is 62 of 82 now.
  - "Rerunning writes exactly the same runs/seed-3.json": the file also stores the run time. The history is identical.
  - The first was fixed before its commit, the second in fbf6b21.

🎬 The inside-line table: generation 1 drives down the middle of the hairpin, and generation 80 passes the apex 5 px from the inner wall. Nobody told it to.

## 2026-10-06 — The guide in two levels
Commits 73e3221 (rules), 0539f2f (DEEP-DIVE.md), fe0332c (simple HOW-IT-WORKS.md), f773644 (web page). No game code changed.
- **DEEP-DIVE.md** is the full guide from before, with two edits. Chapter 0 has a new analogy: blindfolded drivers whose children inherit their habits with small copying mistakes. The dog-learning-a-trick analogy implied learning during a run, which never happens here. The seed 1 "why" is now labelled "Our best explanation:".
- **HOW-IT-WORKS.md** is new and simple. It starts with an "In 30 seconds" box, and each chapter has one idea, one picture and one real moment. Six new big-text figures (simple-*.svg) are drawn from the same real data.
- **docs/guide/** is built by `node tools/guide-page.js` from the two Markdown files: index.html (simple) and deep-dive.html. It is checked at phone width (390 px): no sideways scrolling, no broken images, and all 6 deep-dive links land on real headings.

What broke:
- **Three sentences in my first simple draft weren't true or weren't sourced.** All were fixed before the commit:
  - "The hairpin can't be driven without braking": letting go of the gas also slows the car. The true version is that it can't be taken flat out.
  - "Most of the rest never left the start": the real number is "almost half barely moved".
  - "It was no fun to drive": nobody said that.
- **The same "without braking" slip was in DEEP-DIVE.md** and was fixed too ("slow down: brake, or at least let go of the gas").
- **Four commit messages are malformed.** In the four Part 1 commits, my script put only one newline before the Co-Authored-By/Claude-Session lines, so they are glued onto the subject line (visible in `git log --oneline`). History isn't rewritten; later commits are fine.
- **Labels on top of things.** Several simple figures had labels sitting on walls or on each other; they were moved into free space.

## 2026-10-06 — Step 6: me vs the AI
Commits dcc99b3 (race mode and scoreboard) and 3ff5439 (guide chapter 6, both levels).
- **The race.** My ghost (ghosts/me-v3.json, 26.40 s, cyan) and a champion (yellow) drive at the same time without colliding. Each starts its best lap exactly where that lap really began: championBestLap() drives the champion alone for 60 s and keeps its fastest lap and its start state.
- **No lap, no contest.** A champion with no lap starts from the normal spot and drives until it crashes or stalls; I win by default, and the screen marks where it got out.
- **Live gap:** when did the leader pass the spot where the other car is now.
- **The scoreboard** is buildScoreboard() over my ghost file and champions/seed-3.json; nothing is typed in.
- **Opening it:** in the game, S from AI mode (S is brake while I drive). ↑↓ pick a row, Enter races it. For recording: `?race=3-10`, `?scoreboard=3`, `&autoplay=1`.

All six races (headless, and the same in Chrome):

| gen | me | AI | result |
| --- | --- | --- | --- |
| 1 | 1584 steps, 26.40 s | crashes at 65% of a lap | ME WINS (by default) |
| 5 | 26.40 s | 1801 steps, 30.02 s | ME WINS by 3.62 s |
| 10 | 26.40 s | 790 steps, 13.17 s | AI WINS by 13.23 s |
| 20 | 26.40 s | 759 steps, 12.65 s | AI WINS by 13.75 s |
| 40 | 26.40 s | 752 steps, 12.53 s | AI WINS by 13.87 s |
| 80 | 26.40 s | 748 steps, 12.47 s | AI WINS by 13.93 s |

- Score 2 : 4 to the AI, computed from the files. Each race ends exactly at the recorded lap times, to the step.
- The gen 40 champion races 752 steps (12.53 s), not its standing-start first lap of 767 steps (12.78 s).
- Against gen 10 I'm about half as fast everywhere. 0–40% of the lap: 8.28 s vs 4.65 s. 40–65% (top straight, hairpin, the leg after it): 8.12 s vs 3.58 s, the biggest gap. 65–100%: 9.98 s vs 4.92 s.
- 39 tests pass (5 new).

What broke:
- The race code matched the recorded laps on the first run.
- On screen: the live gap sat on the top wall, the ME and GEN 10 tags covered each other at the finish, and "crashed here" hid under the car. All were fixed after the first screenshots.
- Small and not fixed: two presses of the same key within one frame count once (a scripted test that pressed ↓ twice in a row moved one row). A person pressing keys won't hit this.

🎬 Generation 10, the first time the AI beats me. It leads from the first quarter of a second. When it crosses the line at 13.17 s I'm only 53% of the way round, and it's 6.4 s ahead of me at that moment. Final: AI WINS by 13.23 s (`?race=3-10&autoplay=1`).

## 2026-10-06 — Fix: no pictures in the web guide when double-clicked
Commit 972e5f8. Opening docs/guide/index.html by double-click showed text but no images.
- **Cause: Safari, not the paths.** The paths in the page were already correct (`../img/...` from docs/guide/), and all SVGs are valid XML. In headless Chrome via file:// (no flags) all 7 + 22 images loaded. But on this Mac a double-clicked .html opens in Safari, the system default (Chrome is only set for http links). Safari lets a local page read files in its own folder and below, and `../img/` is outside that.
- **Reproduced with Safari's engine.** WKWebView with read access limited to the page's folder (docs/guide/): 0 of 7 images loaded. With access one folder up (docs/): 7 of 7.
- **Fix:** tools/guide-page.js now copies every figure the pages use into docs/guide/img/ (29 SVGs + figure-data.json) and links them as `img/...`. The HTML is still never edited by hand.
- **New check in the build:** every `<img>` in every generated page must exist on disk and stay inside the page's folder, and every image path in the Markdown must exist relative to the repo root. Otherwise it fails. Tested by hiding one SVG: the build stopped with "image docs/img/simple-2-eyes.svg does not exist" and exit code 1.
- **After the fix:**
  - Chrome file://, at 390 px and at 1280 px: index.html found 7, loaded 7; deep-dive.html found 22, loaded 22; no sideways scrolling.
  - WebKit with access to docs/guide/ only: 7/7 and 22/22.
  - GitHub: all 7 + 22 image paths in HOW-IT-WORKS.md and DEEP-DIVE.md exist and are tracked in git.
- **What broke, honestly:** my earlier page check passed because it ran in Chrome only, never in the browser that actually opens the file here.

## 2026-10-06 — Fix, second try: pictures built into the web guide
Commit 0407de0. After 972e5f8 the user reopened the page and the chapter 6 scoreboard was still a broken image. The broken-image icon in the screenshot was Chromium's, not Safari's.
- **What I could and couldn't check.**
  - Could: in headless Chrome via file:// and in WebKit (even with access to the HTML file only), all 7 + 22 images loaded.
  - Couldn't: the Chrome extension can't open file:// pages, so I couldn't look at the user's own window.
  - My best explanation: the page was shown by a viewer that lets a local page load no other files at all (some apps' built-in HTML previews work like that). Not confirmed.
- **Fix, independent of the viewer.** tools/guide-page.js now builds every figure into the page itself, as a data: URL made from the SVG file. The docs/guide/img/ copies from 972e5f8 are gone.
  - Page sizes: index.html 208 KB, deep-dive.html 748 KB.
  - The build fails if a Markdown image path doesn't exist (tested: exit code 1 with simple-6-scoreboard.svg hidden, 0 normally), or if any <img> still points at a file.
- **Checked:**
  - Chrome file://, at 390 px and 1280 px: index.html 7/7 images, deep-dive.html 22/22.
  - The strictest case: both HTML files copied alone into an empty folder, with no figures next to them. Chrome loads 7/7 and 22/22, and so does WebKit with read access to the HTML file only.
  - GitHub is unaffected: the Markdown still points at docs/img/, and all of those files are tracked.
- **What broke, honestly:** the first fix (972e5f8) solved a real Safari problem but not the one the user saw. I declared it done after testing in two engines, without knowing which app actually showed the page.

## 2026-10-06 — Step 7a pre-registration (written before any test is run)
This entry is in the same commit as the tracks themselves, on purpose: it has to be fixed before any car drives them. (Normally devlog entries get their own commit; this one is the exception the prompt asked for.)

**The four new tracks.** Same format, same 90 px road, same frozen physics and car. Neon Loop is unchanged.
| track | what it is | length | checkpoints | direction | tightest bend |
| --- | --- | --- | --- | --- | --- |
| Neon Loop Mirrored | Neon Loop driven the other way round | 3939 px | 82 | clockwise | 63 px |
| Zigzag | many quick left-right turns, no hairpin | 2815 px | 59 | counterclockwise | 57 px |
| Wide Sweepers | long fast curves, one tight corner at the end | 2725 px | 57 | counterclockwise | 66 px |
| Exam | held out: a mix of everything, with a hairpin that turns right (Neon Loop's turns left) | 4085 px | 86 | clockwise | 55 px |

SHA-256 of the four tracks' data (`node tools/track-hash.js`): **f4fccfefb8b489772df3dfdfe32adfbdcaa68dbf872e67792e43de89036a2d9c**. tests/tracks.test.js fails if the data ever changes. After this commit the tracks never change.

**Checks done before registering.** These are validity checks only: no champion and no AI brain has driven these tracks.
- Geometry: walls never cross, the road is the full 90 px everywhere, everything fits on screen, and the start spot is clear.
- Drivability: the hand-written scripted test driver (no AI) completes a lap on each.
- One change made during design: Zigzag's bottom points were raised 8 px so its wall clears the key hints at the bottom of the screen.

**Roles.**
- Neon Loop Mirrored: a test track in 7a only.
- Zigzag + Wide Sweepers: tested now in 7a, and the extra training tracks in Step 7b.
- Exam: held out. Nobody trains on Exam, ever. No AI result on Exam is computed or shown until my first 3 laps on it are recorded.

**The exact tests (7a), changed by nothing that comes out of them.**
- Cars: every saved seed 3 champion (gens 1, 5, 10, 20, 40, 80), plus the gen 80 champions of seeds 2, 4 and 5.
- Tracks: Neon Loop Mirrored, Zigzag, Wide Sweepers. Exam is not run in 7a.
- How: each car runs alone, from that track's normal start spot, under the same rules as in evolution. It is out on a crash, after 3 s without a new checkpoint (stall), or at 60 s (time).
- Reported per car and track: its best lap time if it completed a lap; otherwise how far it got (% of a lap, the start line counting as the first checkpoint), how it got out (crash or stall), and where (x, y, and which part of the track).
- 🎬: the most telling failure, ideally the champion that beat me by 14 s crashing in the first corner of a track it has never seen.

**Me on Exam.** Exam becomes drivable in manual mode (track picker). My first 3 completed laps on it count, and the best of the three is my Exam time. Crashed attempts are not laps. The laps are saved and exported to ghosts/me-exam.json. No AI result on Exam is shown to me before I drive.

## 2026-10-06 — Step 7a: did it learn, or memorize?
Commits fa2a3a1 (pre-registration, track SHA-256 f4fccfef…6a2d9c), b4def4f (track picker, Exam record, tests), 130c825 (guide chapter 7, both levels). The pre-registered tests were run exactly as written, and nothing was changed after seeing the results. Exam was not run.

Results (`node tools/generalization-report.js`, saved in runs/step7a.json, re-checked by tests/step7.test.js). Each cell is the best lap, or how the car got out and how far it got.
| car | Neon Loop (home) | Mirrored | Zigzag | Wide Sweepers |
| --- | --- | --- | --- | --- |
| seed 3 gen 1 | no lap | crash at 10.5% (1.98 s, outer wall, first corner after the start) | stall at 0.1% (3.00 s, never really moves) | crash at 60.2% (7.43 s, inner wall) |
| seed 3 gen 5 | 30.02 | crash at 50.4% (14.93 s, outer wall, mirrored hairpin) | 19.77 s | 20.47 s |
| seed 3 gen 10 | 13.17 | 13.33 s | 9.37 s | 8.23 s |
| seed 3 gen 20 | 12.65 | 13.20 s | 9.25 s | 8.17 s |
| seed 3 gen 40 | 12.53 | 13.92 s (1 lap; then stall at the hairpin on lap 2, 23.62 s) | 9.83 s | 8.25 s |
| seed 3 gen 80 | 12.47 | crash at 49.8% (7.63 s, inner wall, mirrored hairpin) | 9.38 s | 8.33 s |
| seed 2 gen 80 | 12.58 | stall at 50.0% (9.95 s, mirrored hairpin) | 9.65 s | 8.08 s |
| seed 4 gen 80 | 13.28 | crash at 53.0% (7.88 s, outer wall, hairpin exit) | 9.30 s | 8.47 s |
| seed 5 gen 80 | 12.57 | crash at 51.5% (7.78 s, inner wall, mirrored hairpin) | 9.88 s | 8.23 s |

The mirrored hairpin is around checkpoint 41 of 82, i.e. 50% of the lap.

- **Zigzag and Wide Sweepers transfer almost perfectly.** Every champion from gen 5 on finishes; from gen 10 on, all four seeds are within 0.6 s of each other.
- **Neon Loop Mirrored splits them.**
  - Gens 10 and 20 drive it (13.33 and 13.20 s, close to their home laps).
  - Gen 40 finishes once, then fails its second, faster lap at the hairpin.
  - All four gen 80 champions fail at the hairpin, which now turns right.
- **The 🎬 failure, traced step by step.** The seed 3 gen 80 champion (the one that beat me by 13.93 s) arrives at 330 px/s at 6.6 s, brakes, and is at 0 px/s by 7.10 s. It keeps holding BRAKE + RIGHT. From a standstill BRAKE is reverse, so it backs up at up to 90 px/s into the inner wall at 7.63 s. Recorded with `?champion=3-80&track=neon-loop-mirrored`.
- **Interpretation (labelled as an inference in the guide):** the general skills transfer, but the longest-trained champions look specialized to Neon Loop's one left-turning hairpin. That rests on one seed across generations plus three at gen 80, so it is a pattern, not a proof.
- **Exam is ready for me.** It's drivable with T or `?track=exam`; the HUD counts "counted laps 0/3"; crashes don't count; G downloads me-exam.json after 3 laps. Checks:
  - In headless Chrome, the hand-written scripted driver (not AI) completed laps on Exam. Only 3 counted, and G downloaded a file whose best lap replays headless to the exact step. That run happened in my headless profile only; its time isn't reported anywhere.
  - `?champion=…&track=exam` falls back to Neon Loop.
  - No AI has driven Exam.
- 52 tests pass.

What broke: nothing in the code. While designing, before registration, Wide Sweepers' inner wall crossed itself (fixed by opening the corner) and Zigzag was lifted 8 px. The prompt hoped for a first-corner crash; the real failure is mid-lap, at the mirrored hairpin, and that's what's reported.

🎬 The champion that beat me by 14 s stops dead in its own hairpin driven backwards, keeps the brake down, and reverses into the wall (`?champion=3-80&track=neon-loop-mirrored`, crash at 7.63 s).

## 2026-10-06 — Step 7b: training on three tracks (the exam waits for my Exam lap)
Commits 4b4662f (training, champions) and 9250e2a (races on other tracks).

**My Exam lap isn't there yet.**
- The prompt reported "I drove Exam: 3 counted laps, best 21.37 s".
- There was no me-exam.json in Downloads or anywhere on disk.
- In the browser's localStorage (localhost:3000) there was no Exam record and no Exam lap. The best lap stored for **Zigzag** is exactly 1282 steps = 21.37 s, so the drive was on Zigzag (T cycles Neon Loop → Mirrored → Zigzag → Wide Sweepers → Exam).
- So Exam is still undriven and still blind. Part 1 (my Exam ghost) and part 3 (the exam) wait for that drive. Neon Loop Mirrored is held back too, because the prompt puts it in part 3.
- Seen in the same storage, not used anywhere: my Neon Loop best is now 1349 steps (22.48 s). My official Neon Loop ghost stays ghosts/me-v3.json (26.40 s), as frozen in Step 4.

**Step 7b, exactly as pre-registered.**
- Seed 3, from scratch, 100 generations on Neon Loop + Zigzag + Wide Sweepers.
- Every car drives all three tracks alone; its fitness is the sum of its three single-track fitness scores.
- Everything else is unchanged: 100 cars, top 10, elite, mutation 10% / sigma 0.3, the one seeded RNG.
- Run time: 554 s in Node.
- Exam isn't a training track (a test checks that). Nothing about the training set, the method or Exam was changed.

Multi-track champions (`node tools/multi-train.js`, champions/seed-3-multi.json). Each one, run alone again, reproduces these laps to the step (tests/step7b.test.js).
| gen | car | Neon Loop | Zigzag | Wide Sweepers | fitness (sum) |
| --- | --- | --- | --- | --- | --- |
| 1 | 1-85 | no lap (65%) | no lap (0%) | no lap (60%) | 89.0 |
| 5 | 5-0 | no lap (67%) | 11.53 s | 11.82 s | 1672.7 |
| 10 | 10-47 | 13.53 s | 8.65 s | 8.37 s | 2926.4 |
| 20 | 20-0 | 13.20 s | 8.25 s | 8.17 s | 3117.8 |
| 40 | 40-0 | 13.25 s | 8.17 s | 8.20 s | 3130.7 |
| 80 | 80-0 | 13.20 s | 8.15 s | 8.18 s | 3135.3 |
| 100 | 100-0 | 13.17 s | 8.15 s | 8.17 s | 3138.4 |

- Gen 1 is the same 100 random brains as the one-track run, since it's the same seed: car 1-85 again.
- At home on Neon Loop the multi-track champions are slower than the one-track ones: 13.17 s at gen 100, against 12.47 s for the one-track gen 80 champion. On the two other tracks they're faster than the one-track champions were.

**A risk noticed after Step 7a, written down before the exam is run.** None of the three training tracks has a right-hand hairpin. Neon Loop's turns left, and Zigzag and Wide Sweepers have none. Exam has one, and a right-hand hairpin is exactly what broke the gen 80 champions on Mirrored. We kept the pre-registered plan anyway, so if multi-track training doesn't help on Exam, that's the result.

- Also new: `?race=exam&champion=3-multi-100` races a champion against my ghost on another track. It refuses when I have no ghost lap there; for Exam that means until ghosts/me-exam.json exists.
- 55 tests pass.

## 2026-10-06 — Real code in the guide
Commits b16d35e (readability pass) and 87083da (intro chapter, code boxes, deep-dive code).

**The goal:** a complete beginner should be able to follow everything, including the code.

**The readability pass.** These functions were rewritten to read like plain steps: getInputs (now split, with the maths in inputsFromView), neuron, think, fitness, the step loop in stepGeneration, selection, mutate, crossedCheckpoint and raceResult. The changes were clear names, one idea per line and plain loops instead of chains of array tricks. selectionBy is gone: selection now takes the score as an optional second argument, which the multi-track run uses. nextGeneration was already plain and stays as it was.

**The proof that nothing changed:**
- All 55 tests pass, including the ghost replay check and every champion lap time.
- `node tools/verify-seed.js 3` reruns all 100 generations of seed 3 from scratch (232 s). Its history is identical to runs/seed-3.json, and its champions (all 70 numbers, laps, fitness, family lines) are identical to champions/seed-3.json.
- The full rerun was done twice. The first ran before the last two rewrites (crossedCheckpoint, raceResult); the second ran after them. Both came out identical.

**The boxes.**
- tools/code-boxes.js pulls each function out of its source file by name. Each box is written once in HOW-IT-WORKS.md as a hidden spec: one line of code and its explanation per row.
- The build fails in any of these cases: a function is missing, a line in the box no longer matches the real code, a line has no explanation, lines are skipped without saying what they do, or a box shows more than 12 lines.
- On the web page each box is two columns, code on the left and the explanation on the right; on a phone they stack.
- In Markdown, the code comes first, then a numbered explanation for every line.
- There are 13 boxes across chapters 0–7. The deep dive shows each function in full, with a short walkthrough.

**What broke (in the tooling, before anything was committed):**
- The first matcher compared lines with their indentation stripped, so a `}` could match the wrong closing brace. It now compares lines with their indentation.
- The deep dive wrote "÷", which goes against the guide's no-maths-symbols rule; it now says "divided by".

Checked in Chrome at 390 px and 1100 px: 13 boxes, 8 of 8 images, no sideways scroll.

## 2026-10-06 — Step 8: things for viewers
Commits 693bff8 (guide fixes), 66c3a8b (Exam rule), 4dba24e (track check, share links), 82fd0c4 (track menu, editor, any track), f34f7c7 (replay check), 846ceed (guide chapter 8), a3c3eb2 (CLAUDE.md).

**Guide fixes first** (693bff8):
- `export` is now in the symbols list.
- The neuron box says what squash means.
- The mutate box gives the usual nudge (about 0.3 or less).
- "Roll a die".

**The Exam rule, in one place** (66c3a8b).
- Every AI car in the game, the tools and the tests is created by `createGeneration()`. It now refuses Exam, and any track with exactly Exam's points in another order, before a single car exists.
- So the races, the champion viewer and live training can't put an AI car on Exam, even by mistake.
- Exam never opens in the editor and never goes in a share link, in either direction (tested). The one test that touches it passes no brains at all.
- ghosts/me-exam.json still doesn't exist. When it does, Step 7b's exam has to lift this guard on purpose.

**The track check** (4dba24e), with a plain message and a spot to circle for each problem:
- at least 4 points and at most 60;
- the walls stay 10 px inside the screen;
- the tightest bend of the road's middle line is at least 45 px in radius (half the road), or the inside wall folds over itself;
- parts of the road more than 180 px apart along it are at least 100 px apart on screen.

The car itself could turn tighter (a radius of about 19.5 px at walking pace), so the road's shape is the real limit. All four drivable built-in tracks pass; their tightest bends are Zigzag 46.2 px, Neon Loop 53.4 px and Wide Sweepers 55.2 px.

**Share links** (4dba24e): `?t=` + "1" + 4 URL-safe letters per point (2 letters = 0..4095).
- Paperclip, 18 points: 73 letters.
- Decoding checks the version, the length, the letters and the whole track check, and gives a plain message otherwise. 2000 random strings and 12 broken links: no crash.
- Every drivable built-in track round-trips to identical walls, checkpoints and start.

**In the game** (82fd0c4):
- T opens a track menu: the built-in tracks (Exam marked drive-only), "My track", the track from a link, "Edit / new track", "Copy link", and with a champion running "Copy link: this track + champion".
- The editor: click to add points, drag to move, right-click to delete, Backspace to undo; the check runs live, and "Drive it" / "Let the AI train on it" stay off until the track is valid.
- Drive, test any of the 37 saved champions (30 one-track, 7 multi-track), or train from scratch with a seed box, on any track except Exam.
- This landed as one commit, not three: the editor, the links and "any track" are the same changes to main.js, and they couldn't be split cleanly without interactive staging.
- Checked in Chrome:
  - the editor (drawing, dragging, deleting, the messages);
  - a broken link opens Neon Loop with its message;
  - Tab on Exam is refused with a message;
  - "Copy link" copies;
  - the Paperclip link with &champion=3-80 gives lap 850 steps and a crash at step 1380, the same as in Node;
  - training seed 3 on Paperclip gives the same generations 1 and 2 in the browser and in Node, to the last digit.
- Not checked by hand: a full lap of my own on a custom track. Driving uses the same code as on the built-in tracks.

**The replay check** (f34f7c7): six scenarios, compared with tools/replay-golden.json, in about 2 s, also inside `npm test` (61 tests pass).
- The scenarios: my Neon Loop ghost (1584 steps), champion seed 3 gen 20 (best 759 steps), gen 80 (748), multi-track gen 100 (790), seed 3 generations 1–3 (identical to the first 3 rows of runs/seed-3.json), and Paperclip from its link.
- **What broke:** the first version compared only my ghost's lap time. In a throwaway copy we changed the car's turn rate by 0.0000001. Five scenarios flagged it, but my ghost still finished in exactly 1584 steps, so it passed. Its path fingerprint was added; now all 6 of 6 flag that change.

**🎬 Paperclip** (`?t=1DcBkCgCgCgIwDcJsQkJsRgIwRgH-QaG4G4G4FsGgFUFoFsEwG4EYQaEYRgDSRgCgQkBkIwBk&champion=3-80`).
- A loop with a notch that ends in a hairpin turning right.
- The seed 3 gen 80 champion drives lap 1 in 14.17 s, slowing to 7 px/s in the hairpin, almost a stop, and creeping round.
- On lap 2 it stops dead in the same hairpin at 22.48 s, keeps holding BRAKE (reverse from a standstill), and backs into the wall at 23.00 s.

How it was found, logged in full: three champions (gen 20, gen 80, multi-track gen 100) on 12 drawn tracks.
- An oval, a small circle and a rounded square, each both ways round: all three drove all six for 60 s.
- Paperclip shapes with a left-hand hairpin: all fine.
- Right-hand hairpin: one was too tight to be valid. Of the other three, gen 20 got round all of them, gen 80 failed on two, and multi-100 failed on all three.

Every saved seed 3 champion on Paperclip:
| champion | result |
| --- | --- |
| gen 1 | no lap: stall at 3.00 s |
| gen 5 | no lap: crash at 19.88 s |
| gen 10 | 4 laps, best 14.32 s |
| gen 20 | 4 laps, best 14.08 s |
| gen 40 | no lap: stops in the hairpin, stall at 11.20 s |
| gen 80 | 1 lap (14.17 s), then crash at 23.00 s |
| multi-track gen 10 | 4 laps, best 14.38 s |
| multi-track gen 20 / 80 / 100 | no lap: crash in the hairpin at 8.57 / 8.58 / 8.48 s |

Not pre-registered: it's a track drawn for fun, chosen because it broke the champion. Our best explanation is the same as for Mirrored: neither Neon Loop nor the three Step 7b training tracks has a right-hand hairpin. This is not the exam; no AI has driven Exam.

**Other things that broke, all fixed before committing:**
- R on a multi-track champion restarted the one-track champion of the same generation. This bug has been there since 9250e2a.
- On a crowded track the fitness chart landed on the start line. It now goes where it covers the least road, and stays in Neon Loop's infield there.
- The editor's buttons covered the start point; they moved to the top right.

## 2026-10-06 — Step 7b, the exam
Commits 2dff84d (my Exam ghost), 0be70eb (Exam unlocked for testing), 5973520 (the exam), 0420dc5 (replay check), 8dc8606 (guide chapter 7), cc891eb (CLAUDE.md).

**My Exam lap** (2dff84d).
- ghosts/me-exam.json, copied unchanged from Downloads.
- My first 3 counted laps took 3242, 2658 and 1921 steps (54.03 s, 44.30 s, 32.02 s). The file is the third and best of them: **32.02 s is my official Exam time**.
- Checked three ways:
  - the browser's first-3-laps record holds exactly those three laps;
  - the file's inputs and start state are identical to lap 3 in it (same hash);
  - it replays headless to exactly 1921 steps (tests/exam-ghost.test.js).
- Prompt 15 said 21.37 s. As found then, that lap was on Zigzag. The real Exam lap is 32.02 s, and every race and number here uses it.

**Exam opened for testing, never for training** (0be70eb).
- `unlockExam()` checks the ghost: the exact track and physics, 3 counted laps, the best of them, and that it replays to its own time. Only then may `createGeneration()` put a saved champion on Exam.
- `createEvolution()` and `createMultiEvolution()` refuse Exam, always.
- In the game, Exam allows champions (`?track=exam&champion=3-80`) and the race; "train from scratch" and the seed box say "Nobody trains on Exam, ever".
- Exam still never opens in the editor or goes in a share link.
- Tests: a fake ghost doesn't unlock it; after a real unlock, training is still refused.

**The exam** (5973520, `node tools/exam-report.js` → runs/exam.json, every result checked again in tests/exam.test.js). Seed 3, each champion alone, under the evolution rules:
| champion | Exam | Neon Loop Mirrored |
| --- | --- | --- |
| gen 10, one track | 13.87 s (4 laps) | 13.33 s |
| gen 20, one track | 13.83 s (4 laps) | 13.20 s |
| gen 80, one track | crash at 6.17 s, 38.4% | crash at 7.63 s, 49.8% |
| gen 10, three tracks | crash at 5.95 s, 38.9% | crash at 7.62 s, 49.4% |
| gen 20, three tracks | crash at 5.80 s, 40.1% | crash at 7.52 s, 50.4% |
| gen 80, three tracks | crash at 5.95 s, 40.2% | crash at 7.52 s, 50.1% |
| gen 100, three tracks | crash at 11.60 s, 75.8% | crash at 2.27 s, 12.3% |

How they got out:
- **One-track gen 80:** the Mirrored failure all over again. It brakes to a dead stop in Exam's right-hand hairpin at 5.60 s, keeps BRAKE (reverse from a standstill) and backs into the wall, after 33 steps in reverse.
- **Three-track gens 10, 20, 80:** they go into the same hairpin too fast and never slow below 173–195 px/s.
- **Three-track gen 100:** gets round the hairpin, then crashes in the right-hand corner at the top right.
- **Mirrored:** the one-track results are identical to Step 7a. The three-track ones are new.

**The race:**
- My Exam lap against the best of them on Exam, the one-track gen 20 champion, best lap vs best lap: 32.02 s vs 13.83 s.
- **The AI wins by 18.18 s.** The browser gives the same result as Node.

**Did multi-track training help? No.**
- On Exam, none of the four three-track champions finishes a lap; two of the three one-track champions do.
- On Mirrored, none of the three-track champions finishes either.
- **Our best explanation:** none of the three training tracks has a right-hand hairpin (Neon Loop's turns left; Zigzag and Wide Sweepers have none). Training on them sped the cars up through the turns they knew; it didn't teach the one they didn't.
- We saw this risk after Step 7a and wrote it down in the Step 7b entry before the exam ran, and kept the pre-registered plan. Nothing was changed after seeing these results.
- One seed only, so it's a pattern, not a proof.

**Replay check** (0420dc5): now 7 scenarios. My Exam ghost was added. The golden results were updated on purpose with `--update`, and the diff is only the 6 new lines; the old 6 scenarios are unchanged.

🎬 **The exam race:** `index.html?race=exam&champion=3-20&autoplay=1`. My 32.02 s against 13.83 s, and the AI wins by 18.18 s.

🎬 **The champion that beat me reverses on Exam too:** `index.html?track=exam&champion=3-80`. A dead stop in the right-hand hairpin at 5.60 s, then backwards into the wall at 6.17 s.

🎬 **The first-corner crash Step 7a predicted, finally.** It's the most-trained multi-track car on Mirrored: `index.html?track=neon-loop-mirrored&champion=3-multi-100`, into the first corner at 2.27 s.

- 66 tests pass.

## 2026-10-06 — Step 7c pre-registration (written and committed before any training)
**Decided after seeing the exam, and said openly.** Step 7c was not part of the original plan. It exists because of the Step 7b exam result.

**Why.** On Exam, every one of the four three-track champions (Step 7b, gens 10, 20, 80, 100) crashed, three of them in the hairpin that turns right. None of the three training tracks (Neon Loop, Zigzag, Wide Sweepers) has a right-hand hairpin.

**Plan, fixed now:**
- Seed 3, from scratch, 100 generations, on 4 tracks: Neon Loop, Neon Loop Mirrored, Zigzag, Wide Sweepers.
- Mirrored is added because it has a right-hand hairpin (Neon Loop's hairpin, driven the other way).
- Every car drives all 4 tracks alone. Its fitness is the sum of its 4 single-track fitness scores.
- Everything else is unchanged from Step 7b: 100 cars, top 10 parents, 1 elite, mutation 10% / sigma 0.3, the one seeded random generator, the same rules (out on crash, after 3 s without a new checkpoint, or at 60 s).
- Champions at gens 1, 5, 10, 20, 40, 80, 100 go to champions/seed-3-multi4.json, the history to runs/seed-3-multi4.json.
- Exam is not a training track, and never will be. The training tool and every evolution refuse it.

**Test, fixed now:**
- After training, and only once, each of the 7 champions drives Exam alone under the same rules.
- Reported per champion:
  - on each of the 4 training tracks: its best lap, or how far it got and how it got out;
  - on Exam: the same, plus where it got out.
- The headline comparison uses the same generations as the Step 7b exam (10, 20, 80, 100): how many finish a lap on Exam, against 0 of 4 for the three-track champions and 2 of 3 for the one-track ones (gens 10, 20, 80).
- Then my Exam ghost (32.02 s) races the best of them on Exam: the fastest best lap, or if nobody finishes, the one that got furthest. Best lap vs best lap, as in every race.

**What this test can and can't show:**
- This is the second time Exam is used for testing. The first exam is why this step exists, so Exam is no longer a fully untouched test: we picked the change (adding Mirrored) because of what Exam showed.
- A pass would be weaker evidence than a pass on the first exam. A fail is still a fail.
- Mirrored becomes a training track, so its results here are training results, not a test.
- No other track is added or changed. Exam's own hairpin is not copied into training: Mirrored's hairpin is Neon Loop's, driven the other way.

**Whatever happens is the result.** No retries, no other seeds, no changes to the method, the tracks or the fitness after seeing anything.
