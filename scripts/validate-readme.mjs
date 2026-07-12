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
  'Choch Kimhour',
  'Backend Developer',
  'linkedin.com/in/choch-kimhour',
  'https://www.linkedin.com/in/choch-kimhour',
  'chochkimhour.github.io/my-portfolio',
  'https://chochkimhour.github.io/my-portfolio',
  'npmjs.com/~chochkimhour',
  'https://www.npmjs.com/~chochkimhour',
];

const requiredTemplateText = [
  '{{PROFILE_NAME}}',
  '{{PROFILE_TITLE}}',
  '{{PROFILE_TAGLINE}}',
  '{{GITHUB_USERNAME}}',
  '{{LINKEDIN_URL}}',
  '{{PORTFOLIO_URL}}',
  '{{NPM_URL}}',
];

if (/\{\{[A-Z0-9_]+\}\}/.test(readme)) {
  throw new Error('README.md contains unreplaced template variables.');
}

// No image-based profile card
if (/<img\b/i.test(readme) || /dark_mode\.(png|svg)/i.test(readme) || /light_mode\.(png|svg)/i.test(readme)) {
  throw new Error('README.md must not include profile images (png/svg/img tags).');
}

// Links must be real markdown links (clickable)
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

console.log('README structure and clickable links are valid.');
