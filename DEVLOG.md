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
