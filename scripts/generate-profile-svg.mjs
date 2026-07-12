/**
 * Build dark/light neofetch-style profile SVGs (Andrew6rant layout).
 *
 * Uses textLength on each ASCII line so GitHub's font substitution cannot
 * stretch the left column into the right panel.
 *
 * Usage: node scripts/generate-profile-svg.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const asciiPath = resolve(rootDir, 'assets/choch_kimhour.txt');

if (!existsSync(asciiPath)) {
  throw new Error(`Missing ASCII portrait: ${asciiPath}`);
}

const rawAsciiLines = readFileSync(asciiPath, 'utf8')
  .replace(/\r\n/g, '\n')
  .split('\n')
  .filter((line, i, arr) => !(i === arr.length - 1 && line === ''));

const escapeXml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const padRight = (s, width) => (s.length >= width ? s.slice(0, width) : s + ' '.repeat(width - s.length));

const downsampleAscii = (lines, targetCols, targetRows) => {
  const srcRows = lines.length;
  const srcCols = Math.max(...lines.map((l) => l.length), 1);
  const grid = lines.map((l) => padRight(l, srcCols));
  const out = [];
  for (let r = 0; r < targetRows; r++) {
    const srcR = Math.min(srcRows - 1, Math.floor(((r + 0.5) * srcRows) / targetRows));
    let row = '';
    for (let c = 0; c < targetCols; c++) {
      const srcC = Math.min(srcCols - 1, Math.floor(((c + 0.5) * srcCols) / targetCols));
      row += grid[srcR][srcC];
    }
    out.push(row);
  }
  return out;
};

const TARGET_COLS = 44;
const TARGET_ROWS = 26;
const asciiLines = downsampleAscii(rawAsciiLines, TARGET_COLS, TARGET_ROWS);

const info = {
  user: 'choch@kimhour',
  rows: [
    { key: 'OS', value: 'Windows, Linux' },
    { key: 'Uptime', value: 'on GitHub since Jun 2022' },
    { key: 'Kernel', value: 'Backend Developer' },
    { key: 'IDE', value: 'VS Code, IntelliJ IDEA' },
    { key: 'Location', value: 'Phnom Penh, Cambodia' },
    null,
    { key: 'Languages.Programming', value: 'Java, JavaScript, Python, Groovy' },
    { key: 'Languages.Computer', value: 'HTML, CSS, JSON, YAML' },
    { key: 'Languages.Real', value: 'Khmer, English' },
    null,
    { key: 'Stack.Backend', value: 'NestJS, Spring Boot, Grails, Express' },
    { key: 'Stack.Database', value: 'MySQL, PostgreSQL, Redis' },
    { key: 'Hobbies.Software', value: 'npm packages, CLI tools, open source' },
  ],
  contact: [
    { key: 'LinkedIn', value: 'choch-kimhour' },
    { key: 'Portfolio', value: 'chochkimhour.github.io/my-portfolio' },
    { key: 'npm', value: '~chochkimhour' },
  ],
  stats: 'Repos: 8  |  Followers: 4  |  Following: 3',
};

const lineWidth = 46;

const dotsFor = (label, value, width = lineWidth) => {
  const base = `${label}: `;
  return '.'.repeat(Math.max(2, width - base.length - value.length));
};

const themes = {
  dark: {
    bg: '#161b22',
    text: '#c9d1d9',
    key: '#ffa657',
    value: '#a5d6ff',
    cc: '#616e7f',
    ascii: '#c9d1d9',
    border: null,
  },
  light: {
    bg: '#ffffff',
    text: '#1f2328',
    key: '#cf222e',
    value: '#0550ae',
    cc: '#8c959f',
    ascii: '#24292f',
    border: '#d0d7de',
  },
};

const buildRightPanel = (rightX, startY) => {
  let y = startY;
  const parts = [];

  const pushTitle = (label, dashes) => {
    parts.push(
      `    <tspan x="${rightX}" y="${y}" fill="currentColor" class="title">${escapeXml(label)}</tspan><tspan class="cc"> ${'-'.repeat(dashes)}</tspan>`,
    );
  };

  const pushRow = (key, value) => {
    const dots = dotsFor(key, value);
    const keyHtml = key
      .split('.')
      .map((part) => `<tspan class="key">${escapeXml(part)}</tspan>`)
      .join('<tspan class="key">.</tspan>');
    parts.push(
      `    <tspan x="${rightX}" y="${y}" class="cc">. </tspan>${keyHtml}:<tspan class="cc"> ${dots} </tspan><tspan class="value">${escapeXml(value)}</tspan>`,
    );
  };

  pushTitle(info.user, 32);
  y += 28;

  for (const row of info.rows) {
    if (row === null) {
      y += 10;
      continue;
    }
    pushRow(row.key, row.value);
    y += 20;
  }

  y += 12;
  pushTitle('- Contact', 35);
  y += 24;

  for (const row of info.contact) {
    pushRow(row.key, row.value);
    y += 20;
  }

  y += 12;
  pushTitle('- GitHub Stats', 30);
  y += 24;
  parts.push(
    `    <tspan x="${rightX}" y="${y}" class="cc">. </tspan><tspan class="value">${escapeXml(info.stats)}</tspan>`,
  );

  return { parts, endY: y };
};

const buildSvg = (themeName) => {
  const t = themes[themeName];

  // Fixed layout numbers — do NOT depend on font metrics
  const pad = 20;
  const fontSize = 15;
  const lineStep = 18;
  // Force each ASCII line into this pixel width (GitHub-safe)
  const asciiLineWidth = 400;
  const leftX = pad;
  const rightX = leftX + asciiLineWidth + 40;
  const panelWidth = 500;
  const width = rightX + panelWidth + pad;

  const startY = pad + fontSize;
  const asciiEndY = startY + (TARGET_ROWS - 1) * lineStep;
  const { parts: rightParts, endY: rightEndY } = buildRightPanel(rightX, startY);
  const height = Math.ceil(Math.max(asciiEndY, rightEndY) + pad + 8);

  // textLength + lengthAdjust forces exact column width even if font changes on GitHub
  const asciiTspans = asciiLines
    .map((line, i) => {
      const y = startY + i * lineStep;
      return `    <tspan x="${leftX}" y="${y}" textLength="${asciiLineWidth}" lengthAdjust="spacingAndGlyphs">${escapeXml(line)}</tspan>`;
    })
    .join('\n');

  const border = t.border != null ? ` stroke="${t.border}" stroke-width="1"` : '';

  // Inline fills (GitHub sometimes weakens class-only CSS)
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${t.bg}" rx="15"${border}/>
  <text x="${leftX}" y="${startY}" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" font-size="${fontSize}" fill="${t.ascii}" xml:space="preserve">
${asciiTspans}
  </text>
  <text x="${rightX}" y="${startY}" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" font-size="${fontSize}" fill="${t.text}" xml:space="preserve">
${rightParts
  .join('\n')
  .replace(/class="key"/g, `fill="${t.key}"`)
  .replace(/class="value"/g, `fill="${t.value}"`)
  .replace(/class="cc"/g, `fill="${t.cc}"`)
  .replace(/class="title"/g, `fill="${t.text}" font-weight="bold"`)}
  </text>
</svg>
`;
};

for (const name of ['dark', 'light']) {
  const out = resolve(rootDir, `assets/${name}_mode.svg`);
  writeFileSync(out, buildSvg(name), 'utf8');
  console.log(`Wrote ${out}`);
}
