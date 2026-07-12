/**
 * Build dark/light neofetch-style profile SVGs with portrait ASCII art.
 * Usage: node scripts/generate-profile-svg.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const asciiPath = resolve(rootDir, 'assets/portrait_ascii.txt');
const portraitSrc =
  process.env.PORTRAIT_SRC ||
  (existsSync(resolve(rootDir, 'assets/portrait.png'))
    ? resolve(rootDir, 'assets/portrait.png')
    : 'D:\\Images\\chochkimhour.png');
const pyScript = resolve(rootDir, 'scripts/portrait-to-ascii.py');

// Regenerate ASCII when source portrait is available
if (existsSync(portraitSrc) && existsSync(pyScript)) {
  try {
    execFileSync(
      'python',
      [
        pyScript,
        '--src',
        portraitSrc,
        '--out',
        asciiPath,
        '--cols',
        '40',
        '--rows',
        '24',
        '--contrast',
        '2.35',
        '--sharpness',
        '2.6',
        '--gamma',
        '0.68',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
  } catch {
    // Keep existing ASCII if python conversion fails
  }
}

if (!existsSync(asciiPath)) {
  throw new Error(`Missing ASCII portrait: ${asciiPath}`);
}

const asciiLines = readFileSync(asciiPath, 'utf8')
  .replace(/\r\n/g, '\n')
  .split('\n')
  .filter((line, i, arr) => !(i === arr.length - 1 && line === ''));

const escapeXml = (s) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const padRight = (s, width) => (s.length >= width ? s.slice(0, width) : s + ' '.repeat(width - s.length));
const colWidth = Math.max(...asciiLines.map((l) => l.length), 40);
const paddedAscii = asciiLines.map((l) => padRight(l, colWidth));

const info = {
  user: 'choch@kimhour',
  rows: [
    { key: 'OS', value: 'Windows, Linux' },
    { key: 'Uptime', value: 'on GitHub since Jun 2022' },
    { key: 'Host', value: 'Ecoinsoft Solutions Co., Ltd' },
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
    { key: 'Email', value: 'chochkimhour2303@gmail.com' },
    { key: 'LinkedIn', value: 'choch-kimhour' },
    { key: 'GitHub', value: 'chochkimhour' },
    { key: 'Portfolio', value: 'chochkimhour.github.io/my-portfolio' },
    { key: 'Telegram', value: '@choch_kimhour' },
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
  const asciiStartY = 28;
  const lineStep = 18;
  const leftX = 18;
  const rightX = 400;
  const asciiBlockHeight = paddedAscii.length * lineStep;
  const height = Math.max(520, asciiStartY + asciiBlockHeight + 20);

  const asciiTspans = paddedAscii
    .map((line, i) => {
      const y = asciiStartY + i * lineStep;
      return `    <tspan x="${leftX}" y="${y}">${escapeXml(line)}</tspan>`;
    })
    .join('\n');

  let y = 28;
  const rightParts = [];
  rightParts.push(
    `    <tspan x="${rightX}" y="${y}" class="title">${escapeXml(info.user)}</tspan><tspan class="cc"> ${'-'.repeat(32)}</tspan>`,
  );
  y += 28;

  for (const row of info.rows) {
    if (row === null) {
      y += 10;
      continue;
    }
    const dots = dotsFor(row.key, row.value);
    // split compound keys like Languages.Programming into key.key style
    const keyHtml = row.key
      .split('.')
      .map((part) => `<tspan class="key">${escapeXml(part)}</tspan>`)
      .join('<tspan class="key">.</tspan>');
    rightParts.push(
      `    <tspan x="${rightX}" y="${y}" class="cc">. </tspan>${keyHtml}:<tspan class="cc"> ${dots} </tspan><tspan class="value">${escapeXml(row.value)}</tspan>`,
    );
    y += 20;
  }

  y += 12;
  rightParts.push(
    `    <tspan x="${rightX}" y="${y}" class="title">- Contact</tspan><tspan class="cc"> ${'-'.repeat(35)}</tspan>`,
  );
  y += 24;

  for (const row of info.contact) {
    const dots = dotsFor(row.key, row.value);
    rightParts.push(
      `    <tspan x="${rightX}" y="${y}" class="cc">. </tspan><tspan class="key">${escapeXml(row.key)}</tspan>:<tspan class="cc"> ${dots} </tspan><tspan class="value">${escapeXml(row.value)}</tspan>`,
    );
    y += 20;
  }

  y += 12;
  rightParts.push(
    `    <tspan x="${rightX}" y="${y}" class="title">- GitHub Stats</tspan><tspan class="cc"> ${'-'.repeat(30)}</tspan>`,
  );
  y += 24;
  rightParts.push(
    `    <tspan x="${rightX}" y="${y}" class="cc">. </tspan><tspan class="value">${escapeXml(info.stats)}</tspan>`,
  );

  const finalHeight = Math.max(height, y + 28);
  const border =
    t.border != null
      ? ` stroke="${t.border}" stroke-width="1"`
      : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" font-family="Consolas, 'Courier New', monospace" width="985" height="${finalHeight}" font-size="14">
  <style>
    .key { fill: ${t.key}; }
    .value { fill: ${t.value}; }
    .cc { fill: ${t.cc}; }
    .title { fill: ${t.text}; font-weight: bold; }
    .ascii { fill: ${t.ascii}; }
    text, tspan { white-space: pre; }
  </style>
  <rect width="985" height="${finalHeight}" fill="${t.bg}" rx="15"${border}/>
  <text x="${leftX}" y="${asciiStartY}" class="ascii">
${asciiTspans}
  </text>
  <text x="${rightX}" y="28" fill="${t.text}">
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
