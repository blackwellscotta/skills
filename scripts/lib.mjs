// Shared helpers for the repo scripts. Plain Node, no dependencies,
// works the same on Windows, macOS, and Linux.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const manifestPath = join(repoRoot, '.claude-plugin', 'marketplace.json');

// Repo helper skills live in the sandbox folder alongside any drafts.
export const SANDBOX_DIR = '.agents/skills';
export const HELPER_SKILLS = new Set(['add-skill']);

// Repo settings from package.json, under "skillsRepo".
//   sandbox: true   drafts are allowed in .agents/skills (private repo)
//   sandbox: false  only the helper is allowed there (public repo)
export function repoSettings() {
  const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
  return { sandbox: Boolean(pkg.skillsRepo?.sandbox) };
}

// Sandbox folders split into the repo helper(s) and drafts.
export function listSandbox() {
  const all = listSkillDirs(SANDBOX_DIR);
  return {
    helpers: all.filter((d) => HELPER_SKILLS.has(d.split('/').pop())),
    drafts: all.filter((d) => !HELPER_SKILLS.has(d.split('/').pop())),
  };
}

// Folders under `dir` (relative to `root`, this repo by default).
// Returns root-relative paths with forward slashes, e.g. "skills/deck-review".
export function listSkillDirs(dir, root = repoRoot) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((entry) => !entry.startsWith('.'))
    .filter((entry) => statSync(join(abs, entry)).isDirectory())
    .sort()
    .map((entry) => `${dir}/${entry}`);
}

// Minimal frontmatter reader: top-level `key: value` pairs, quoted values,
// and `>` / `|` block scalars. Enough for name and description; the full
// spec check is done by the Agent Skills reference validator.
export function readFrontmatter(skillMdPath) {
  const text = readFileSync(skillMdPath, 'utf8').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  if (lines[0] !== '---') return null;

  const end = lines.indexOf('---', 1);
  if (end === -1) return null;

  const data = {};
  let i = 1;
  while (i < end) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(lines[i]);
    if (!match) { i++; continue; }

    const [, key, raw] = match;
    let value = raw.trim();

    if (value === '>' || value === '|' || value === '>-' || value === '|-') {
      const block = [];
      i++;
      while (i < end && (lines[i].startsWith(' ') || lines[i] === '')) {
        block.push(lines[i].trim());
        i++;
      }
      value = block.join(value.startsWith('>') ? ' ' : '\n').trim();
      data[key] = value;
      continue;
    }

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    data[key] = value;
    i++;
  }
  return data;
}

export function readManifest() {
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

// Skill paths listed in any plugin, normalized to "skills/<name>".
export function listedSkills(manifest) {
  const listed = new Set();
  for (const plugin of manifest.plugins ?? []) {
    for (const skill of plugin.skills ?? []) {
      listed.add(skill.replace(/^\.\//, '').replace(/\/$/, ''));
    }
  }
  return listed;
}

// Quote one argument for the Windows command line when it needs it.
function quoteWin(arg) {
  const s = String(arg);
  if (s !== '' && !/[\s"&|<>^%()!]/.test(s)) return s;
  return `"${s.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1')}"`;
}

// On Windows, tools installed by npm or pip are .cmd/.exe shims, so they have
// to run through the shell. Build the command line ourselves rather than
// passing an args array with `shell: true`, which newer Node versions warn
// about. Elsewhere, run the program directly with no shell.
function spawnTool(command, args, stdio) {
  const options = { cwd: repoRoot, stdio };
  if (process.platform === 'win32') {
    const line = [command, ...args].map(quoteWin).join(' ');
    return spawnSync(line, { ...options, shell: true });
  }
  return spawnSync(command, args, options);
}

// Run a command from the repo root, streaming its output.
export function run(command, args = [], { quiet = false } = {}) {
  const result = spawnTool(command, args, quiet ? 'ignore' : 'inherit');
  if (result.error && result.error.code === 'ENOENT') return { found: false, ok: false };
  // On Windows the shell reports a missing command as exit code 1 with a
  // "not recognized" message, so check availability separately with `has`.
  return { found: true, ok: result.status === 0 };
}

// True if `command` is available on PATH.
export function has(command, args = ['--version']) {
  const result = spawnTool(command, args, 'ignore');
  return !result.error && result.status === 0;
}

export const isMain = (metaUrl) => resolve(fileURLToPath(metaUrl)) === resolve(process.argv[1] ?? '');
