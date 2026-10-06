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
