// Builds the web version of the guide from the two Markdown files:
//   HOW-IT-WORKS.md -> docs/guide/index.html      (the simple guide)
//   DEEP-DIVE.md    -> docs/guide/deep-dive.html  (all the detail)
// A tiny Markdown reader for exactly what the guide uses (headings, paragraphs,
// lists, quotes, tables, images, links, bold, italic, code). No dependencies.
// Run with: node tools/guide-page.js   (again whenever either Markdown file changes)
//
// The pages must work however they're opened: double-clicked in any browser,
// or in an app's built-in HTML preview, and some of those won't let a local page
// load any other file at all. So every figure is embedded in the page itself
// (a data: URL made from the SVG file). The build fails if an image path in the
// Markdown doesn't exist on disk, or if a page still points an <img> at a file.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { syncCode, boxPlaceholders, boxHtml } from './code-boxes.js';

const root = new URL('../', import.meta.url);
const OUT = new URL('docs/guide/', root);
mkdirSync(OUT, { recursive: true });
rmSync(new URL('img/', OUT), { recursive: true, force: true }); // older builds copied the figures here
const embedded = new Set(); // figures built into the pages

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The same heading ids GitHub makes, so #links work in both places
export function slug(text) {
  return text.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s/g, '-');
}

// Where a link in the Markdown should point from docs/guide/
function href(url) {
  if (url.startsWith('#') || /^[a-z]+:/.test(url)) return url;
  const [path, hash = ''] = url.split('#');
  const tail = hash ? `#${hash}` : '';
  if (path === 'HOW-IT-WORKS.md') return `index.html${tail}`;
  if (path === 'DEEP-DIVE.md') return `deep-dive.html${tail}`;
  return `../../${path}${tail}`;
}

// An image, built into the page: the SVG file itself as a data: URL
function imageSrc(path) {
  const file = new URL(path, root);
  if (!existsSync(file)) throw new Error(`image ${path} does not exist`);
  embedded.add(path);
  return `data:image/svg+xml;base64,${readFileSync(file).toString('base64')}`;
}

function inline(s) {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(escapeHtml(c)) - 1}\u0000`);
  s = escapeHtml(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => `<img src="${imageSrc(src)}" alt="${alt}">`);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${href(u)}">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}

export function markdownToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  const isBlockStart = (l) => /^(#{1,6} |> |- |\d+\. |\||---\s*$|```|<!--)/.test(l) || l.trim() === '';
  while (i < lines.length) {
    const l = lines[i];
    if (l.trim() === '') { i++; continue; }
    let m;
    if (l.startsWith('<!--')) {
      // a hidden comment (on GitHub too): skip it
      while (i < lines.length && !lines[i].includes('-->')) i++;
      i++;
      continue;
    }
    if (l.startsWith('```')) {
      // a block of code, shown as it is
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      i++;
      out.push(`<pre class="code"><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }
    if ((m = /^(#{1,6}) (.*)$/.exec(l))) {
      const level = m[1].length, text = m[2];
      out.push(`<h${level} id="${slug(text)}">${inline(text)}</h${level}>`);
      i++;
    } else if (/^---\s*$/.test(l)) {
      out.push('<hr>'); i++;
    } else if (l.startsWith('> ') || l === '>') {
      const inner = [];
      while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) inner.push(lines[i++].replace(/^> ?/, ''));
      out.push(`<blockquote>${markdownToHtml(inner.join('\n'))}</blockquote>`);
    } else if (/^- /.test(l)) {
      const items = [];
      while (i < lines.length && /^- /.test(lines[i])) items.push(lines[i++].slice(2));
      out.push(`<ul>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</ul>`);
    } else if (/^\d+\. /.test(l)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\d+\. /, ''));
      out.push(`<ol start="${parseInt(l, 10)}">${items.map((t) => `<li>${inline(t)}</li>`).join('')}</ol>`);
    } else if (l.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const [head, , ...body] = rows;
      out.push(`<div class="table"><table><thead><tr>${cells(head).map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${
        body.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
    } else if (/^!\[[^\]]*\]\([^)]+\)\s*$/.test(l)) {
      out.push(`<figure>${inline(l.trim())}</figure>`); i++;
    } else {
      const para = [];
      while (i < lines.length && !isBlockStart(lines[i]) && !/^!\[/.test(lines[i])) para.push(lines[i++]);
      out.push(`<p>${inline(para.join(' '))}</p>`);
    }
  }
  return out.join('\n');
}

const CSS = `
:root { --bg: #0b0d13; --panel: #11141d; --cyan: #00f0ff; --pink: #ff2e63; --yellow: #ffd23f; --text: #e6ebf2; --dim: #9fb3c8; }
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--text); font: 18px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 760px; margin: 0 auto; padding: 24px 16px 80px; }
nav { position: sticky; top: 0; z-index: 2; background: rgba(11, 13, 19, 0.92); backdrop-filter: blur(6px); border-bottom: 1px solid rgba(0, 240, 255, 0.2); }
nav div { max-width: 760px; margin: 0 auto; padding: 10px 16px; display: flex; gap: 18px; font: 600 15px ui-monospace, Menlo, monospace; }
nav a { color: var(--dim); text-decoration: none; }
nav a.here { color: var(--cyan); text-shadow: 0 0 8px rgba(0, 240, 255, 0.6); }
h1, h2, h3 { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; line-height: 1.25; }
h1 { font-size: 30px; color: var(--cyan); text-shadow: 0 0 14px rgba(0, 240, 255, 0.45); margin: 12px 0 20px; }
h2 { font-size: 24px; color: var(--yellow); margin: 44px 0 12px; }
h3 { font-size: 19px; color: var(--cyan); margin: 28px 0 8px; }
p, li { max-width: 68ch; }
a { color: var(--cyan); }
strong { color: #fff; }
hr { border: 0; border-top: 1px solid rgba(0, 240, 255, 0.15); margin: 36px 0; }
figure { margin: 20px 0; }
figure img { display: block; width: 100%; height: auto; border-radius: 16px; box-shadow: 0 0 24px rgba(0, 240, 255, 0.12); }
blockquote { margin: 20px 0; padding: 4px 20px; background: var(--panel); border: 1px solid rgba(0, 240, 255, 0.35); border-radius: 14px; }
blockquote li { margin: 6px 0; }
code { font: 0.88em ui-monospace, Menlo, monospace; background: #1a1f2e; padding: 1px 5px; border-radius: 4px; color: #b8fbff; }
em { color: var(--dim); }
.table { overflow-x: auto; margin: 16px 0; }
table { border-collapse: collapse; font-size: 15px; min-width: 100%; }
th, td { padding: 6px 10px; border-bottom: 1px solid rgba(0, 240, 255, 0.15); text-align: left; white-space: nowrap; }
th { color: var(--cyan); font-family: ui-monospace, Menlo, monospace; }
pre.code { background: #0d1019; border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 10px; padding: 12px 14px; overflow-x: auto; font: 13px/1.5 ui-monospace, Menlo, monospace; color: #cfe9ff; }
.code-box { margin: 24px 0; padding: 14px 16px 10px; background: var(--panel); border: 1px solid rgba(255, 210, 63, 0.45); border-radius: 14px; }
.code-box h4 { margin: 0 0 6px; font: 700 16px ui-monospace, Menlo, monospace; color: var(--yellow); }
.code-box p { margin: 0 0 10px; font-size: 16px; }
.code-rows { display: grid; gap: 0; }
.code-row { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 14px; padding: 6px 0; border-top: 1px solid rgba(0, 240, 255, 0.08); align-items: start; }
.code-row pre { margin: 0; font: 13px/1.45 ui-monospace, Menlo, monospace; color: #b8fbff; white-space: pre-wrap; word-break: break-word; }
.code-row .say { font-size: 15px; line-height: 1.45; color: var(--text); }
.code-row.skipped pre { color: var(--dim); }
.code-row.skipped .say { color: var(--dim); font-style: italic; }
@media (max-width: 640px) { .code-row { grid-template-columns: 1fr; gap: 2px; } .code-row pre { background: #0d1019; padding: 4px 8px; border-radius: 6px; } }
@media (max-width: 480px) { body { font-size: 17px; } h1 { font-size: 25px; } h2 { font-size: 21px; } }
`;

function page(title, body, here) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="icon" href="data:,">
<style>${CSS}</style>
</head>
<body>
<nav><div><a href="index.html"${here === 'simple' ? ' class="here"' : ''}>How it works</a><a href="deep-dive.html"${here === 'deep' ? ' class="here"' : ''}>Deep dive</a></div></nav>
<main>
${body}
</main>
</body>
</html>
`;
}

const sources = { 'HOW-IT-WORKS.md': ['index.html', 'How a little car taught itself to drive', 'simple'], 'DEEP-DIVE.md': ['deep-dive.html', 'Deep dive: Bug Driver', 'deep'] };
const problems = [];
for (const [md, [html, title, here]] of Object.entries(sources)) {
  let text = readFileSync(new URL(md, root), 'utf8');
  // the code in the guide is always the real code: regenerate every box from the source files
  let boxes = [];
  try {
    const synced = syncCode(text);
    boxes = synced.boxes;
    if (synced.text !== text) { writeFileSync(new URL(md, root), synced.text); text = synced.text; console.log(`${md}: code boxes updated from the source`); }
  } catch (e) {
    problems.push(`${md}: ${e.message}`);
  }
  // on GitHub, image paths in the Markdown are relative to the repo root
  for (const [, src] of text.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
    if (!existsSync(new URL(src, root))) problems.push(`${md}: image ${src} does not exist`);
  }
  let images = 0;
  try {
    let body = markdownToHtml(boxPlaceholders(text));
    body = body.replace(/<p>@@LOOK-AT-THE-CODE-(\d+)@@<\/p>/g, (_, n) => boxHtml(boxes[n], inline, escapeHtml));
    if (body.includes('@@LOOK-AT-THE-CODE')) throw new Error('a code box was not placed');
    const out = page(title, body, here);
    writeFileSync(new URL(html, OUT), out);
    // every <img> in the generated page must be built in, never a file the viewer might not be allowed to open
    for (const [, src] of out.matchAll(/<img src="([^"]+)"/g)) {
      images++;
      if (!src.startsWith('data:image/svg+xml;base64,')) problems.push(`docs/guide/${html}: <img src="${src.slice(0, 60)}"> points at a file instead of being built in`);
    }
  } catch (e) {
    problems.push(`${md}: ${e.message}`);
  }
  console.log(`docs/guide/${html}: ${images} images, ${boxes.length} code boxes`);
}
if (problems.length) {
  console.error(`\nBuild failed:\n${problems.map((p) => `  ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`ok: every image exists and is built into the pages (${embedded.size} figures)`);
