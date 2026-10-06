# Bug Driver — PROMPTS

Every prompt sent during the build, verbatim, in order. Earlier entries are never edited.

## 1. Project setup

````text
We're starting episode 02 of CodeMask. Don't build the game yet — only set up the project.

## 1. The game repo (standalone from day one)
Create ~/Desktop/bug-driver as its own git repo (not inside CodeMask). Local git config: user.name "CodeMask", user.email "codemask@users.noreply.github.com". Create a PRIVATE repo codemaskdev/bug-driver on GitHub and push to it; we'll make it public at release.

Files:
- CLAUDE.md, the rules for this project:
  - What it is: a small car that learns to drive by itself in the browser (neural network + genetic algorithm), for a "how to" video titled "How to Build a Self-Driving Car AI Without Knowing AI".
  - Plain HTML5 + Canvas + vanilla JS, ES modules, no frameworks, NO ML libraries. The neural network and the evolution are written from scratch and must stay readable, because we explain them on screen.
  - Every core idea (sensor/ray, neuron, layer, activation, fitness, selection, crossover/mutation, generation) lives in a clearly named function with a one-line plain-English comment. The beginner guide will link to these by name.
  - Deterministic: one seeded RNG for everything (initial brains, mutations, spawns). Same seed = same evolution. Never Math.random().
  - ?autoplay=1&seed=N runs hands-free for recording footage.
  - Numbers shown on screen (sensor distances, weights, outputs, fitness) must be the real values from the simulation, never decorative.
  - One commit per feature/fix, authored as CodeMask.
  - After every prompt I send, append to PROMPTS.md: the prompt verbatim, then 2–3 lines on what was built and what broke. Never edit earlier entries.
  - After every commit, add a DEVLOG.md entry with real numbers (generation, best distance/lap time, how many cars finished). Mark moments that would make a good Short with "🎬".
  - Be honest: never invent or exaggerate problems for drama. If nothing broke, write "nothing broke". Corrections are new commits, never rewritten history.
  - The game must stay playable after every commit.
  - Visual style: CodeMask neon, like Bug Survivor (dark background, cyan hero, glowing pixel look). The car is a small bug-shaped car.
- README.md: one paragraph placeholder.
- PROMPTS.md and DEVLOG.md with headers only. Add this very prompt as the first PROMPTS.md entry.
- LICENSE: MIT, "CodeMask".

## 2. The episode folder (in this CodeMask repo)
Create episodes/02-bug-driver/plan.md with the plan below, so future sessions have the context:

Title: How to Build a Self-Driving Car AI Without Knowing AI
Format: viral "how to", 12–15 min, steps "Step 1/6 … 6/6" on screen. Each step: prompt on screen → result → 20–30 s explanation with real numbers → what broke and the fix. Thread through it: "AI vs me" race, my best lap vs the best car at generations 1, 5, 10, 20, 40, 80 (fixed in advance).
Story: hook (gen 1 chaos vs gen 50 clean lap, split screen) → promise (6 prompts, one evening, no ML knowledge) → build steps with 4 explainers (eyes/rays, brain/neuron, evolution, learned vs memorized) → car beats my lap → twist: new unseen track → honest fix attempt (train on several tracks) → final score → challenge: "draw a track that breaks my car" (tracks shareable as links).
Deliverables: the video; PROMPTS.md with 6 "golden path" prompts tested from an empty folder; HOW-IT-WORKS.md (beginner guide, links to functions); HOW-IT-WAS-MADE.md (all real prompts + failures); live demo on GitHub Pages with an "explain" overlay and a track editor.
Build stages: 0 setup, 1 track + manual driving + lap timer, 2 sensors, 3 brain + 100 cars, 4 evolution, 5 live brain view, 6 race vs my ghost, 7 new track / generalization, 8 track editor + share links + autoplay + replay check, 9 guides, 9½ golden-path test in an empty folder, 10 video.
Rules: scoreboard only at the fixed generations; if no car finishes a lap by generation 100, that becomes the story — no quiet parameter tuning; all on-screen numbers are real.

Commit in CodeMask as CodeMask. Then show me the bug-driver CLAUDE.md and the GitHub repo URL.
````

Built: the standalone repo with CLAUDE.md (project rules), README placeholder, empty PROMPTS/DEVLOG, MIT LICENSE, pushed to a private codemaskdev/bug-driver; plus episodes/02-bug-driver/plan.md in the CodeMask repo. No game code yet.
What broke: nothing broke.

## 2. Three new rules, then Step 1: a track and a car I can drive

````text
First, three additions to CLAUDE.md (one commit, "docs: ..."):
- Fixed timestep: the simulation advances in fixed steps of 1/60 s, independent of the frame rate and rendering. Determinism must hold on any monitor.
- Simulation and rendering are separate. The simulation can run at x1, x10, and "max" (no rendering, as fast as possible), and headless in Node for tests and benchmarks.
- PROMPTS.md is public and English-only: if a prompt isn't in English, log a faithful English version of it, with no translation marker.

Then, Step 1: a track and a car I can drive myself.

- One closed-loop track on a dark neon canvas: two glowing wall lines (inner and outer), a few real turns including one tight hairpin, a start/finish line. The whole track fits on screen.
- Store the track as data (an ordered list of centerline points plus a width), so later we can add more tracks and encode a track into a share link.
- Invisible checkpoints along the track, in order. They'll be used later to measure how far a car got, and they make sure a lap only counts if you drive the whole loop in the right direction.
- The car: small bug-shaped car, cyan, pixel-neon style, with simple arcade physics: acceleration, braking, steering that depends on speed, a bit of friction. It should feel fun to drive with arrow keys/WASD, not floaty, not twitchy.
- Hitting a wall = crash: the car stops, a short neon spark, "CRASHED" and R to restart. No sliding along walls.
- HUD: current lap time, best lap, lap counter. Best lap is saved in localStorage.
- Record my inputs every step during each lap, so my best lap can be replayed later as a "ghost" (we'll need it for the race). Store the best lap's inputs, not positions.

Before committing: drive it yourself with synthetic inputs, check that a full lap counts, a wrong-way or shortcut lap doesn't, and crashing works. Tell me your best lap time from a scripted driver, so I know what a decent time looks like. Update PROMPTS.md and DEVLOG.md as the rules say.
````

Built: the three rules; the Neon Loop track (33 centerline points, 64 px wide, 83 invisible checkpoints, a hairpin) with a ladybug car, crashes, lap timer, a best lap saved with its per-step inputs, and 8 headless tests. Scripted driver: 17.20 s careful, 12.88 s fastest.
What broke: two of my own tests were wrong on the first run (the lap logic was fine); the first car sprite looked like a capsule, not a bug, so it was redrawn bigger; I accidentally committed a .DS_Store and removed it in the next commit.

## 3. The car is hard to see

````text
Feedback from my first test drive: the car is hard to see.

1. Car readability: make the car about 1.5–2× bigger on screen and clearly a ladybug from above: round shell, a center line, dots, a small head, glowing cyan outline. If the hitbox changes, tell me the new size, and re-run the reference laps so the numbers stay honest.
2. Add a subtle direction arrow or chevrons on the track near the start, so it's obvious which way to drive.
3. Add to CLAUDE.md: "DEVLOG/PROMPTS updates go in a separate commit: docs: devlog for <hash>."

Update PROMPTS.md and DEVLOG.md as usual.
````

Built: the car is now a round-shelled cyan ladybug, 40×30 px on screen (it was 30×18). The hitbox is a 9-point outline that follows the shell, 36×26 px (it was a 24×16 rectangle). Three faint chevrons past the start line, plus the new commit rule. Re-run reference laps: 17.20 s careful (unchanged), 13.00 s fastest (was 12.88 s).
What broke: nothing broke. The bigger car does make the track tighter: 806 of 980 scripted settings now crash, up from 718.

## 4. The road is too tight

````text
Test drive feedback: steering and physics feel good, keep them exactly as they are. But the road is too tight.

1. Widen the road from 64 px to about 90 px. Keep the same layout and turns, including the hairpin. If the track no longer fits on screen at 90 px, adjust the layout slightly (shorter straights or a smaller loop) rather than shrinking the road. Tell me what you changed.
2. Bump PHYSICS_VERSION (old records and ghosts become invalid), move the checkpoints to the new centerline, and re-run the reference laps (cautious, fastest, crash count out of the same 980 settings) so I can compare with 64 px.
3. Don't touch the car physics or the hitbox.

Update PROMPTS.md and DEVLOG.md as usual.
````

Built: the road is 90 px wide, with the same layout and turns. The hairpin was redrawn as a rounder half-circle, and the top straight and the infield moved down 12–22 px so the walls clear the HUD. PHYSICS_VERSION is 3, the 82 checkpoints follow the new centerline, and there is a new test that the road is full width everywhere. Reference laps: 17.25 s careful, 12.68 s fastest, 543 of 980 settings crash (at 64 px: 17.20 s, 13.00 s, 806).
What broke: at 90 px the old points didn't work. The hairpin's inner wall shrank to an almost-sharp point, and the top wall ran into the lap time HUD. The layout was adjusted to fix both. Car physics and hitbox untouched.

## 5. Physics freeze, then Step 2: give the car eyes

````text
Physics freeze: the car physics, hitbox, track (90 px) and PHYSICS_VERSION 3 are now final. Add to CLAUDE.md: "Physics and track are frozen at PHYSICS_VERSION 3. Do not change them without asking me first: any change invalidates my ghost lap and all training." Commit that separately.

Then, Step 2: give the car eyes.

- Add 5 distance sensors (rays) fanned out in front of the car: −60°, −30°, 0°, +30°, +60° from the heading, each up to 200 px long. Each ray reports the distance to the nearest wall along it (200 if nothing within range).
- Put this in clearly named functions with one-line plain-English comments, e.g. castRay() ("how far can the car see in one direction") and readSensors() ("the car's whole view of the world: 5 numbers"). The beginner guide will link to these.
- Also define the brain's future input now: the 5 distances normalized to 0..1 (1 = wall touching the car, 0 = nothing in range), plus the car's speed normalized to 0..1. That's 6 numbers, the only things the car will ever know. Function: getInputs(), with a comment saying so.
- Visuals: draw the rays as thin glowing lines from the car, turning from cyan (far) to pink-red (close), with a small dot where each hits the wall.
- Explain overlay: press E to toggle. When on, each ray shows its real distance in px next to the hit point, and a small panel lists the 6 input values with labels (left 60°, left 30°, ahead, right 30°, right 60°, speed). These are the exact numbers the brain will get. When off, just the rays.
- Rays are visual and informational only: they must not change the physics, the ghost, or determinism.

Check: drive a scripted lap and confirm the ray distances are right at a few known spots (straight in the middle of the road: side rays symmetric; facing a wall up close: front ray small). Tell me those numbers. Update PROMPTS.md and DEVLOG.md, and mark a 🎬 if the E overlay looks good for a Short.
````

Built: the freeze rule; castRay(), readSensors() and getInputs() in src/sim/sensors.js. There are 5 rays starting on the car's outline, so 0 px means touching. They are drawn cyan to pink-red with hit dots, and E shows the px labels plus a BRAIN INPUTS panel. 6 new tests, including an independent ray-walk check over a scripted lap (worst error 0.34 px).
What broke: one new test was wrong on its first run (its test wall was too short for the 30° ray to reach); the code was fine. The first rays were too faint, so they were made brighter.

## 6. Step 3: a brain, and 100 cars with random brains

````text
Step 3: a brain, and 100 cars with random brains. No evolution yet — this step is only about generation 1.

The brain (from scratch, in its own file, every function with a one-line plain-English comment):
- A tiny neural network: 6 inputs (from getInputs) → 6 hidden neurons (tanh) → 4 outputs (sigmoid).
- The 4 outputs are the same 4 keys I press: gas, brake, left, right. An output above 0.5 means that key is held this step. The AI drives with exactly my controls, no special powers.
- That's 70 numbers in total (weights + biases). Keep them in one flat array, so "the whole brain is 70 numbers" is literally true in the code, and later evolution can copy and mutate that array.
- Clearly named functions: neuron() ("multiply each input by its weight, add them up, add the bias, squash"), layer(), think(inputs) → which keys to press. Initial weights: seeded random in −1..1.

The population:
- 100 cars start together on the start line. They don't collide with each other, only with walls.
- A car is out when it crashes, or when it makes no progress (no new checkpoint) for 3 seconds, so cars spinning in place or driving backwards don't run forever. A generation ends when every car is out, or after 60 seconds.
- Progress for now = number of checkpoints passed in the right order, plus a fraction toward the next one. Name it fitness() with a plain-English comment. Show the current leader highlighted (brighter, slightly bigger), the rest semi-transparent. Crashed cars stay where they crashed as dim wrecks: generation 1 should look like glorious chaos.
- HUD in AI mode: generation number, cars still alive (e.g. "ALIVE 37/100"), leader's progress in %.

Modes and speed:
- A toggle between "I drive" and "AI drives" (key: Tab). My manual mode, lap timer and ghost recording stay exactly as they are.
- Speed keys in AI mode: 1 = x1, 2 = x10, 3 = max (no rendering until the generation ends).
- ?autoplay=1&seed=N starts straight in AI mode.
- The E explain overlay also works in AI mode for the leader: its rays, its 6 inputs, and its 4 outputs as numbers with the pressed keys lit.

Check, headless: run generation 1 for seeds 1–5 and report for each: how many cars barely moved, how many went backwards, how many crashed in the first 2 seconds, the best progress %, and how the best car got out (crash or stall). Don't change anything based on those numbers — they're the honest starting point. Update PROMPTS.md and DEVLOG.md, and 🎬-mark the best-looking chaos seed.
````

Built: src/sim/brain.js, a 6→6→4 network whose whole brain is one array of 70 numbers, with neuron(), layer(), outputs() and think(). src/sim/generation.js runs 100 cars with fitness(), stalls, and the 60 s limit. AI mode on Tab, speeds x1/x10/max, autoplay, E for the leader with inputs and outputs. tools/generation-report.js reports generation 1: the best car reached 14.5% to 65.1% of a lap across seeds 1–5.
What broke: stalled cars all parked on the same spot stacked their transparency until they looked like a live car, so identical wrecks are now drawn once. An output of 0.4998 showed as "0.500", which looked like a pressed key, so values right at 0.5 now show 5 decimals. The panels were moved off a wall.

## 7. Export my ghost, then Step 4: evolution

````text
Step 4: evolution.

How a new generation is made (each step its own clearly named function with a one-line plain-English comment):
- fitness(): how far the car got along the track (checkpoints in order + fraction to the next). If it completed a lap, add a bonus that's bigger the faster the lap. In plain English: "go as far as you can; if you finish, finish fast."
- selection(): rank all 100 by fitness and keep the top 10 as parents.
- elitism: the single best car's brain goes to the next generation unchanged, so the best can never get worse.
- mutate(): every child is a copy of one parent's 70 numbers (parents picked weighted by rank), where each number has a 10% chance to be nudged by a small seeded random amount (gaussian, sigma 0.3). No crossover. Keep it simple enough to explain in one sentence.
- nextGeneration(): puts it together: 1 elite + 99 mutated children.
- Everything uses the one seeded RNG: same seed = the exact same evolution, generation by generation.

Tracking (for the video and the guide):
- Per generation: best fitness, average fitness, how many cars finished a lap, best lap time. Show a small live chart in the corner (best and average over generations) and "GEN 12 · ALIVE 37/100 · BEST LAP 15.42" in the HUD.
- Every car remembers its parent's id, so we can later draw the champion's family tree.
- Save the champion's 70 numbers at generations 1, 5, 10, 20, 40 and 80 into a champions JSON file (and localStorage in the browser). We'll race these against my ghost later. Use the generation number only, never pick "nice-looking" ones.
- When the leader finishes its first ever lap, flash "FIRST LAP — GEN N" (🎬 moment).

Check, headless, and don't tune anything based on it:
- Run seeds 1–5 for 100 generations each. For every seed report: the generation of the first completed lap, the best lap time at generations 1, 5, 10, 20, 40, 80, 100, and how long the run took in Node.
- Compare with the reference laps (cautious 17.25 s, fastest scripted 12.68 s, theoretical floor 11.93 s).
- If a seed has no completed lap by generation 100, say so plainly: per our rules that's the story, not something to fix quietly.
- Tell me which seed you'd suggest as the "official" one for the video and why, using only these numbers.

Update PROMPTS.md and DEVLOG.md, 🎬-mark the first-lap moment for the official seed.

Before anything else: export my current best lap (the ghost: start state + all inputs + lap time) from localStorage into a file in the repo, ghosts/me-v3.json, and commit it. From now on the scoreboard uses this file, not localStorage. Verify by replaying it headless and confirming it reproduces the same lap time to the step.
````

Built: ghosts/me-v3.json, my 26.40 s lap, which replays headless to exactly 1584 steps. Then evolution in src/sim/evolution.js: fitness with a lap bonus, selection(), elitism, mutate(), nextGeneration(). Also a live chart, the new HUD, a first-lap flash, family ids, and champions saved at the fixed generations. 100 generations for seeds 1–5: seeds 2–5 learned to lap (best 12.43–13.13 s at gen 100), seed 1 never finished a lap.
What broke: nothing in the code. Seed 1 is stuck at 51.8% of a lap (the hairpin) from generation 6 to 100. That is reported as is, not tuned.

## 8. Step 5: let us see the brain think

````text
Step 5: let us see the brain think.

1. Live brain panel (toggle with B), for the leader, or any car I click on:
   - 6 input nodes on the left with labels and live values (left 60°, left 30°, ahead, right 30°, right 60°, speed), 6 hidden nodes, 4 output nodes on the right labeled GAS, BRAKE, LEFT, RIGHT.
   - Connections drawn for all weights: thickness = how big the weight is, cyan = positive, pink = negative.
   - Nodes glow by their current value. An output node lights up fully when its key is pressed (> 0.5).
   - It's the real network from brain.js, drawn every frame from the real numbers. Nothing faked or smoothed.

2. "Explain one decision" (key F): freezes the simulation and shows, for one output (cycle with ←/→), the full calculation in plain numbers:
   each input × its weight, the sum, + bias, → squash → final value → "pressed" or "not pressed".
   Do it for one hidden neuron too (it feeds the output), so the whole path from "the wall is 43 px away" to "press LEFT" is on screen. Unfreeze with F again.
   Every number shown must equal what think() actually computed in that step. Add a test that checks this for 100 random frames, to 1e-9.

3. The 70 numbers (key N): a compact grid of all 70 weights/biases of the selected brain, colored cyan/pink by sign and brightness by size. Two brains can be shown side by side, e.g. the seed 3 champion of generation 1 vs generation 80, so you can see "same shape, different numbers".

4. Champion viewer: load any saved champion (seed + generation) and run it alone on the track, with rays and brain panel. URL: ?champion=3-40 and a small picker in the UI. Show its lap time when it finishes, and it must match the time recorded during evolution exactly.

5. Official seed: in episodes/02-bug-driver/plan.md (CodeMask repo), record: official seed = 3, chosen after seeing all 5 runs (we'll say that in the video); seed 1 never learned a lap in 100 generations, stuck at 51.8% at the hairpin exit — keep it as a scene; my official ghost = ghosts/me-v3.json, 26.40 s; scoreboard at gens 1/5/10/20/40/80 for seed 3 = me, me, AI, AI, AI, AI → 4:2 AI.

Determinism must stay intact (panels are read-only). Update PROMPTS.md and DEVLOG.md, 🎬-mark the best "explain one decision" frame (ideally the leader at the hairpin deciding to press LEFT).
````

Built: explainThink() in brain.js; each car now keeps its last view and inputs. B shows the live network (leader or a clicked car), F freezes and explains one decision for one hidden neuron and one output, N shows the 70-number grid (with a second brain to compare). There is a champion viewer (?champion=3-40 and a picker), and the official-seed decisions are in plan.md. A test checks the explanation against think() on 100 random frames, and all 30 saved champions replay their recorded lap and fitness exactly.
What broke: nothing in the simulation (the recorded seed 3 run still matches row for row). On screen, the champion header ran into the picker, the champion's solo car was called "40-0" instead of its real id "40-69", and the "exact match" line covered the brain panel. All three were fixed before the commit.

## 9. A beginner guide, written alongside the build

The message contained the prompt twice: a first version for chapters 0–4, then a second version for chapters 0–5. Both are logged as sent; the second one was followed.

````text
We're adding a beginner guide that we write in parallel with the build. Later we'll write the video script from it, so it has to be both correct and clear. Don't start Step 5 yet.

## 1. Rules (add to CLAUDE.md)
- Every build step ends with its guide chapter: code + tests + DEVLOG + chapter + figures. A step isn't done without its chapter.
- The guide is HOW-IT-WORKS.md in the repo root, figures in docs/img/.
- Figures are generated by code, never drawn by hand: tools/figures.js runs the real simulation and renders SVGs from real data (real frames, real weights, real generation stats). Conceptual diagrams are generated in the same style. One command regenerates all of them. Neon CodeMask style, readable on GitHub in both light and dark mode (draw on a dark rounded background).
- Every number in the guide is real, with a "reproduce it" note (seed, generation, step, or command).
- Audience: someone who has never heard of neural networks and may not code. Every term is explained the first time it appears, and added to a glossary at the end. Short sentences. No math notation beyond × and +.
- Later, a web version with 3–4 interactive figures. For now, mark the spots with "Interactive later: <idea>".

## 2. Chapter template (use it for every chapter)
- **The one idea**: one plain sentence (this becomes a voice-over line in the video).
- **Analogy**: an everyday comparison.
- **Key figure**: the main picture, with a caption.
- **Real numbers**: one worked example with the actual values.
- **What actually happened**: what broke, surprised us, or got stuck, honestly, from DEVLOG/git.
- **The prompt**: link to the matching PROMPTS.md entry.
- **In the code**: function names with file paths, one line each.

## 3. Write chapters 0–4 now
- 0. What we're building: the four parts (world, eyes, brain, evolution) in one diagram, and the promise "no AI knowledge needed".
- 1. The world: track, checkpoints, car physics, my controls; why a fixed timestep and one seed (same seed = same everything); the road-width change 64 → 90 px and why.
- 2. Eyes: the 5 rays, the 6 inputs, why we turn distances into 0..1; a real frame at the hairpin with its numbers.
- 3. Brain: one neuron worked through with real numbers (inputs × weights, sum, + bias, squash), tanh and sigmoid drawn as curves, the 6→6→4 network, "the whole brain is 70 numbers" (show the count), outputs = my 4 keys; generation 1 chaos with the seed 1–5 table.
- 4. Evolution: fitness ("go far; if you finish, finish fast"), top 10, elitism, mutation (10%, small nudge), one generation as a picture (100 → top 10 → 1 elite + 99 children); the seed 3 chart; the first lap at gen 4; seed 1 stuck at 51.8% for 95 generations and the plain-English reason why that happens; the 5-seed table and that seed 3 was chosen after seeing it.

## 4. Deliver
Commit the guide and figures (docs: commits), then send me the full text of chapters 0–4 and the list of figure files with one-line descriptions, so I can review them before we continue.
````

````text
We're adding a beginner guide that we write in parallel with the build. Later we'll write the video script from it, so it has to be both correct and clear. Don't start Step 6 yet.

## 1. Rules (add to CLAUDE.md)
- Every build step ends with its guide chapter: code + tests + DEVLOG + chapter + figures. A step isn't done without its chapter.
- The guide is HOW-IT-WORKS.md in the repo root, figures in docs/img/.
- Figures are generated by code, never drawn by hand: tools/figures.js runs the real simulation and renders SVGs from real data (real frames, real weights, real generation stats). Conceptual diagrams are generated in the same style. One command regenerates all of them. Neon CodeMask style, readable on GitHub in both light and dark mode (draw on a dark rounded background).
- Every number in the guide is real, with a "reproduce it" note (seed, generation, step, or command).
- Audience: someone who has never heard of neural networks and may not code. Every term is explained the first time it appears, and added to a glossary at the end. Short sentences. No math notation beyond × and +.
- Later, a web version with 3–4 interactive figures. For now, mark the spots with "Interactive later: <idea>".

## 2. Chapter template (use it for every chapter)
- **The one idea**: one plain sentence (this becomes a voice-over line in the video).
- **Analogy**: an everyday comparison.
- **Key figure**: the main picture, with a caption.
- **Real numbers**: one worked example with the actual values.
- **What actually happened**: what broke, surprised us, or got stuck, honestly, from DEVLOG/git.
- **The prompt**: link to the matching PROMPTS.md entry.
- **In the code**: function names with file paths, one line each.

## 3. Write chapters 0–5 now
- 0. What we're building: the four parts (world, eyes, brain, evolution) in one diagram, and the promise "no AI knowledge needed".
- 1. The world: track, checkpoints, car physics, my controls; why a fixed timestep and one seed (same seed = same everything); the road-width change 64 → 90 px and why.
- 2. Eyes: the 5 rays, the 6 inputs, why we turn distances into 0..1; a real frame at the hairpin with its numbers.
- 3. Brain: one neuron worked through with real numbers (inputs × weights, sum, + bias, squash), tanh and sigmoid drawn as curves, the 6→6→4 network, "the whole brain is 70 numbers" (show the count), outputs = my 4 keys; generation 1 chaos with the seed 1–5 table.
- 4. Evolution: fitness ("go far; if you finish, finish fast"), top 10, elitism, mutation (10%, small nudge), one generation as a picture (100 → top 10 → 1 elite + 99 children); the seed 3 chart; the first lap at gen 4; seed 1 stuck at 51.8% for 95 generations and the plain-English reason why; the 5-seed table and that seed 3 was chosen after seeing it.
- 5. Reading a brain: the gen 40 champion at the hairpin, step 368, the full path from "wall on the left at 23 px" to "press LEFT", with the surprise that it steers toward the inner wall to cut the corner like a racing driver, which nobody taught it; the 70-number grids of gen 1 vs gen 80 (62 of 70 changed) and the unbroken family line from car 1-85.

## 4. Deliver
Commit the guide and figures (docs: commits), then send me the full text of chapters 0–5 and the list of figure files with one-line descriptions, so I can review them before we continue.
````

Built: the guide rules in CLAUDE.md; tools/figures.js, which draws 19 SVG figures from the real simulation and writes every quoted number to docs/img/figure-data.json; HOW-IT-WORKS.md with chapters 0–5 and a glossary.
What broke: the first figures lost every glowing line that was perfectly straight (an SVG filter quirk), the fitness charts were scaled too low, and the mutation example happened to be the one child out of 99 with the most changes (14), so it was swapped for a typical one (7). Checking the claims also changed two of them: seed 1's crashes are about half on the inner wall, and the "racing line" is only partly one (the cars hug the inside but never swing wide first).

## 10. The guide in two levels, then Step 6: me vs the AI

````text
Two parts: first the guide gets a new structure, then Step 6. Do them in this order.

# Part 1: the guide, in two levels

Change of direction: the guide must be easy for a regular YouTube viewer, not just accurate. Keep everything we have, but split it into two levels.

## 1.1 DEEP-DIVE.md (the full detail)
Move the current HOW-IT-WORKS.md to DEEP-DIVE.md: all detail, tables, precise numbers, reproduce notes, function names. Keep it as it is, except:
- Chapter 0 analogy: the dog-learning-a-trick analogy describes one animal learning during its life, but our cars never learn during a run; only the next generation changes. Replace it with an evolution analogy consistent with chapter 4 (e.g. many blindfolded drivers; the ones who get furthest pass their habits to their children, with small copying mistakes).
- Chapter 4, seed 1: keep the facts (nobody pressed BRAKE in gen 31, 9306 children, flat at 43.0), but introduce the "why" with "Our best explanation:". It's an inference, not a measurement.
- Keep "=" and minus signs as they are.

## 1.2 HOW-IT-WORKS.md (the simple guide, the main one)
Write a new HOW-IT-WORKS.md for a regular YouTube viewer who has never coded:
- Start with an "In 30 seconds" box: 5 bullets that tell the whole story.
- Each chapter fits on one phone screen. Short sentences, everyday words; a 12-year-old should follow it.
- One big, clear picture per chapter that makes sense even without its caption. Pick the best figure we have, or generate a simpler version of it with tools/figures.js (still from real data).
- At most 1–2 numbers per chapter, rounded ("about 23 pixels", "70 numbers", "6 seconds faster than me"). No tables, except the final scoreboard.
- Only the few terms that matter (neuron, weight, generation, mutation, fitness), each explained in one plain sentence the first time. No "tanh", "sigmoid", "normalize", "local optimum" by name: describe the idea instead ("it gets stuck on a hill that isn't the top").
- No code and no file names in the text. End each chapter with one line: "For the curious: [Deep dive →](DEEP-DIVE.md#...)".
- Chapter template, lighter: the one idea → analogy → picture → the one real moment (what actually happened) → deep-dive link.
- Simpler, never wrong. If simplifying would make something false, keep the true version in simple words.
- Test: read every chapter as someone on a phone in the metro who never programmed. If a sentence needs reading twice, rewrite it.

## 1.3 Rules
Update the guide rules in CLAUDE.md: every step adds its chapter to both files: simple in HOW-IT-WORKS.md, full detail in DEEP-DIVE.md. A step isn't done without both.

## 1.4 Web page
Build docs/guide/index.html: the simple guide as one web page, big pictures, CodeMask neon style, readable on a phone, with links into the deep dive. It becomes the interactive version later; for now just text and figures. Tell me how to open it locally.

Commit Part 1 (docs: commits) before starting Part 2.

# Part 2: Step 6, me vs the AI

- Race mode: my ghost (ghosts/me-v3.json, 26.40 s) and one saved champion drive their best laps at the same time on the track, each from its own recorded start state. Cars don't collide. Me: cyan ladybug. AI: yellow ladybug. Label both ("ME", "GEN 10").
- On screen during the race: elapsed time, live gap ("AI +3.2 s ahead"), and a big result at the finish ("AI WINS by 13.23 s" / "ME WINS by 3.62 s").
- If the champion never completed a lap (e.g. seed 3 gen 1), it drives until it crashes or stalls, and I win by default. Show where it got out.
- Best lap vs best lap on both sides, and say so in small print in the UI. The gen 40 champion races its 12.53 s lap, not its standing-start first lap.
- Scoreboard screen (key S, and URL ?scoreboard=3): the 6 fixed generations of seed 3 (1, 5, 10, 20, 40, 80), my time, its time, the winner of each row, and the running total → 4:2 AI. Built only from the saved files, nothing typed in by hand.
- URLs for recording: ?race=3-10 (seed 3, gen 10 vs me), ?scoreboard=3, plus ?autoplay=1 to start immediately.
- Tests: each race result equals the recorded lap times; the scoreboard total equals 4:2, computed from the files.
- Guide chapter 6 "Me vs the AI" in both levels, with generated figures (the scoreboard; one race as a picture, e.g. gen 5 vs me, where I still win).
- Update PROMPTS.md and DEVLOG.md, 🎬-mark the race where the AI first beats me (gen 10).

# Deliver
Send me: the full text of the new HOW-IT-WORKS.md (chapters 0–6), how to open the web page, and the Step 6 report.
````

Built: DEEP-DIVE.md (the full guide, with a new analogy and the seed 1 reason labelled as our best explanation), and a new simple HOW-IT-WORKS.md for chapters 0–6 with seven big-text figures. The web guide is in docs/guide/. Race mode: my ghost against a champion's best lap, with a live gap and the result; the scoreboard is built from the files; ?race and ?scoreboard URLs. All six races match the recorded laps, and the score is 2:4.
What broke: my first simple draft had three sentences that weren't true or weren't sourced ("the hairpin can't be driven without braking", "most of the rest never left the start", "it was no fun to drive"). They were fixed before the commit. Four of the Part 1 commit messages have the attribution glued onto the subject line. In the race screen, the live gap sat on a wall and two tags overlapped; both were fixed.

## 11. No images in the web guide

````text
I opened docs/guide/index.html (double-click, file://) and I don't see any images, only text.

1. Find the cause. Likely the image paths: the Markdown uses docs/img/..., relative to the repo root, but the page lives in docs/guide/, so they should resolve to ../img/... Fix it in tools/guide-page.js, so the generated page always has correct relative paths. Don't hand-edit the HTML.
2. Add a check to the page build: every <img> src in every generated page must exist on disk, or the build fails.
3. Verify the way I open it: load the page via file:// in headless Chrome, confirm every image has naturalWidth > 0, and take a screenshot at phone width (390 px) and desktop width. Tell me the image count found vs. loaded.
4. Also confirm the images show on GitHub: the paths in HOW-IT-WORKS.md and DEEP-DIVE.md must be valid relative to the repo root.

Commit as a fix, update DEVLOG. Then tell me to reopen the page.
````

Built: the paths were already ../img/ and correct. Safari blocks a local page from reading ../ folders (reproduced with WebKit), so the figures were copied next to the page, and the build now fails on a missing image (972e5f8).
What broke: that fix wasn't the one the user needed; the next prompt shows the scoreboard still broken.

## 12. (a screenshot)

The message was only a screenshot, no text: chapter 6 of the web guide, with the scoreboard picture shown as a broken image.

Built: every figure is now built into the page itself as a data: URL, so it no longer depends on what the viewer allows (0407de0). Checked with the HTML files alone in an empty folder: 7/7 and 22/22 images.
What broke: I never found out for sure which app showed the page. My best explanation is a viewer that lets local pages load no other files.

## 13. Images show now

````text
Images show now, all good
````

Built: nothing new; this entry, and the two above that I had forgotten to log at the time.
What broke: I skipped the PROMPTS.md entries for prompts 11 and 12, against the rules. They were added here, late.

## 14. Step 7a: did it learn, or memorize?

````text
Step 7a: does the car know how to drive, or did it just memorize one track?

Pre-register first (one commit, before any testing):
- Add 4 new tracks, same format, same road width (90 px), same physics. Physics and car stay frozen; these are new tracks, not changes to Neon Loop.
  - "Neon Loop Mirrored": Neon Loop driven the other way round (clockwise).
  - "Zigzag": many quick left-right turns, no hairpin.
  - "Wide Sweepers": long fast curves, one tight corner at the end.
  - "Exam": a held-out track for later, with a mix of everything, including a hairpin turning the opposite way to Neon Loop's. Nobody trains on Exam, ever.
- Write in DEVLOG, before running anything: the 4 tracks, that Zigzag + Wide Sweepers will be the extra training tracks in Step 7b, that Exam is held out, and the exact tests below. Commit with the track data's SHA-256 in the message. After this commit the tracks never change.

Then test, and don't change anything based on the results:
- Run every saved seed 3 champion (gens 1, 5, 10, 20, 40, 80) alone on each new track. Report for each: lap time, or how far it got (%) and how it got out (crash/stall, where).
- Also the gen 80 champions of seeds 2, 4 and 5, for comparison.
- Screenshot or record the most telling failure (🎬): ideally the champion that beat me by 14 s crashing in the first corner of a track it has never seen.

Me on the Exam track:
- Add Exam as a drivable track in manual mode (track picker), with its own lap timer and ghost recording, saved to ghosts/me-exam.json. I'll drive it for the first time, and my best of my first 3 laps counts. Don't show me any AI result on Exam before I drive.

Guide chapter 7 "Did it learn, or memorize?" in both levels (simple HOW-IT-WORKS.md + DEEP-DIVE.md): the simple version explains memorizing vs. understanding with an everyday analogy (e.g. a student who memorized last year's exam answers), and shows the real result, whatever it is. If the champion actually drives the new tracks fine, that's the honest story and we say so.

Update PROMPTS.md and DEVLOG.md. Report the results table and tell me when Exam is ready for me to drive.
````

Built: four new frozen tracks, pre-registered with their SHA-256 (fa2a3a1) before any car drove them. Then the pre-registered tests, a track picker (T), Exam with a first-3-laps record and a ghost download (G), and guide chapter 7 in both levels.
What broke: nothing in the code. The result: the champions drive Zigzag and Wide Sweepers fine, but every gen 80 champion fails the mirrored hairpin. The "first corner" crash we expected never happened. No AI has driven Exam.

## 15. My Exam lap, Step 7b, and the exam

````text
I drove Exam: 3 counted laps, best 21.37 s.  ## 1. My Exam ghost Move it to ghosts/me-exam.json, check it's from my first 3 counted laps, and replay it headless to the step. Commit. From now on that's my official Exam time. ## 2. Step 7b, exactly as pre-registered - Train seed 3 from scratch for 100 generations on 3 tracks: Neon Loop + Zigzag + Wide Sweepers. Every car drives all 3 tracks; its fitness is the sum of its 3 single-track fitness scores. Everything else (population, top 10, elitism, mutation 10% / sigma 0.3) unchanged. Save champions at gens 1, 5, 10, 20, 40, 80, 100 to champions/seed-3-multi.json. - Don't change the training set, the method or the Exam track based on any result. If it fails, that's the result. ## 3. The exam (only now, after my lap is saved) Run on Exam and on Neon Loop Mirrored, and report lap time or how far it got and how it got out: - the old single-track seed 3 champions (gens 10, 20, 80) - the new multi-track champions (gens 10, 20, 80, 100) Then race my Exam ghost (21.37 s) against the best of them: ?race=exam&champion=..., same "best lap vs best lap" rules. ## 4. Write-up - DEVLOG: the results, plainly. If multi-track training doesn't help on Exam, say why it plausibly didn't (e.g. none of the 3 training tracks has a right-hand hairpin) as "our best explanation", and that we noticed this risk after Step 7a but kept the pre-registered plan. - Guide chapter 7 in both levels: add the exam results and the race. - Update PROMPTS.md. 🎬-mark the Exam race and any spectacular failure.
````

Built: Step 7b exactly as pre-registered. Seed 3 was trained from scratch on three tracks, and its champions are saved. Races now work on other tracks, but only where there's a ghost of mine.
What broke: there was no me-exam.json anywhere, and no Exam lap in the browser. The 21.37 s lap is the best lap stored for Zigzag (exactly 1282 steps), so it looks like the drive was on Zigzag, not Exam. Exam is still undriven, so part 1 and the exam itself (part 3) wait for that drive.

## 16. Real code in the guide, every line explained

````text
<pasted_content id="4e88">
New goal for the guide and the video: a complete beginner should understand everything, including the code. Real code, in small pieces, every line explained in plain words.

## 1. A new intro chapter in HOW-IT-WORKS.md: "What is all this?"
- What "AI", a "neural network" and "learning" mean here, in plain words (no history, no hype).
- What Claude Code is: I describe what I want in English, it writes the code. Everything in this project was built that way.
- What we're building, and what you need to do it yourself: a browser, Claude Code, one evening.
- How to run the project locally: the exact commands, each one explained in one line.

## 2. A "Look at the code" box in every chapter (simple guide)
- Real code from the project, never a retyped or "simplified" copy. tools/guide-page.js extracts each function from its source file by name, so the guide always matches the running code. The build fails if a function is missing.
- At most 10–12 lines per snippet. If a function is longer, show the core and say in plain words what the skipped part does ("… the rest checks the walls").
- Every line gets a plain-English explanation next to it (a two-column layout on the web page, line-by-line comments under the snippet in Markdown). Explain what it does in the car's world, not programming jargon: "multiply what this eye sees by how much this eye matters, and add it to the total".
- Explain any code symbol the first time it appears (what [ ] means, what a function is, what a loop is), once, in the intro or the first snippet.
- Snippets: getInputs (eyes), neuron and think (brain), fitness, selection, mutate, nextGeneration (evolution), and the main step loop (what happens 60 times a second).

## 3. Readability pass on exactly those functions
If any of them is dense or clever, rewrite it to read like plain steps (clear names, one idea per line, short comment above). Behavior must not change at all: the replay check, all champion lap times and the seed 3 evolution history must stay bit-identical. Prove it with the existing tests plus a full seed 3 rerun compared to runs/seed-3.json.

## 4. Deep dive
Add the full code of each of those functions to DEEP-DIVE.md (also extracted by name), with a short walkthrough.

Update CLAUDE.md: every new step's chapter must include a "Look at the code" box. Rebuild the web page, commit, and send me the intro chapter plus two finished "Look at the code" boxes (neuron and mutate) so I can check the tone.
````

Built: an intro chapter for complete beginners, and a "Look at the code" box in every chapter of the simple guide. Each box is real code, pulled from the source by function name (tools/code-boxes.js), with every line explained. The deep dive has the full functions. Nine functions were rewritten to read like plain steps.
What broke: nothing in behavior. All 55 tests pass, and a full seed 3 rerun is identical to runs/seed-3.json. Two snags in the tooling, both fixed before committing: the box matcher first ignored indentation, so a `}` could match the wrong closing brace, and the deep dive used "÷".

## 17. Step 8: things for viewers

````text
Exam rule first: until my ghosts/me-exam.json exists, nothing in this step may run any AI car on the Exam track, and Exam must not appear in the editor, in share links or in any test that runs a brain on it.

Small guide fixes (docs: commit): explain `export` in the symbols list ("other files may use this recipe"); in the neuron box add one plain line on what squash means ("keep the total within small limits, as explained above"); in the mutate box say how small the nudge usually is (about 0.3); "Roll a dice" → "Roll a die".

Step 8: things for viewers.

1. Track editor (key T opens a picker, plus an "Edit / new track" button):
   - Draw a closed loop by clicking points; drag points to adjust; the road width is fixed at 90 px (physics stays frozen).
   - Live validation with a plain message: road crosses itself, a turn is too tight for the car, the track doesn't fit on screen. Can't drive or train until it's valid.
   - Start line and direction are set automatically at the first point; checkpoints are generated like on our tracks.

2. Share links:
   - Encode a track into the URL (compact and URL-safe, e.g. ?t=...), so a link opens exactly that track. Decode with validation; a broken link shows a friendly error, never a crash.
   - "Copy link" button. Also a link for "my track + this champion", so someone can share "watch my car fail on your track".

3. On any track (built-in or custom):
   - Drive it yourself (lap timer, ghost).
   - Test a saved champion on it (pick seed + generation, including the multi-track ones).
   - Train from scratch on it, live, with the speed keys and the chart, in the browser. Seeded, so the same track + seed gives the same result.

4. Replay check: tools/replay-check.js runs a fixed set of scenarios headless (my Neon Loop ghost, three champion laps, 3 generations of seed 3 evolution, one custom track from a share link) and compares against stored golden results. Add --update for intentional changes. Every future step must keep it green.

5. Guide chapter 8 "Make your own track" in both levels, with a "Look at the code" box for the share-link encoder (how a track becomes a link), every line explained.

Update PROMPTS.md and DEVLOG.md. 🎬-mark a custom track where the gen 80 champion fails in a funny way (not Exam).
````

Built: the guide fixes, then the Exam rule in one place (createGeneration refuses Exam), a track check with plain messages, share links, a track menu (T) with an editor, champions and live training on any track except Exam, a replay check that runs in npm test, and guide chapter 8 in both levels.
What broke: the first replay check compared only my ghost's lap time, and a deliberate tiny physics change got past it, so path fingerprints were added. Pressing R on a multi-track champion restarted the one-track one (an old bug, now fixed). The chart landed on the start line on a crowded track, and the editor buttons covered the start point. 🎬 Paperclip: the gen 80 champion crawls round its right-hand hairpin once, then reverses into the wall on lap 2.

## 18. My Exam ghost

````text
'~/Downloads/me-exam.json'
````

Built: my Exam lap saved as ghosts/me-exam.json (32.02 s, the best of my first 3 counted laps), Exam opened for testing champions (never for training), the exam itself (Step 7b part 3), the race, and guide chapter 7 with the results.
What broke: nothing in the code. The lap in the file is 32.02 s, not the 21.37 s from prompt 15 (that one was on Zigzag). And training on three tracks didn't help on Exam: all four three-track champions crashed there.

## 19. Step 7c: one more try, decided after the exam

````text
Step 7c, decided after seeing the exam, and we'll say so openly.

Pre-register in DEVLOG first (commit before training):
- Why: Exam showed every multi-track champion crashing in the right-hand hairpin, and none of the 3 training tracks has one.
- Plan: train seed 3 from scratch for 100 generations on 4 tracks: Neon Loop, Neon Loop Mirrored, Zigzag, Wide Sweepers. Fitness = sum of the 4. Everything else unchanged. Champions at gens 1, 5, 10, 20, 40, 80, 100 → champions/seed-3-multi4.json.
- Test: those champions on Exam, once, after training. Exam is still never trained on. Note that this is the second time Exam is used for testing.
- Whatever happens is the result. No retries, no tuning.

Then run it, report the table (all 4 training tracks + Exam), race my Exam ghost against the best on Exam, and add it to chapter 7 in both guides. Update PROMPTS.md and DEVLOG.md, 🎬-mark the outcome.
````

Built: the Step 7c pre-registration, committed before any training (41039bd). Then the four-track training, the one Exam test, the race, and chapter 7 in both guides.
What broke: nothing in the training. Two small things: the race HUD's lap times ran off the screen with a long name like "GEN 100 ×4 TRACKS" (fixed). And a check of the new exam tool, run on the Step 7b champions, also put their gens 1, 5 and 40 on Exam, which the 7b exam hadn't included.
