# Bug Driver

A small bug-shaped car that teaches itself to drive in your browser, using a tiny neural network and a genetic algorithm written from scratch in plain JavaScript, no ML libraries. Built on camera for the CodeMask video "How to Build a Self-Driving Car AI Without Knowing AI". Work in progress: the game, the live demo and the beginner guide are coming.

## Run it
Serve the folder (`npx serve`) and open the printed URL. Drive with the arrow keys or WASD, R restarts, E shows what the car's eyes see.

Tab lets the AI drive: 100 cars with random neural-network brains. 1 / 2 / 3 set the speed (x1, x10, max), R restarts the generation, E explains the leader's inputs and outputs. `?autoplay=1&seed=N` starts with the AI driving.

Tests run the simulation headless in Node, no install needed: `npm test`.
