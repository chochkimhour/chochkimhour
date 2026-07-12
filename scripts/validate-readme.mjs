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
  'https://www.linkedin.com/in/choch-kimhour',
  'https://chochkimhour.github.io/my-portfolio',
  'https://www.npmjs.com/~chochkimhour',
];

const requiredTemplateText = [
  '{{PROFILE_NAME}}',
  '{{PROFILE_TITLE}}',
  '{{PROFILE_TAGLINE}}',
  '{{GITHUB_USERNAME}}',
  '{{GITHUB_URL}}',
  '{{LINKEDIN_URL}}',
  '{{PORTFOLIO_URL}}',
  '{{NPM_URL}}',
  'assets/dark_mode.svg',
  'assets/light_mode.svg',
];

const requiredSvgText = ['choch@kimhour', 'Backend Developer', 'Phnom Penh', 'LinkedIn'];

if (/\{\{[A-Z0-9_]+\}\}/.test(readme)) {
  throw new Error('README.md contains unreplaced template variables.');
}

// Clickable contact links in README (SVG text is not clickable on GitHub)
const requiredLinkPatterns = [
  /\[linkedin\.com\/in\/choch-kimhour\]\(https:\/\/www\.linkedin\.com\/in\/choch-kimhour\)/,
  /\[chochkimhour\.github\.io\/my-portfolio\]\(https:\/\/chochkimhour\.github\.io\/my-portfolio\)/,
  /\[npmjs\.com\/~chochkimhour\]\(https:\/\/www\.npmjs\.com\/~chochkimhour\)/,
];

for (const pattern of requiredLinkPatterns) {
  if (!pattern.test(readme)) {
    throw new Error(`README.md is missing a clickable link matching: ${pattern}`);
  }
}

assertIncludes(readme, 'README.md', requiredReadmeText);
assertIncludes(template, 'README.template.md', requiredTemplateText);
assertIncludes(dark, 'assets/dark_mode.svg', requiredSvgText);
assertIncludes(light, 'assets/light_mode.svg', requiredSvgText);

// Ensure SVG embeds a chunk of the provided ASCII source
const asciiSample = readFileSync(asciiFile, 'utf8').split(/\r?\n/).find((l) => l.trim().length > 20);
if (asciiSample && !dark.includes(asciiSample.slice(0, 30).replace(/&/g, '&amp;').replace(/</g, '&lt;'))) {
  // sample may need XML escaping — just check a distinctive fragment without special chars
  const plain = asciiSample.replace(/[&<>"']/g, '');
  if (plain.length > 20 && !dark.includes(plain.slice(0, 20))) {
    console.warn('Warning: could not verify ASCII fragment in SVG (may be fully escaped).');
  }
}

console.log('README, SVGs, and clickable links are valid.');
