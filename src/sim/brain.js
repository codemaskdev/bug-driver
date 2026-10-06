// The brain: a tiny neural network, written from scratch.
// 6 inputs (what the car sees) -> 6 hidden neurons -> 4 outputs (the 4 keys).
// The whole brain is one flat array of 70 numbers: every weight and every bias.

import { UP, DOWN, LEFT, RIGHT } from './car.js';

export const INPUTS = 6;   // 5 eyes + speed, from getInputs()
export const HIDDEN = 6;
export const OUTPUTS = 4;  // gas, brake, left, right: the same 4 keys the player has
export const OUTPUT_LABELS = ['gas', 'brake', 'left', 'right'];
const OUTPUT_KEYS = [UP, DOWN, LEFT, RIGHT];

// Each neuron stores its weights (one per input) followed by its bias.
// Hidden layer: 6 neurons x (6 weights + 1 bias) = 42 numbers.
// Output layer: 4 neurons x (6 weights + 1 bias) = 28 numbers.
export const BRAIN_SIZE = HIDDEN * (INPUTS + 1) + OUTPUTS * (HIDDEN + 1); // = 70

// A brand-new brain: 70 random numbers between -1 and 1, from the seeded random generator.
export function randomBrain(rand) {
  return Array.from({ length: BRAIN_SIZE }, () => rand() * 2 - 1);
}

// Activation for the hidden layer: squashes any number into -1..1.
export function tanh(x) {
  return Math.tanh(x);
}

// Activation for the outputs: squashes any number into 0..1, read as "how hard to press this key".
export function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

// One neuron: multiply each input by its weight, add them up, add the bias, squash.
export function neuron(inputs, brain, start, squash) {
  let sum = 0;
  for (let i = 0; i < inputs.length; i++) sum += inputs[i] * brain[start + i];
  sum += brain[start + inputs.length]; // the bias
  return squash(sum);
}

// One layer: `size` neurons that all look at the same inputs; their weights start at `start` in the brain.
export function layer(inputs, brain, start, size, squash) {
  const out = [];
  const perNeuron = inputs.length + 1;
  for (let n = 0; n < size; n++) out.push(neuron(inputs, brain, start + n * perNeuron, squash));
  return out;
}

// The 4 output values (0..1) for these 6 inputs: gas, brake, left, right.
export function outputs(brain, inputs) {
  const hidden = layer(inputs, brain, 0, HIDDEN, tanh);
  return layer(hidden, brain, HIDDEN * (INPUTS + 1), OUTPUTS, sigmoid);
}

// Which keys to press this step: every output above 0.5 is a key held down.
export function think(brain, inputs) {
  const out = outputs(brain, inputs);
  let keys = 0;
  for (let k = 0; k < OUTPUTS; k++) if (out[k] > 0.5) keys |= OUTPUT_KEYS[k];
  return keys;
}
