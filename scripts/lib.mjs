// Shared helpers for the repo scripts. Plain Node, no dependencies,
// works the same on Windows, macOS, and Linux.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const manifestPath = join(repoRoot, '.claude-plugin', 'marketplace.json');

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

// Run a command from the repo root, streaming its output. On Windows,
// commands installed by npm or pip are .cmd/.exe shims, so go through the shell.
export function run(command, args = [], { quiet = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: quiet ? 'ignore' : 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error && result.error.code === 'ENOENT') return { found: false, ok: false };
  // On Windows the shell reports a missing command as exit code 1 with a
  // "not recognized" message, so check availability separately with `has`.
  return { found: true, ok: result.status === 0 };
}

// True if `command` is available on PATH.
export function has(command, args = ['--version']) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  return !result.error && result.status === 0;
}

export const isMain = (metaUrl) => resolve(fileURLToPath(metaUrl)) === resolve(process.argv[1] ?? '');
