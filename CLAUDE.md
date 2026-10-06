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
- HOW-IT-WORKS.md is the main guide, for a regular YouTube viewer who has
  never coded: an "In 30 seconds" box at the top; each chapter fits on one
  phone screen; short sentences and everyday words (a 12-year-old should
  follow it); one big picture per chapter that makes sense without its
  caption; at most 1–2 rounded numbers per chapter; no tables except the
  final scoreboard; only the terms that matter (neuron, weight, generation,
  mutation, fitness), each explained in one plain sentence; no code or file
  names; each chapter ends with "For the curious: [Deep dive →](DEEP-DIVE.md#...)".
  Lighter template: the one idea → analogy → picture → the one real moment
  (what actually happened) → deep-dive link. Simpler, never wrong.
- DEEP-DIVE.md keeps every detail: tables, precise numbers, "reproduce it"
  notes, function names with file paths, and the full template (The one
  idea · Analogy · Key figure · Real numbers · What actually happened ·
  The prompt · In the code). Every term explained the first time and in
  the glossary. No math notation beyond ×, +, = and minus signs.
  Inferences are labelled as such ("Our best explanation:").
- Figures are generated by code, never drawn by hand: tools/figures.js runs
  the real simulation and renders SVGs from real data into docs/img/
  (simple-*.svg for HOW-IT-WORKS.md, big text, readable on a phone). One
  command (`node tools/figures.js`) regenerates all of them. Neon CodeMask
  style on a dark rounded background, readable on GitHub in light and dark
  mode.
- The web version, docs/guide/, is generated from the two Markdown files by
  `node tools/guide-page.js` and must be regenerated whenever they change.
  It copies the figures it uses into docs/guide/img/ (Safari's file:// pages
  can't read ../ folders), and it fails if any image is missing.
  Interactive figures come later; mark the spots with "Interactive later: <idea>".

## Honesty
- Never invent or exaggerate problems for drama. If nothing broke, write
  "nothing broke". Real failures matter, made-up ones ruin the video.
- No quiet parameter tuning to rescue the story: if the cars fail, that
  is the story, and it gets logged.
