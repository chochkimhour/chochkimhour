import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readmeFile = resolve(rootDir, 'README.md');
const templateFile = resolve(rootDir, 'README.template.md');
const darkSvg = resolve(rootDir, 'assets/dark_mode.svg');
const lightSvg = resolve(rootDir, 'assets/light_mode.svg');
const asciiFile = resolve(rootDir, 'assets/choch_kimhour.txt');

const readRequiredFile = (filePath, label) => {
  if (!existsSync(filePath)) {
    throw new Error(`${label} is missing.`);
  }

  return readFileSync(filePath, 'utf8');
};

const assertIncludes = (content, label, requiredText) => {
  const missingText = requiredText.filter((text) => !content.includes(text));

  if (missingText.length > 0) {
    throw new Error(`${label} is missing required content: ${missingText.join(', ')}`);
  }
};

const readme = readRequiredFile(readmeFile, 'README.md');
const template = readRequiredFile(templateFile, 'README.template.md');
const dark = readRequiredFile(darkSvg, 'assets/dark_mode.svg');
const light = readRequiredFile(lightSvg, 'assets/light_mode.svg');
readRequiredFile(asciiFile, 'assets/choch_kimhour.txt');

const requiredReadmeText = [
  'assets/dark_mode.svg',
  'assets/light_mode.svg',
  'Choch Kimhour',
  'Backend Developer',
];

const requiredTemplateText = [
  '{{PROFILE_NAME}}',
  '{{PROFILE_TITLE}}',
  '{{PROFILE_TAGLINE}}',
  '{{GITHUB_USERNAME}}',
  '{{GITHUB_URL}}',
  'assets/dark_mode.svg',
  'assets/light_mode.svg',
];

const requiredSvgText = ['choch@kimhour', 'Backend Developer', 'Phnom Penh', 'LinkedIn'];

if (/\{\{[A-Z0-9_]+\}\}/.test(readme)) {
  throw new Error('README.md contains unreplaced template variables.');
}

if (/###\s*Links/i.test(readme)) {
  throw new Error('README.md must not include a Links section.');
}

assertIncludes(readme, 'README.md', requiredReadmeText);
assertIncludes(template, 'README.template.md', requiredTemplateText);
assertIncludes(dark, 'assets/dark_mode.svg', requiredSvgText);
assertIncludes(light, 'assets/light_mode.svg', requiredSvgText);

// Balanced card: left/right should share one SVG height under ~700px
for (const [label, svg] of [
  ['assets/dark_mode.svg', dark],
  ['assets/light_mode.svg', light],
]) {
  const m = svg.match(/height="(\d+)"/);
  if (!m) {
    throw new Error(`${label} is missing height attribute.`);
  }
  const h = Number(m[1]);
  if (h > 700) {
    throw new Error(`${label} height ${h} is too tall (left/right look unbalanced).`);
  }
}

console.log('README and balanced SVGs are valid.');
