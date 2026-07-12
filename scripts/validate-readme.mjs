import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readmeFile = resolve(rootDir, 'README.md');
const templateFile = resolve(rootDir, 'README.template.md');
const darkPng = resolve(rootDir, 'assets/dark_mode.png');
const lightPng = resolve(rootDir, 'assets/light_mode.png');
const avatar = resolve(rootDir, 'assets/avatar.png');

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

for (const [path, label] of [
  [darkPng, 'assets/dark_mode.png'],
  [lightPng, 'assets/light_mode.png'],
  [avatar, 'assets/avatar.png'],
]) {
  if (!existsSync(path)) {
    throw new Error(`${label} is missing.`);
  }
}

const requiredReadmeText = [
  'assets/dark_mode.png',
  'assets/light_mode.png',
  'Choch Kimhour',
  'Backend Developer',
];

const requiredTemplateText = [
  '{{PROFILE_NAME}}',
  '{{PROFILE_TITLE}}',
  '{{PROFILE_TAGLINE}}',
  '{{GITHUB_USERNAME}}',
  '{{GITHUB_URL}}',
  'assets/dark_mode.png',
  'assets/light_mode.png',
];

if (/\{\{[A-Z0-9_]+\}\}/.test(readme)) {
  throw new Error('README.md contains unreplaced template variables.');
}

if (/##\s+(Tech Stack|Projects|Experience|Connect)/i.test(readme)) {
  throw new Error(
    'README.md should not include Tech Stack / Projects / Experience / Connect sections (data lives in the card image).',
  );
}

assertIncludes(readme, 'README.md', requiredReadmeText);
assertIncludes(template, 'README.template.md', requiredTemplateText);

console.log('README structure, card images, and template are valid.');
