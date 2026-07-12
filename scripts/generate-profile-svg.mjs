/**
 * Build dark/light neofetch-style profile SVGs (Andrew6rant layout).
 * Left:  ASCII portrait from assets/choch_kimhour.txt (user-provided)
 * Right: colored key/value terminal panel
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

const asciiLines = readFileSync(asciiPath, 'utf8')
  .replace(/\r\n/g, '\n')
  .split('\n')
  .filter((line, i, arr) => !(i === arr.length - 1 && line === ''));

const escapeXml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const padRight = (s, width) => (s.length >= width ? s.slice(0, width) : s + ' '.repeat(width - s.length));
const colWidth = Math.max(...asciiLines.map((l) => l.length), 1);
const paddedAscii = asciiLines.map((l) => padRight(l, colWidth));

// Host / Email / GitHub username / Telegram omitted (per earlier request)
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

const buildSvg = (themeName) => {
  const t = themes[themeName];

  // Dense 100x83 art → compact monospaced grid (same spirit as Andrew6rant)
  const fontSize = 9;
  const lineStep = 10;
  const leftX = 12;
  const asciiStartY = 18;
  // ~0.6 * fontSize is typical Consolas advance; keep room for 100 cols
  const asciiBlockWidth = Math.ceil(colWidth * fontSize * 0.62) + 24;
  const rightX = asciiBlockWidth + 20;
  const panelWidth = 560;
  const width = rightX + panelWidth;
  const asciiHeight = asciiStartY + paddedAscii.length * lineStep + 16;

  const asciiTspans = paddedAscii
    .map((line, i) => {
      const y = asciiStartY + i * lineStep;
      return `    <tspan x="${leftX}" y="${y}">${escapeXml(line)}</tspan>`;
    })
    .join('\n');

  let y = 28;
  const rightParts = [];
  rightParts.push(
    `    <tspan x="${rightX}" y="${y}" class="title">${escapeXml(info.user)}</tspan><tspan class="cc"> ${'-'.repeat(34)}</tspan>`,
  );
  y += 28;

  for (const row of info.rows) {
    if (row === null) {
      y += 12;
      continue;
    }
    const dots = dotsFor(row.key, row.value);
    const keyHtml = row.key
      .split('.')
      .map((part) => `<tspan class="key">${escapeXml(part)}</tspan>`)
      .join('<tspan class="key">.</tspan>');
    rightParts.push(
      `    <tspan x="${rightX}" y="${y}" class="cc">. </tspan>${keyHtml}:<tspan class="cc"> ${dots} </tspan><tspan class="value">${escapeXml(row.value)}</tspan>`,
    );
    y += 22;
  }

  y += 14;
  rightParts.push(
    `    <tspan x="${rightX}" y="${y}" class="title">- Contact</tspan><tspan class="cc"> ${'-'.repeat(37)}</tspan>`,
  );
  y += 26;

  for (const row of info.contact) {
    const dots = dotsFor(row.key, row.value);
    rightParts.push(
      `    <tspan x="${rightX}" y="${y}" class="cc">. </tspan><tspan class="key">${escapeXml(row.key)}</tspan>:<tspan class="cc"> ${dots} </tspan><tspan class="value">${escapeXml(row.value)}</tspan>`,
    );
    y += 22;
  }

  y += 14;
  rightParts.push(
    `    <tspan x="${rightX}" y="${y}" class="title">- GitHub Stats</tspan><tspan class="cc"> ${'-'.repeat(32)}</tspan>`,
  );
  y += 26;
  rightParts.push(
    `    <tspan x="${rightX}" y="${y}" class="cc">. </tspan><tspan class="value">${escapeXml(info.stats)}</tspan>`,
  );

  const finalHeight = Math.max(asciiHeight, y + 36);
  const border = t.border != null ? ` stroke="${t.border}" stroke-width="1"` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" font-family="Consolas, 'Courier New', monospace" width="${width}" height="${finalHeight}" font-size="${fontSize}px">
  <style>
    .key { fill: ${t.key}; }
    .value { fill: ${t.value}; }
    .cc { fill: ${t.cc}; }
    .title { fill: ${t.text}; font-weight: bold; }
    .ascii { fill: ${t.ascii}; }
    text, tspan { white-space: pre; }
  </style>
  <rect width="${width}" height="${finalHeight}" fill="${t.bg}" rx="15"${border}/>
  <text x="${leftX}" y="${asciiStartY}" class="ascii">
${asciiTspans}
  </text>
  <text x="${rightX}" y="28" fill="${t.text}" font-size="14px">
${rightParts.join('\n')}
  </text>
</svg>
`;
};

for (const name of ['dark', 'light']) {
  const out = resolve(rootDir, `assets/${name}_mode.svg`);
  writeFileSync(out, buildSvg(name), 'utf8');
  console.log(`Wrote ${out}`);
}
