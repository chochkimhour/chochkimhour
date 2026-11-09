/**
 * Build dark/light neofetch-style profile info SVGs.
 *
 * Usage: node scripts/generate-profile-svg.mjs
 */

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const escapeXml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const githubUser = process.env.GITHUB_USERNAME || 'chochkimhour';
const FALLBACK_STATS = 'Repos: 8  |  Followers: 4  |  Following: 3';

const fetchStats = async () => {
  try {
    const headers = { 'User-Agent': 'profile-card-generator', Accept: 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(`https://api.github.com/users/${githubUser}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const u = await res.json();
    return `Repos: ${u.public_repos}  |  Followers: ${u.followers}  |  Following: ${u.following}`;
  } catch (err) {
    console.warn(`GitHub stats fetch failed (${err.message}); using fallback.`);
    return FALLBACK_STATS;
  }
};

const info = {
  user: 'choch@kimhour',
  rows: [
    { key: 'OS', value: 'Windows, Linux' },
    { key: 'Uptime', value: 'on GitHub since Jun 2022' },
    { key: 'Kernel', value: 'Software Developer' },
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
  stats: await fetchStats(),
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
    border: null,
  },
  light: {
    bg: '#ffffff',
    text: '#1f2328',
    key: '#cf222e',
    value: '#0550ae',
    cc: '#8c959f',
    border: '#d0d7de',
  },
};

const buildRightPanel = (rightX, startY) => {
  let y = startY;
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
  const rightX = pad;
  const panelWidth = 500;
  const width = rightX + panelWidth + pad;

  const startY = pad + fontSize;
  const { parts: rightParts, endY: rightEndY } = buildRightPanel(rightX, startY);
  const height = Math.ceil(rightEndY + pad + 8);

  const border = t.border != null ? ` stroke="${t.border}" stroke-width="1"` : '';

  // Inline fills (GitHub sometimes weakens class-only CSS)
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${t.bg}" rx="15"${border}/>
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
