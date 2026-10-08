# Bug Driver — dev rules for this project

## What it is
A small bug-shaped car that learns to drive by itself in the browser: a
neural network drives it, a genetic algorithm evolves the networks. It is
built on camera for the CodeMask video "How to Build a Self-Driving Car AI
Without Knowing AI". The git history, PROMPTS.md and DEVLOG.md are the raw
material for the video and the guides.

## Tech
- Plain HTML5 + Canvas + vanilla JS, ES modules. No frameworks, no build
  step, no npm dependencies.
- NO ML libraries. The neural network and the evolution are written from
  scratch and must stay readable, because we explain them on screen.
- Run it with `npx serve` in this folder and open the printed URL
  (ES modules don't load from file://).
- The game must stay playable after every commit.

## Readable core ideas
- Every core idea lives in its own clearly named function with a one-line
  plain-English comment above it: sensor/ray, neuron, layer, activation,
  fitness, selection, crossover/mutation, generation.
- The beginner guide (HOW-IT-WORKS.md) links to these functions by name,
  so don't rename or merge them casually. If one must be renamed, update
  the guide in the same commit.

## Determinism
- One seeded RNG for everything: initial brains, mutations, spawns.
  Same seed = same evolution.
- Never use Math.random().
- Fixed timestep: the simulation advances in fixed steps of 1/60 s,
  independent of the frame rate and rendering. Determinism must hold on
  any monitor.

## Frozen
- Physics and track are frozen at PHYSICS_VERSION 3. Do not change them
  without asking me first: any change invalidates my ghost lap and all
  training.
- My official ghost lap is ghosts/me-v3.json (26.40 s). The scoreboard and
  every race against me use this file, never localStorage.
  tests/ghost.test.js must keep replaying it to the exact step.
- Exam is held out: nobody trains on it, ever (every evolution refuses it,
  see src/sim/held-out.js). My Exam lap is ghosts/me-exam.json (32.02 s);
  tests/exam-ghost.test.js must keep replaying it to the exact step. Saved
  champions may be tested and raced on Exam only after unlockExam() has
  checked that ghost. Exam never appears in the track editor or in a share link.

## Replay check
- `node tools/replay-check.js` (also part of `npm test`) runs fixed scenarios
  headless: my Neon Loop ghost, three champion laps, 3 generations of seed 3,
  and a custom track from a share link. It compares every car's step-by-step
  path with tools/replay-golden.json. Every step must keep it green.
- `--update` only for a change we mean, and the DEVLOG entry says why.

## Custom tracks
- A custom track is only its points (sim/track-check.js checks it; the road
  is always 90 px, the start line is at the first point). Share links carry
  the points (sim/share-link.js, `?t=`); changing the link format means a new
  LINK_VERSION, and old links must still open or fail with a plain message.

## Simulation vs rendering
- The simulation and the rendering are separate. Simulation code never
  touches the DOM, the canvas or localStorage.
- The simulation can run at x1, x10 and "max" (no rendering, as fast as
  possible), and headless in Node for tests and benchmarks.

## Autoplay
- `?autoplay=1&seed=N` runs hands-free for recording footage
  (seed defaults to 1).

## On-screen numbers
- Every number shown on screen (sensor distances, weights, outputs,
  fitness, generation, lap time) must be the real value from the
  simulation. Never decorative or faked.

## Visual style
- CodeMask neon, like Bug Survivor: dark background (#0b0d13), cyan hero
  (#00f0ff), glowing pixel look. Accents from the same palette: yellow
  #ffd23f, pink-red #ff2e63, green #39ff88.
- The car is a small bug-shaped car.

## Commits
- One commit per feature or fix, never batch. Authored as CodeMask
  (already set in this repo's local git config).
- Message format: `<type>: <what changed, in plain English>`
  types: feat, fix, tweak, refactor, docs.
- Never squash, amend or rewrite history. Corrections are new commits.
- DEVLOG/PROMPTS updates go in a separate commit: `docs: devlog for <hash>`.

## PROMPTS.md
- After every prompt the user sends, append an entry: the prompt copied
  verbatim in full, then 2–3 lines on what was built and what broke.
- Never edit earlier entries.
- PROMPTS.md is public and English-only: if a prompt isn't in English,
  log a faithful English version of it, with no translation marker.

## DEVLOG.md
- After every commit, add an entry with real numbers: generation, best
  distance / best lap time, how many cars finished a lap. Include the
  commit hash.
- Mark moments that would make a good Short with "🎬".

## The guide (two levels)
- Every build step ends with its guide chapter in BOTH files: the simple
  version in HOW-IT-WORKS.md and the full detail in DEEP-DIVE.md, plus
  figures. Code + tests + DEVLOG + both chapters + figures, or the step
  isn't done.
- HOW-IT-WORKS.md is the main guide, for someone who just watched the video (rewritten for the video,
  prompt 20): the video's chapters in the video's order, the video's story, numbers and wording on every
  claim; ~2,500–3,000 words. An "In 30 seconds" box at the top. Each chapter starts with a
  "▶ watch this part" link (`VIDEO_URL&t=<seconds>`, the literal placeholder until the video is up) and
  ends with "For the curious: [Deep dive →](DEEP-DIVE.md#...)". Short sentences and everyday words; the
  water-pipe analogy of the video, with its honest caveat that numbers in the middle tanks can be
  negative. My lap is one benchmark, never "me vs the AI". Pictures are the video's own rendered stills
  (docs/img/guide-*.webp), each with one plain caption.
- HOW-IT-WORKS.md has at most one "Look at the code" box per chapter (neuron(), think(), fitness(),
  mutate()): real code pulled out of the source by function name (tools/code-boxes.js, built by
  tools/guide-page.js), never retyped, at most 12 lines, every line explained in one plain sentence about
  the car's world. The deep dive shows the whole function (`<!-- full-code file function -->`) with a
  short walkthrough. The build fails if a function is missing or a box no longer matches the code.
- `node tools/guide-facts.js` works every number of HOW-IT-WORKS.md (and every number the video corrected
  in DEEP-DIVE.md) out again from the code, the saved runs and the simulation, checks the guides say it,
  and writes guide-facts.md. A number it can't confirm gets fixed or removed, never kept. Every fact names
  the step or run it comes from, and a number next to a picture (in its caption or in the paragraph right
  above it) must come from the picture's own step or run, or be a rule of the game; the build fails otherwise.
- Before release, every `VIDEO_URL` in HOW-IT-WORKS.md becomes the full
  `https://www.youtube.com/watch?v=<ID>` (so `&t=` works), never a youtu.be link; then rebuild the pages.
- DEEP-DIVE.md keeps every detail: tables, precise numbers, "reproduce it"
  notes, function names with file paths, and the full template (The one
  idea · Analogy · Key figure · Real numbers · What actually happened ·
  The prompt · In the code). Every term explained the first time and in
  the glossary. No math notation beyond ×, +, = and minus signs.
  Inferences are labelled as such ("Our best explanation:").
- Figures are generated by code, never drawn by hand: tools/figures.js runs
  the real simulation and renders SVGs from real data into docs/img/
  (the deep dive's figures). One command (`node tools/figures.js`)
  regenerates all of them. HOW-IT-WORKS.md uses the video's stills instead
  (docs/img/guide-*.webp): rendered by code from the same data, cropped to
  their content. Neon CodeMask
  style on a dark rounded background, readable on GitHub in light and dark
  mode.
- The web version, docs/guide/, is generated from the two Markdown files by
  `node tools/guide-page.js` and must be regenerated whenever they change.
  It builds every figure (SVG, WebP or PNG) into the pages themselves (data: URLs), so they show
  however the file is opened, even with no other files next to it, and it
  fails if any image is missing.
  Interactive figures come later; mark the spots with "Interactive later: <idea>".

## Honesty
- Never invent or exaggerate problems for drama. If nothing broke, write
  "nothing broke". Real failures matter, made-up ones ruin the video.
- No quiet parameter tuning to rescue the story: if the cars fail, that
  is the story, and it gets logged.
