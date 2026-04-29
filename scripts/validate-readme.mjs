import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readmeFile = resolve(rootDir, 'README.md');

if (!existsSync(readmeFile)) {
  throw new Error('README.md is missing.');
}

const readme = readFileSync(readmeFile, 'utf8');
const requiredText = [
  'Backend Developer',
  'Clean backend systems',
  'Tech Stack',
  'Featured Projects / npm Packages',
  'GitHub Stats',
  'Connect With Me',
];

const missingText = requiredText.filter((text) => !readme.includes(text));

if (missingText.length > 0) {
  throw new Error(`README.md is missing required sections: ${missingText.join(', ')}`);
}

if (/\{\{[A-Z0-9_]+\}\}/.test(readme)) {
  throw new Error('README.md contains unreplaced template variables.');
}

console.log('README.md structure is valid.');
