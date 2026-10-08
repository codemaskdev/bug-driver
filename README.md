# Bug Driver

A small bug-shaped car that teaches itself to drive in your browser, using a tiny neural network and a genetic algorithm written from scratch in plain JavaScript, no ML libraries. Built on camera for the CodeMask video "How to Build a Self-Driving Car AI Without Knowing AI".

## Links
- ▶ Play in your browser: https://codemaskdev.github.io/bug-driver/
- 📖 Guides: [the beginner guide](https://codemaskdev.github.io/bug-driver/docs/guide/) · [the deep dive](https://codemaskdev.github.io/bug-driver/docs/guide/deep-dive.html)
- 🎬 Video: https://www.youtube.com/watch?v=xQIbVdU7Gn8
- 💬 Prompts: [PROMPTS.md](PROMPTS.md)

## Read about it
- **[How it works](HOW-IT-WORKS.md)**: the beginner guide, chapter by chapter with the video, about 15 minutes. Web version: [docs/guide/index.html](docs/guide/index.html).
- **[Deep dive](DEEP-DIVE.md)**: every detail, table and number, with how to reproduce each one. Web version: [docs/guide/deep-dive.html](docs/guide/deep-dive.html).
- **[Every prompt](PROMPTS.md)** sent to Claude Code to build the game, the AI and the experiments, verbatim, with what was built and what broke.
- **[Fact check](guide-facts.md)**: every number in the two guides and where it comes from.

## Run it
Serve the folder (`npx serve`) and open the printed URL. Drive with the arrow keys or WASD, R restarts, E shows what the car's eyes see.

Tab lets the AI drive: 100 cars with neural-network brains that evolve, generation after generation. 1 / 2 / 3 set the speed (x1, x10, max), R restarts the evolution from generation 1, E explains the leader's inputs and outputs. `?autoplay=1&seed=N` starts with the AI driving.

Looking inside the brain (AI mode): B shows the live network of the leader (or of any car you click), F freezes the simulation and explains one decision in plain numbers (← → pick the key), N shows all 70 numbers of the brain. `?champion=3-40` runs one saved champion alone (seed 3, generation 40), `&compare=3-1` puts another brain next to it in the N grid; the picker in the bottom-right corner does the same.

Tracks: T in manual mode switches between Neon Loop, Neon Loop Mirrored, Zigzag, Wide Sweepers and Exam (or `?track=exam`). On Exam only your first 3 completed laps count; after them, G saves ghosts/me-exam.json. `?champion=3-80&track=zigzag` runs a champion on another track (never on Exam, which is held out). `node tools/generalization-report.js` runs the pre-registered Step 7a tests.

Comparing laps: in AI mode press S for the scoreboard (my ghost lap next to seed 3's champions of generations 1, 5, 10, 20, 40, 80), pick a row and press Enter to race it. `?race=3-10` races my ghost against the seed 3 generation 10 champion, `?scoreboard=3` opens the scoreboard; add `&autoplay=1` to start right away (for recording).

`node tools/evolution-report.js <seed>` runs 100 generations headless and writes runs/seed-N.json (stats per generation) and champions/seed-N.json (the best brain at generations 1, 5, 10, 20, 40, 80).

Tests run the simulation headless in Node, no install needed: `npm test`.
