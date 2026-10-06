// Builds the web version of the guide from the two Markdown files:
//   HOW-IT-WORKS.md -> docs/guide/index.html      (the simple guide)
//   DEEP-DIVE.md    -> docs/guide/deep-dive.html  (all the detail)
// A tiny Markdown reader for exactly what the guide uses (headings, paragraphs,
// lists, quotes, tables, images, links, bold, italic, code). No dependencies.
// Run with: node tools/guide-page.js   (again whenever either Markdown file changes)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const OUT = new URL('docs/guide/', root);
mkdirSync(OUT, { recursive: true });

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
  if (path.startsWith('docs/')) return `../${path.slice(5)}${tail}`;
  return `../../${path}${tail}`;
}

function inline(s) {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(escapeHtml(c)) - 1}\u0000`);
  s = escapeHtml(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => `<img src="${href(src)}" alt="${alt}">`);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${href(u)}">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}

export function markdownToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  const isBlockStart = (l) => /^(#{1,6} |> |- |\d+\. |\||---\s*$)/.test(l) || l.trim() === '';
  while (i < lines.length) {
    const l = lines[i];
    if (l.trim() === '') { i++; continue; }
    let m;
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

const simple = readFileSync(new URL('HOW-IT-WORKS.md', root), 'utf8');
const deep = readFileSync(new URL('DEEP-DIVE.md', root), 'utf8');
writeFileSync(new URL('index.html', OUT), page('How a little car taught itself to drive', markdownToHtml(simple), 'simple'));
writeFileSync(new URL('deep-dive.html', OUT), page('Deep dive: Bug Driver', markdownToHtml(deep), 'deep'));
console.log('wrote docs/guide/index.html and docs/guide/deep-dive.html');
