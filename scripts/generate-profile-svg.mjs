/**
 * Build dark/light profile SVGs (Andrew6rant neofetch layout).
 *
 * Left:  circular portrait photo (your real face — looks like you)
 * Right: colored terminal key/value panel
 *
 * Usage: node scripts/generate-profile-svg.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const avatarPath = resolve(rootDir, 'assets/avatar.png');
const portraitSrc =
  process.env.PORTRAIT_SRC ||
  (existsSync(resolve(rootDir, 'assets/portrait.png'))
    ? resolve(rootDir, 'assets/portrait.png')
    : 'D:\\Images\\chochkimhour.png');

// Build compact circular avatar from portrait
if (existsSync(resolve(rootDir, 'scripts/make-avatar.py'))) {
  try {
    execFileSync('python', [resolve(rootDir, 'scripts/make-avatar.py')], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    console.warn('Avatar generation skipped:', err?.message || err);
  }
}

// Also refresh ASCII (optional asset for other uses)
if (existsSync(resolve(rootDir, 'scripts/portrait-to-ascii.py')) && existsSync(portraitSrc)) {
  try {
    execFileSync(
      'python',
      [
        resolve(rootDir, 'scripts/portrait-to-ascii.py'),
        '--src',
        portraitSrc,
        '--out',
        resolve(rootDir, 'assets/portrait_ascii.txt'),
        '--width',
        '44',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
  } catch {
    // optional
  }
}

const escapeXml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
    ring: '#30363d',
    border: null,
  },
  light: {
    bg: '#ffffff',
    text: '#1f2328',
    key: '#cf222e',
    value: '#0550ae',
    cc: '#8c959f',
    ring: '#d0d7de',
    border: '#d0d7de',
  },
};

const portraitHref = (() => {
  const path = existsSync(avatarPath) ? avatarPath : null;
  if (!path) return null;
  const b64 = readFileSync(path).toString('base64');
  return `data:image/png;base64,${b64}`;
})();

const buildSvg = (themeName) => {
  const t = themes[themeName];
  const width = 1000;
  const height = 520;
  const rightX = 390;
  const fontSize = 15;

  const cx = 175;
  const cy = 255;
  const r = 148;

  let y = 36;
  const rightParts = [];
  rightParts.push(
    `    <tspan x="${rightX}" y="${y}" class="title">${escapeXml(info.user)}</tspan><tspan class="cc"> ${'-'.repeat(32)}</tspan>`,
  );
  y += 30;

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
    y += 20;
  }

  y += 14;
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

  y += 14;
  rightParts.push(
    `    <tspan x="${rightX}" y="${y}" class="title">- GitHub Stats</tspan><tspan class="cc"> ${'-'.repeat(30)}</tspan>`,
  );
  y += 24;
  rightParts.push(
    `    <tspan x="${rightX}" y="${y}" class="cc">. </tspan><tspan class="value">${escapeXml(info.stats)}</tspan>`,
  );

  const finalHeight = Math.max(height, y + 36);
  const border = t.border != null ? ` stroke="${t.border}" stroke-width="1"` : '';

  const imgSize = r * 2;
  const imgX = cx - r;
  const imgY = cy - r;

  const photoBlock = portraitHref
    ? `
  <defs>
    <clipPath id="avatarClip">
      <circle cx="${cx}" cy="${cy}" r="${r}"/>
    </clipPath>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="none" stroke="${t.ring}" stroke-width="3"/>
  <image
    href="${portraitHref}"
    xlink:href="${portraitHref}"
    x="${imgX}"
    y="${imgY}"
    width="${imgSize}"
    height="${imgSize}"
    preserveAspectRatio="xMidYMid slice"
    clip-path="url(#avatarClip)"
  />
`
    : `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${t.ring}" opacity="0.25"/>
  <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="${t.text}" font-size="14">add assets/avatar.png</text>
`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" font-family="Consolas, 'Courier New', monospace" width="${width}" height="${finalHeight}" font-size="${fontSize}px">
  <style>
    .key { fill: ${t.key}; }
    .value { fill: ${t.value}; }
    .cc { fill: ${t.cc}; }
    .title { fill: ${t.text}; font-weight: bold; }
    text, tspan { white-space: pre; }
  </style>
  <rect width="${width}" height="${finalHeight}" fill="${t.bg}" rx="15"${border}/>
${photoBlock}
  <text x="${rightX}" y="36" fill="${t.text}">
${rightParts.join('\n')}
  </text>
</svg>
`;
};

for (const name of ['dark', 'light']) {
  const out = resolve(rootDir, `assets/${name}_mode.svg`);
  writeFileSync(out, buildSvg(name), 'utf8');
  const kb = (readFileSync(out).length / 1024).toFixed(0);
  console.log(`Wrote ${out} (${kb} KB)`);
}
