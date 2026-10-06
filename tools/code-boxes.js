// "Look at the code" boxes for the guide: real code, pulled out of the source files by
// function name, so the guide always shows the code that actually runs.
//
// In the Markdown a box is written once, as a hidden comment (invisible on GitHub):
//
//   <!-- look-at-the-code
//   file: src/sim/brain.js
//   function: neuron
//   title: one neuron
//   intro: (optional) one sentence before the code
//   export function neuron(inputs, brain, start, squash) { => what this line does, in plain words
//     let sum = 0; => ...
//   ... => what the skipped lines do (for code left out of the box)
//   -->
//   (the box itself is generated here by tools/guide-page.js)
//   <!-- /look-at-the-code -->
//
// The build fails if the function is missing, if a line of the box is not the real code any more,
// if a line has no explanation, if lines are skipped without saying what they do, or if the box
// shows more than 12 lines of code.
//
// The deep dive shows whole functions the same way:  <!-- full-code src/sim/brain.js neuron --> ... <!-- /full-code -->

import { readFileSync } from 'node:fs';

export const MAX_LINES = 12;
const root = new URL('../', import.meta.url);

// The lines of a top-level function, from `function name(` to its closing `}` (optionally with the comment above it).
export function extractFunction(file, name, withComment = false) {
  const lines = readFileSync(new URL(file, root), 'utf8').split('\n');
  const start = lines.findIndex((l) => new RegExp(`^(export )?(async )?function ${name}\\(`).test(l));
  if (start < 0) throw new Error(`function ${name}() not found in ${file}`);
  const end = lines.findIndex((l, i) => i > start && l === '}');
  if (end < 0) throw new Error(`function ${name}() in ${file} has no closing } at the start of a line`);
  let first = start;
  if (withComment) while (first > 0 && lines[first - 1].startsWith('//')) first--;
  return lines.slice(first, end + 1);
}

// Reads a box's hidden spec into {file, fn, title, intro, entries: [{code, say} | {skip: true, say}]}
function parseSpec(spec) {
  const box = { entries: [] };
  for (const raw of spec.split('\n')) {
    if (!raw.trim()) continue;
    const head = /^(file|function|title|intro):\s*(.*)$/.exec(raw);
    if (head && !raw.includes(' => ')) { box[head[1] === 'function' ? 'fn' : head[1]] = head[2].trim(); continue; }
    const at = raw.lastIndexOf(' => ');
    if (at < 0) throw new Error(`line without " => " (an explanation): ${raw.trim()}`);
    const code = raw.slice(0, at), say = raw.slice(at + 4).trim();
    if (!say) throw new Error(`no explanation for: ${code.trim()}`);
    box.entries.push(code.trim() === '...' ? { skip: true, say } : { code, say });
  }
  if (!box.file || !box.fn) throw new Error('a box needs "file:" and "function:"');
  return box;
}

// Matches the explained lines against the real function, in order. Returns the rows to show.
function buildRows(box) {
  const fn = extractFunction(box.file, box.fn).filter((l) => l.trim() !== '');
  const rows = [];
  let p = 0, pendingSkip = null;
  for (const e of box.entries) {
    if (e.skip) { pendingSkip = e; continue; }
    let j = p;
    // lines are compared with their indentation, so a `}` only matches the `}` at the same depth
    const same = (line) => line.trimEnd() === e.code.trimEnd();
    if (pendingSkip) while (j < fn.length && !same(fn[j])) j++;
    if (j >= fn.length || !same(fn[j])) {
      throw new Error(`${box.fn}(): the guide explains "${e.code.trim()}", but the code there is "${(fn[p] ?? '(the end)').trim()}"`);
    }
    if (j > p) {
      if (!pendingSkip) throw new Error(`${box.fn}(): lines are left out without a "... =>" saying what they do`);
      rows.push({ code: `${fn[p].match(/^\s*/)[0]}…`, say: pendingSkip.say, skip: true });
    } else if (pendingSkip) {
      throw new Error(`${box.fn}(): a "... =>" stands where no line is left out`);
    }
    pendingSkip = null;
    rows.push({ code: fn[j], say: e.say });
    p = j + 1;
  }
  if (p < fn.length) {
    if (!pendingSkip) throw new Error(`${box.fn}(): the last ${fn.length - p} line(s) have no explanation, starting with "${fn[p].trim()}"`);
    rows.push({ code: `${fn[p].match(/^\s*/)[0]}…`, say: pendingSkip.say, skip: true });
  }
  const shown = rows.filter((r) => !r.skip).length;
  if (shown > MAX_LINES) throw new Error(`${box.fn}(): the box shows ${shown} lines of code, more than ${MAX_LINES}`);
  return rows;
}

const BOX = /<!-- look-at-the-code\n([\s\S]*?)-->\n[\s\S]*?<!-- \/look-at-the-code -->/g;
const FULL = /<!-- full-code (\S+) (\S+) -->\n[\s\S]*?<!-- \/full-code -->/g;

const tick = (code) => (code.includes('`') ? `\`\` ${code} \`\`` : `\`${code}\``);

// The Markdown version of a box: the code, then one explanation per line underneath
function boxMarkdown(box, rows) {
  const out = [`> **Look at the code: ${box.title ?? `${box.fn}()`}**`];
  if (box.intro) out.push(`> ${box.intro}`);
  out.push('>', '> ```js', ...rows.map((r) => `> ${r.code}`), '> ```', '>');
  rows.forEach((r, i) => out.push(`> ${i + 1}. ${tick(r.code.trim())} — ${r.say}`));
  return out.join('\n');
}

// Regenerates every box and full-code block in a Markdown text from the current source code.
// Returns {text, boxes}: boxes are kept for the web page (which shows them in two columns).
export function syncCode(text) {
  const boxes = [];
  text = text.replace(BOX, (_, spec) => {
    const box = parseSpec(spec);
    const rows = buildRows(box);
    boxes.push({ box, rows });
    return `<!-- look-at-the-code\n${spec}-->\n${boxMarkdown(box, rows)}\n<!-- /look-at-the-code -->`;
  });
  text = text.replace(FULL, (_, file, name) => {
    const code = extractFunction(file, name, true);
    return `<!-- full-code ${file} ${name} -->\n\`\`\`js\n${code.join('\n')}\n\`\`\`\n<!-- /full-code -->`;
  });
  return { text, boxes };
}

// For the web page: each box becomes a placeholder line, filled in later with the two-column version
export function boxPlaceholders(text) {
  let n = 0;
  return text.replace(BOX, () => `@@LOOK-AT-THE-CODE-${n++}@@`);
}

export function boxHtml({ box, rows }, inline, escapeHtml) {
  const r = rows.map((row) => `<div class="code-row${row.skip ? ' skipped' : ''}"><pre>${escapeHtml(row.code)}</pre><div class="say">${inline(row.say)}</div></div>`).join('');
  return `<section class="code-box"><h4>Look at the code: ${inline(box.title ?? `${box.fn}()`)}</h4>${box.intro ? `<p>${inline(box.intro)}</p>` : ''}<div class="code-rows">${r}</div></section>`;
}
