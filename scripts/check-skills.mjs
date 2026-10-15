// Repo convention checks that complement the spec and Claude Code validators:
//   1. Every skills/<folder> name is lowercase with hyphens (Copilot and
//      Agent Skills rule) and matches the `name:` in its SKILL.md.
//   2. Every skill has a description.
//   3. Every skill is listed in at least one plugin in marketplace.json.
//   4. Every skill path in marketplace.json points to a real skill.
//
// Usage: npm run check

import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { isMain, listSkillDirs, listedSkills, readFrontmatter, readManifest, repoRoot } from './lib.mjs';

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function checkSkills() {
  const errors = [];
  const manifest = readManifest();
  const listed = listedSkills(manifest);
  const skills = listSkillDirs('skills');

  for (const dir of skills) {
    const folder = basename(dir);
    const file = `${dir}/SKILL.md`;

    if (!existsSync(join(repoRoot, file))) {
      errors.push(`${dir} has no SKILL.md`);
      continue;
    }

    const fm = readFrontmatter(join(repoRoot, file));
    if (!fm) {
      errors.push(`${file}: missing or malformed frontmatter (needs --- lines at the top)`);
      continue;
    }

    if (!NAME_PATTERN.test(folder)) {
      errors.push(`${dir}: folder name must be lowercase with hyphens (Copilot and Agent Skills rule)`);
    }
    if (fm.name !== folder) {
      errors.push(`${file}: name '${fm.name ?? ''}' does not match folder '${folder}'`);
    }
    if (!fm.description) {
      errors.push(`${file}: missing description`);
    }
    if (!listed.has(dir)) {
      errors.push(`${dir} is not listed in any plugin in .claude-plugin/marketplace.json`);
    }
  }

  for (const path of listed) {
    if (!existsSync(join(repoRoot, path, 'SKILL.md'))) {
      errors.push(`marketplace.json lists ${path} but ${path}/SKILL.md does not exist`);
    }
  }

  return { errors, count: skills.length };
}

if (isMain(import.meta.url)) {
  const { errors, count } = checkSkills();
  for (const e of errors) console.error(`error: ${e}`);
  if (errors.length) {
    console.error(`${errors.length} problem(s) found.`);
    process.exit(1);
  }
  console.log(count === 0 ? 'No skills yet. Structure checks out.' : `All ${count} skill(s) check out.`);
}
