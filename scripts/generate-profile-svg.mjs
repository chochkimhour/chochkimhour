/**
 * Build dark/light neofetch-style profile SVGs (Andrew6rant layout).
 * Left:  ASCII portrait from assets/choch_kimhour.txt
 * Right: colored key/value terminal panel
 *
 * Left and right columns share the same height so the card looks balanced.
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

/**
 * Nearest-neighbor downsample so dense source art fits Andrew-like proportions.
 * Source is typically ~100x83; target ~46x28 sits evenly next to the info panel.
 */
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

// Andrew-like left column size (balanced with right panel line count)
const TARGET_COLS = 46;
const TARGET_ROWS = 28;
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

const lineWidth = 48;

const dotsFor = (label, value, width = lineWidth) => {
  const base = `${label}: `;
  const remaining = Math.max(2, width - base.length - value.length);
  return '.'.repeat(remaining);
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

/** Build right-panel tspans. y starts at 0; caller shifts by offset. */
const buildRightPanel = (rightX) => {
  let y = 0;
  const parts = [];

  const pushTitle = (label, dashes) => {
    parts.push(
      `    <tspan x="${rightX}" y="${y}" class="title">${escapeXml(label)}</tspan><tspan class="cc"> ${'-'.repeat(dashes)}</tspan>`,
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
      y += 12;
      continue;
    }
    pushRow(row.key, row.value);
    y += 20;
  }

  y += 14;
  pushTitle('- Contact', 35);
  y += 24;

  for (const row of info.contact) {
    pushRow(row.key, row.value);
    y += 20;
  }

  y += 14;
  pushTitle('- GitHub Stats', 30);
  y += 24;
  parts.push(
    `    <tspan x="${rightX}" y="${y}" class="cc">. </tspan><tspan class="value">${escapeXml(info.stats)}</tspan>`,
  );
  // last baseline is at y; content height includes a little descender room
  const contentHeight = y + 4;

  return { parts, contentHeight };
};

const buildSvg = (themeName) => {
  const t = themes[themeName];

  const pad = 22;
  const fontSize = 15;
  const charWidth = fontSize * 0.6;

  const asciiBlockWidth = Math.ceil(TARGET_COLS * charWidth);
  const leftX = pad;
  const gap = 32;
  const rightX = leftX + asciiBlockWidth + gap;
  const panelWidth = 520;
  const width = rightX + panelWidth + pad;

  const { parts: rightParts, contentHeight: rightH } = buildRightPanel(rightX);

  // Make left ASCII span exactly the same height as the right panel
  const asciiStep = rightH / Math.max(1, TARGET_ROWS - 1);
  const contentH = rightH;
  const height = Math.ceil(pad * 2 + contentH);

  const asciiStartY = pad;
  const rightOffset = pad;

  const asciiTspans = asciiLines
    .map((line, i) => {
      const y = asciiStartY + i * asciiStep;
      return `    <tspan x="${leftX}" y="${y.toFixed(2)}">${escapeXml(line)}</tspan>`;
    })
    .join('\n');

  const rightPartsShifted = rightParts.map((line) =>
    line.replace(/y="(\d+(?:\.\d+)?)"/g, (_, y) => `y="${(Number(y) + rightOffset).toFixed(2)}"`),
  );

  const border = t.border != null ? ` stroke="${t.border}" stroke-width="1"` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" font-family="Consolas, 'Courier New', monospace" width="${width}" height="${height}" font-size="${fontSize}px">
  <style>
    .key { fill: ${t.key}; }
    .value { fill: ${t.value}; }
    .cc { fill: ${t.cc}; }
    .title { fill: ${t.text}; font-weight: bold; }
    .ascii { fill: ${t.ascii}; }
    text, tspan { white-space: pre; }
  </style>
  <rect width="${width}" height="${height}" fill="${t.bg}" rx="15"${border}/>
  <text x="${leftX}" y="${asciiStartY.toFixed(2)}" class="ascii">
${asciiTspans}
  </text>
  <text x="${rightX}" y="${rightOffset.toFixed(2)}" fill="${t.text}">
${rightPartsShifted.join('\n')}
  </text>
</svg>
`;
};

for (const name of ['dark', 'light']) {
  const out = resolve(rootDir, `assets/${name}_mode.svg`);
  writeFileSync(out, buildSvg(name), 'utf8');
  console.log(`Wrote ${out}`);
}
