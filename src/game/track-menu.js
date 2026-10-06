// T: the track menu. Pick a track (built-in, my own, or one opened from a link), open the
// editor, and copy a share link: the track alone, or the track plus the champion running on it.
// Exam is in the list for me to drive; it never gets a link and never opens in the editor.

import './ui-style.js';
import { TRACKS, trackKey } from '../sim/track.js';
import { isHeldOut } from '../sim/held-out.js';
import { encodeTrack } from '../sim/share-link.js';

const box = document.createElement('div');
box.id = 'track-menu';
box.className = 'tool-panel';
document.body.appendChild(box);
let handlers = null;

export const trackMenuOpen = () => box.style.display === 'flex';
export function closeTrackMenu() { box.style.display = 'none'; }

// The link that opens this track (and, with a champion name like "3-80", that champion on it). null for Exam.
export function linkFor(def, champion = null) {
  if (isHeldOut(def)) return null;
  const url = new URL(location.pathname, location.origin);
  if (def.id === 'custom') url.searchParams.set('t', encodeTrack(def.points));
  else url.searchParams.set('track', def.id);
  if (champion) url.searchParams.set('champion', champion);
  return url.href;
}

// handlers = {onPick(def), onEdit()}
export function setupTrackMenu(h) { handlers = h; }

// now = {current: track def, mine: def or null, shared: def or null, champion: {name, label} or null}
export function openTrackMenu(now) {
  box.replaceChildren();
  const add = (el) => { box.appendChild(el); return el; };
  const el = (tag, text, cls) => { const e = document.createElement(tag); e.textContent = text; if (cls) e.className = cls; return e; };
  const button = (label, onClick, current = false) => {
    const b = el('button', label, current ? 'current' : '');
    b.addEventListener('click', () => { onClick(); b.blur(); });
    return add(b);
  };
  const same = (a, b) => a && b && trackKey(a) === trackKey(b);

  add(el('h3', 'TRACKS'));
  for (const def of TRACKS) {
    const label = isHeldOut(def) ? `${def.name} · held out: you drive, champions only after my lap, no training` : def.name;
    button(label, () => pick(def), same(def, now.current));
  }
  if (now.mine) button('My track', () => pick(now.mine), same(now.mine, now.current));
  if (now.shared && !same(now.shared, now.mine)) button('Shared track (from the link)', () => pick(now.shared), same(now.shared, now.current));
  button('Edit / new track', () => { closeTrackMenu(); handlers.onEdit(); });

  const link = linkFor(now.current);
  if (link) {
    add(el('div', `Share ${now.current.id === 'custom' ? 'this track' : now.current.name}:`, 'note'));
    shareRow(link, 'Copy link');
    if (now.champion) shareRow(linkFor(now.current, now.champion.name), `Copy link: this track + champion ${now.champion.label}`);
  } else {
    add(el('div', 'Exam is held out: it has no share link.', 'note'));
  }
  button('Close (T)', closeTrackMenu);
  box.style.display = 'flex';

  function shareRow(url, label) {
    const field = add(document.createElement('input'));
    field.readOnly = true;
    field.value = url;
    const b = button(label, async () => {
      field.select();
      let ok = false;
      try { await navigator.clipboard.writeText(url); ok = true; } catch { ok = document.execCommand?.('copy') ?? false; }
      b.textContent = ok ? 'Copied!' : 'Select the link above and copy it';
      setTimeout(() => { b.textContent = label; }, 1500);
    });
  }
}

function pick(def) {
  closeTrackMenu();
  handlers.onPick(def);
}
