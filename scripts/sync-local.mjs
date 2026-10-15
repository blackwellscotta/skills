// Link every skill in one or more skills repos into your local skills
// folders, so edits in the repo are live in Claude Code, Copilot, and other
// agents without reinstalling.
//
// On Windows this creates directory junctions, which need no admin rights
// or Developer Mode. On macOS and Linux it creates symlinks.
//
// Usage:
//   npm run sync                                          this repo only
//   npm run sync -- C:\src\skills-private C:\src\work-skills
//                                                         this repo plus others
//
// Targets (override with SKILL_TARGETS, separated by ; on Windows or : elsewhere):
//   ~/.claude/skills   read by Claude Code and GitHub Copilot
//   ~/.agents/skills   vendor-neutral location read by several agents
//
// If two repos have a skill with the same name (common while promoting a
// skill from private to public), the first repo listed wins and you get a
// warning. If an existing link points at a different copy, it is relinked
// and you get a warning saying which copy it now points to.

import { existsSync, lstatSync, mkdirSync, readlinkSync, symlinkSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, delimiter, join, resolve } from 'node:path';
import { listSkillDirs, repoRoot } from './lib.mjs';

const targets = process.env.SKILL_TARGETS
  ? process.env.SKILL_TARGETS.split(delimiter).filter(Boolean)
  : [join(homedir(), '.claude', 'skills'), join(homedir(), '.agents', 'skills')];

const repos = [repoRoot, ...process.argv.slice(2).map((p) => resolve(p))];
const linkType = process.platform === 'win32' ? 'junction' : 'dir';

let linked = 0;
let skipped = 0;
const seen = new Map(); // skill name -> path of the copy being linked

for (const target of targets) mkdirSync(target, { recursive: true });

for (const repo of repos) {
  if (!existsSync(join(repo, 'skills'))) {
    console.warn(`skip: ${repo} has no skills folder`);
    continue;
  }

  for (const rel of listSkillDirs('skills', repo)) {
    const skill = join(repo, rel);
    if (!existsSync(join(skill, 'SKILL.md'))) continue;

    const name = basename(skill);
    if (seen.has(name)) {
      console.warn(`duplicate: '${name}' exists in more than one repo. Using ${seen.get(name)}, ignoring ${skill}`);
      skipped++;
      continue;
    }
    seen.set(name, skill);

    for (const target of targets) {
      const dest = join(target, basename(skill));
      let stat = null;
      try { stat = lstatSync(dest); } catch { /* nothing there yet */ }

      if (stat && !stat.isSymbolicLink()) {
        console.warn(`skip: ${dest} exists and is not a link; leaving it alone`);
        skipped++;
        continue;
      }
      if (stat) {
        const current = resolve(readlinkSync(dest));
        if (current === resolve(skill)) { linked++; continue; }
        console.warn(`relinked: ${dest} pointed to ${current}, now points to ${skill}`);
        unlinkSync(dest);
      }
      symlinkSync(skill, dest, linkType);
      linked++;
    }
  }
}

console.log(`Linked ${linked}, skipped ${skipped}.`);
