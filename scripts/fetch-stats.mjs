/**
 * Fetch live GitHub stats into assets/github-stats.json for the card generators.
 *
 * Token: GITHUB_TOKEN env, else `gh auth token`. Without a token only the REST
 * fields refresh; commits/contributions keep their previous values.
 *
 * Usage: node scripts/fetch-stats.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(rootDir, 'assets/github-stats.json');
const user = process.env.GITHUB_USERNAME || 'chochkimhour';

const resolveToken = () => {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execSync('gh auth token', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null;
  } catch {
    return null;
  }
};

const token = resolveToken();
const headers = { 'User-Agent': 'profile-card-generator', Accept: 'application/vnd.github+json' };
if (token) headers.Authorization = `Bearer ${token}`;

const getJson = async (url, init = {}) => {
  const res = await fetch(url, { headers, ...init });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
};

const fetchRest = async () => {
  const u = await getJson(`https://api.github.com/users/${user}`);
  let stars = 0;
  for (let page = 1; ; page++) {
    const repos = await getJson(`https://api.github.com/users/${user}/repos?per_page=100&type=owner&page=${page}`);
    stars += repos.reduce((sum, r) => sum + (r.fork ? 0 : r.stargazers_count), 0);
    if (repos.length < 100) break;
  }
  return {
    repos: u.public_repos,
    stars,
    followers: u.followers,
    following: u.following,
    createdAt: u.created_at,
  };
};

const graphql = (query, variables) =>
  getJson('https://api.github.com/graphql', {
    method: 'POST',
    body: JSON.stringify({ query, variables }),
  }).then((r) => {
    if (r.errors) throw new Error(r.errors.map((e) => e.message).join('; '));
    return r.data;
  });

// contributionsCollection spans at most one year, so walk each year since sign-up.
const fetchContributions = async (createdAt) => {
  const query = `query($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        totalCommitContributions
        contributionCalendar { totalContributions }
      }
    }
  }`;
  const now = new Date();
  let commits = 0;
  for (let from = new Date(createdAt); from < now; ) {
    const to = new Date(Math.min(now, new Date(from).setFullYear(from.getFullYear() + 1)));
    const data = await graphql(query, { login: user, from: from.toISOString(), to: to.toISOString() });
    const c = data.user.contributionsCollection;
    commits += c.totalCommitContributions;
    from = to;
  }
  const lastYear = new Date(now);
  lastYear.setFullYear(now.getFullYear() - 1);
  const recent = await graphql(query, { login: user, from: lastYear.toISOString(), to: now.toISOString() });
  return { commits, contributions: recent.user.contributionsCollection.contributionCalendar.totalContributions };
};

const previous = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : {};
let stats = { ...previous };

try {
  stats = { ...stats, ...(await fetchRest()) };
  if (token) {
    stats = { ...stats, ...(await fetchContributions(stats.createdAt)) };
  } else {
    console.warn('No GITHUB_TOKEN or gh login; keeping previous commits/contributions.');
  }
} catch (err) {
  console.warn(`GitHub stats fetch failed (${err.message}); keeping previous values.`);
}

writeFileSync(outPath, `${JSON.stringify(stats, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outPath}`, stats);
