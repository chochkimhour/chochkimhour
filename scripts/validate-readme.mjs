import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readmeFile = resolve(rootDir, 'README.md');
const templateFile = resolve(rootDir, 'README.template.md');
const darkSvg = resolve(rootDir, 'assets/dark_mode.svg');
const lightSvg = resolve(rootDir, 'assets/light_mode.svg');
const asciiFile = resolve(rootDir, 'assets/portrait_ascii.txt');

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
readRequiredFile(asciiFile, 'assets/portrait_ascii.txt');

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

const requiredSvgText = [
  'choch@kimhour',
  'Backend Developer',
  'Ecoinsoft Solutions',
  'chochkimhour2303@gmail.com',
];

if (/\{\{[A-Z0-9_]+\}\}/.test(readme)) {
  throw new Error('README.md contains unreplaced template variables.');
}

// SVG-only profile: no extra markdown sections below the picture
if (/##\s+(Tech Stack|Projects|Experience|Connect)/i.test(readme)) {
  throw new Error('README.md should not include Tech Stack / Projects / Experience / Connect sections (data lives in the SVG).');
}

assertIncludes(readme, 'README.md', requiredReadmeText);
assertIncludes(template, 'README.template.md', requiredTemplateText);
assertIncludes(dark, 'assets/dark_mode.svg', requiredSvgText);
assertIncludes(light, 'assets/light_mode.svg', requiredSvgText);

console.log('README structure, SVGs, and template are valid.');
