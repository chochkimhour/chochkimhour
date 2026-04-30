import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readmeFile = resolve(rootDir, 'README.md');
const templateFile = resolve(rootDir, 'README.template.md');

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

const requiredReadmeText = [
  "Hello, I'm",
  'Backend Developer',
  'Tech Stack',
  'Featured Projects / npm Packages',
  'api-core-backend',
  'khmer-chhankitek-calendar',
  'init-backend-project',
  'A clean backend utility package',
  'A Khmer calendar package',
  'A CLI scaffolding tool',
  'GitHub Stats',
  'Connect With Me',
  'assets/coding-banner.gif',
];

const requiredTemplateText = [
  '{{PROFILE_NAME}}',
  '{{PROFILE_TITLE}}',
  '{{PROFILE_TAGLINE}}',
  '{{GITHUB_USERNAME}}',
  '{{GITHUB_URL}}',
  '{{NPM_URL}}',
  '{{LINKEDIN_URL}}',
  '{{EMAIL}}',
];

if (/\{\{[A-Z0-9_]+\}\}/.test(readme)) {
  throw new Error('README.md contains unreplaced template variables.');
}

if (/No description provided/i.test(`${readme}\n${template}`)) {
  throw new Error('Project cards must include real descriptions.');
}

assertIncludes(readme, 'README.md', requiredReadmeText);
assertIncludes(template, 'README.template.md', requiredTemplateText);

console.log('README structure and template are valid.');
