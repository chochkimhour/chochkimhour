/**
 * Build dark/light neofetch-style profile info SVGs (two columns).
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
  // Left column (under the user title). null = small spacer.
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
  ],
  // Right column, top section
  stack: [
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

// Characters between ". " and the row end, wide enough that every value ends in one column.
const columnWidth = (rows) => Math.max(...rows.filter(Boolean).map((r) => r.key.length + r.value.length)) + 4;
const leftWidth = columnWidth(info.rows);
const rightWidth = columnWidth([...info.stack, ...info.contact]);

const dotsFor = (label, value, width) => {
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

const TITLE_H = 28;
const ROW_H = 20;
const SPACER_H = 10;
const SECTION_GAP = 12;
const STATS_GAP = 18; // space above the centred stats line

const buildColumn = (x, startY, width, sections) => {
  let y = startY;
  const parts = [];

  const pushTitle = (label) => {
    // End the rule in the same column as the row values.
    const dashes = width + 1 - label.length;
    parts.push(
      `    <tspan x="${x}" y="${y}" class="title">${escapeXml(label)}</tspan><tspan class="cc"> ${'-'.repeat(dashes)}</tspan>`,
    );
  };

  const pushRow = (key, value) => {
    const dots = dotsFor(key, value, width);
    const keyHtml = key
      .split('.')
      .map((part) => `<tspan class="key">${escapeXml(part)}</tspan>`)
      .join('<tspan class="key">.</tspan>');
    parts.push(
      `    <tspan x="${x}" y="${y}" class="cc">. </tspan>${keyHtml}:<tspan class="cc"> ${dots} </tspan><tspan class="value">${escapeXml(value)}</tspan>`,
    );
  };

  sections.forEach(({ title, rows }, i) => {
    if (i > 0) y += SECTION_GAP;
    pushTitle(title);
    y += TITLE_H;
    for (const row of rows) {
      if (row === null) {
        y += SPACER_H;
        continue;
      }
      pushRow(row.key, row.value);
      y += ROW_H;
    }
  });

  return { parts, endY: y - ROW_H };
};

const buildSvg = (themeName) => {
  const t = themes[themeName];

  // Fixed layout numbers — do NOT depend on font metrics
  const pad = 24;
  const gap = 36;
  const fontSize = 15;
  const charWidth = fontSize * 0.6; // typical monospace advance
  // Row text is ". " + width + " "
  const leftX = pad;
  const rightX = Math.round(leftX + (leftWidth + 3) * charWidth + gap);
  const width = Math.round(rightX + (rightWidth + 3) * charWidth + pad);

  const startY = pad + 8 + fontSize;
  const left = buildColumn(leftX, startY, leftWidth, [{ title: info.user, rows: info.rows }]);
  const right = buildColumn(rightX, startY, rightWidth, [
    { title: '- Stack', rows: info.stack },
    { title: '- Contact', rows: info.contact },
  ]);
  // Stats line sits centred under both columns.
  const statsY = Math.max(left.endY, right.endY) + STATS_GAP + ROW_H;
  const height = Math.ceil(statsY + pad + 8);

  const border = t.border != null ? ` stroke="${t.border}" stroke-width="1"` : '';

  // Inline fills (GitHub sometimes weakens class-only CSS)
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${t.bg}" rx="15"${border}/>
  <text x="${leftX}" y="${startY}" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" font-size="${fontSize}" fill="${t.text}" xml:space="preserve">
${[...left.parts, ...right.parts]
  .join('\n')
  .replace(/class="key"/g, `fill="${t.key}"`)
  .replace(/class="value"/g, `fill="${t.value}"`)
  .replace(/class="cc"/g, `fill="${t.cc}"`)
  .replace(/class="title"/g, `fill="${t.text}" font-weight="bold"`)}
  </text>
  <text x="${width / 2}" y="${statsY}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" font-size="${fontSize}" fill="${t.value}" xml:space="preserve">. ${escapeXml(info.stats)}</text>
</svg>
`;
};

for (const name of ['dark', 'light']) {
  const out = resolve(rootDir, `assets/${name}_mode.svg`);
  writeFileSync(out, buildSvg(name), 'utf8');
  console.log(`Wrote ${out}`);
}
