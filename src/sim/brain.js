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
  for (let i = 0; i < inputs.length; i++) {
    const weight = brain[start + i];
    sum += inputs[i] * weight;
  }
  const bias = brain[start + inputs.length];
  sum += bias;
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
  const [gas, brake, left, right] = outputs(brain, inputs);
  let keys = 0;
  if (gas > 0.5) keys += UP;
  if (brake > 0.5) keys += DOWN;
  if (left > 0.5) keys += LEFT;
  if (right > 0.5) keys += RIGHT;
  return keys;
}

// The whole calculation behind one decision, every number of it: for each neuron,
// each input times its weight, the sum, the bias, the total and the squashed value.
// Same arithmetic in the same order as neuron(), so the numbers are exactly think()'s.
export function explainThink(brain, inputs) {
  const hidden = explainLayer(inputs, brain, 0, HIDDEN, tanh);
  const hiddenValues = hidden.map((n) => n.value);
  const output = explainLayer(hiddenValues, brain, HIDDEN * (INPUTS + 1), OUTPUTS, sigmoid);
  let keys = 0;
  output.forEach((n, k) => { if (n.value > 0.5) keys |= OUTPUT_KEYS[k]; });
  return { inputs: inputs.slice(), hidden, output, keys };
}

function explainLayer(inputs, brain, start, size, squash) {
  const perNeuron = inputs.length + 1;
  const neurons = [];
  for (let n = 0; n < size; n++) {
    const at = start + n * perNeuron;
    const terms = [];
    let sum = 0;
    for (let i = 0; i < inputs.length; i++) {
      const product = inputs[i] * brain[at + i];
      terms.push({ input: inputs[i], weight: brain[at + i], product });
      sum += product;
    }
    const bias = brain[at + inputs.length];
    const total = sum + bias;
    neurons.push({ terms, sum, bias, total, value: squash(total) });
  }
  return neurons;
}
