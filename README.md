# Bug Driver

A small bug-shaped car that teaches itself to drive in your browser, using a tiny neural network and a genetic algorithm written from scratch in plain JavaScript, no ML libraries. Built on camera for the CodeMask video "How to Build a Self-Driving Car AI Without Knowing AI". Work in progress: the game, the live demo and the beginner guide are coming.

## Run it
Serve the folder (`npx serve`) and open the printed URL. Drive with the arrow keys or WASD, R restarts, E shows what the car's eyes see.

Tab lets the AI drive: 100 cars with neural-network brains that evolve, generation after generation. 1 / 2 / 3 set the speed (x1, x10, max), R restarts the evolution from generation 1, E explains the leader's inputs and outputs. `?autoplay=1&seed=N` starts with the AI driving.

Looking inside the brain (AI mode): B shows the live network of the leader (or of any car you click), F freezes the simulation and explains one decision in plain numbers (← → pick the key), N shows all 70 numbers of the brain. `?champion=3-40` runs one saved champion alone (seed 3, generation 40), `&compare=3-1` puts another brain next to it in the N grid; the picker in the bottom-right corner does the same.

Me vs the AI: in AI mode press S for the scoreboard (my ghost lap against seed 3's champions of generations 1, 5, 10, 20, 40, 80), pick a row and press Enter to race it. `?race=3-10` races my ghost against the seed 3 generation 10 champion, `?scoreboard=3` opens the scoreboard; add `&autoplay=1` to start right away (for recording).

`node tools/evolution-report.js <seed>` runs 100 generations headless and writes runs/seed-N.json (stats per generation) and champions/seed-N.json (the best brain at generations 1, 5, 10, 20, 40, 80).

Tests run the simulation headless in Node, no install needed: `npm test`.
