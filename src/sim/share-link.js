// Share links: a whole track in a few letters, so a link (?t=...) opens exactly that track.
// Only the clicked points travel: the road width (90 px), the start line (at the first point),
// the checkpoints and the physics are the same rules on every track, so they're rebuilt from the points.
// Each point becomes 4 letters, 2 for x and 2 for y. A letter stands for a number from 0 to 63,
// so two letters can hold any number from 0 to 4095: plenty for a 1280 x 720 screen.

import { isExamShape } from './held-out.js';
import { checkTrack, ROAD_WIDTH } from './track-check.js';

export const LINK_VERSION = '1';
// 64 letters that are all safe in a web address
export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// Turns a track's points into the text that goes in the link.
export function encodeTrack(points) {
  if (isExamShape(points)) throw new Error('Exam is held out: it never goes in a link');
  let link = LINK_VERSION;
  for (const [x, y] of points) {
    for (const n of [x, y]) {
      link += LETTERS[Math.floor(n / 64)];
      link += LETTERS[n % 64];
    }
  }
  return link;
}

// The other way: link text -> {track} (a track definition, already checked) or {error} (a plain message).
// It never throws: a broken or edited link only ever gets a friendly message.
export function decodeTrack(text) {
  if (typeof text !== 'string' || text.length === 0) return { error: 'This link has no track in it.' };
  if (text[0] !== LINK_VERSION) return { error: "This link isn't a Bug Driver track, or it's from a newer version of the game." };
  const body = text.slice(1);
  if (body.length % 4 !== 0) return { error: 'This track link is cut off or has extra letters. Copy the whole link again.' };
  const numbers = [];
  for (const letter of body) {
    const n = LETTERS.indexOf(letter);
    if (n < 0) return { error: "This track link has letters in it that don't belong. Copy the whole link again." };
    numbers.push(n);
  }
  const points = [];
  for (let i = 0; i < numbers.length; i += 4) {
    points.push([numbers[i] * 64 + numbers[i + 1], numbers[i + 2] * 64 + numbers[i + 3]]);
  }
  const def = { id: 'custom', name: 'Shared track', width: ROAD_WIDTH, points };
  let check;
  try {
    check = checkTrack(def);
  } catch {
    return { error: "This track link opens a track that can't be built." };
  }
  if (!check.ok) return { error: `This track link opens a track that can't be driven: ${check.problems[0].message}` };
  return { track: def };
}
