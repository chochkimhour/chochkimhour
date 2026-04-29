import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

const getArgValue = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const checkOnly = args.includes('--check');
const dryRun = args.includes('--dry-run');
const envFile = resolve(rootDir, getArgValue('--env', '.env'));
const templateFile = resolve(rootDir, 'README.template.md');
const outputFile = resolve(rootDir, getArgValue('--output', 'README.md'));

const parseEnv = (content) => {
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
};

if (!existsSync(envFile)) {
  throw new Error(`Missing env file: ${envFile}`);
}

const env = parseEnv(readFileSync(envFile, 'utf8'));
const requiredKeys = [
  'PROFILE_NAME',
  'PROFILE_TITLE',
  'PROFILE_TAGLINE',
  'GITHUB_USERNAME',
  'GITHUB_URL',
  'NPM_URL',
  'LINKEDIN_URL',
  'EMAIL',
];

const missingKeys = requiredKeys.filter((key) => !env[key]);

if (missingKeys.length > 0) {
  throw new Error(`Missing required env values: ${missingKeys.join(', ')}`);
}

const template = readFileSync(templateFile, 'utf8');
const readme = template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => {
  if (!(key in env)) {
    throw new Error(`Missing template value: ${key}`);
  }

  return env[key];
});

if (dryRun) {
  console.log('README template generated successfully.');
} else if (checkOnly) {
  const currentReadme = existsSync(outputFile) ? readFileSync(outputFile, 'utf8') : '';

  if (currentReadme !== readme) {
    throw new Error('README.md is out of date. Run `npm run generate` and commit the result.');
  }

  console.log('README.md is up to date.');
} else {
  writeFileSync(outputFile, readme);
  console.log('README.md generated successfully.');
}
