// Run every validation this repo uses, locally or in CI.
//
//   1. Repo conventions           scripts/check-skills.mjs
//   2. Agent Skills spec          the spec's reference validator (skills-ref),
//                                 the standard GitHub Copilot implements; runs
//                                 on skills/, the repo helper, and sandbox
//                                 drafts (drafts only warn, never fail)
//   3. Claude Code                claude plugin validate . --strict
//   4. GitHub Copilot (advisory)  gh skill publish --dry-run
//
// Checks 1 to 3 must pass. Check 4 runs when GitHub CLI 2.90+ is installed
// and reports problems without failing the run, because `gh skill` is in
// public preview and also checks repo settings (tag protection, secret
// scanning) unrelated to the skills. Set STRICT_COPILOT=1 to enforce it.
//
// While no skills are published yet, check 3 runs without --strict (an
// empty marketplace is a warning) and check 4 is skipped.
//
// Requirements:
//   pip install skills-ref                     the spec validator
//   npm install -g @anthropic-ai/claude-code   the claude CLI
//   GitHub CLI 2.90 or later                   optional, for check 4
//
// Usage: npm run validate

import { checkSkills } from './check-skills.mjs';
import { has, listSandbox, listSkillDirs, repoSettings, run } from './lib.mjs';

let failed = false;
const section = (title) => console.log(`\n== ${title}`);
const missing = (what, install) => {
  console.error(`error: ${what} not found. Install with: ${install}`);
  failed = true;
};

const published = listSkillDirs('skills');
const { helpers, drafts } = listSandbox();
// In the public repo, drafts are already a repo-convention error, so only
// check them against the spec where a sandbox is allowed.
const sandboxDrafts = repoSettings().sandbox ? drafts : [];

// 1. Repo conventions
section('Repo conventions');
{
  const { errors, count } = checkSkills();
  for (const e of errors) console.error(`error: ${e}`);
  if (errors.length) failed = true;
  else console.log(count === 0 ? 'No skills yet. Structure checks out.' : `All ${count} skill(s) check out.`);
}

// 2. Agent Skills spec
section('Agent Skills spec');
{
  // The validator installs as `agentskills`. On Windows its folder is often
  // not on PATH, so fall back to running the module through Python.
  const runners = [
    ['agentskills', []],
    ['python', ['-m', 'skills_ref.cli']],
    ['python3', ['-m', 'skills_ref.cli']],
    ['py', ['-m', 'skills_ref.cli']],
  ];
  const runner = runners.find(([cmd, pre]) => has(cmd, [...pre, '--help']));

  if (!runner) {
    missing('Agent Skills validator (skills-ref)', 'pip install skills-ref');
  } else {
    const [cmd, pre] = runner;
    for (const dir of [...published, ...helpers]) {
      if (!run(cmd, [...pre, 'validate', dir]).ok) failed = true;
    }
    for (const dir of sandboxDrafts) {
      if (!run(cmd, [...pre, 'validate', dir]).ok) {
        console.warn(`warning: draft ${dir} has spec problems (drafts don't fail validation; fix before graduating)`);
      }
    }
    if (published.length === 0) console.log('No published skills yet.');
  }
}

// 3. Claude Code
section('Claude Code');
if (!has('claude')) {
  missing('claude CLI', 'npm install -g @anthropic-ai/claude-code');
} else {
  const args = ['plugin', 'validate', '.'];
  if (published.length > 0) args.push('--strict');
  if (!run('claude', args).ok) failed = true;
}

// 4. GitHub Copilot (advisory)
section('GitHub Copilot');
if (published.length === 0) {
  console.log('skipped: no published skills yet');
} else if (!has('gh', ['skill', '--help'])) {
  console.log("skipped: needs GitHub CLI 2.90 or later with 'gh skill' (run: gh upgrade, or winget upgrade GitHub.cli)");
} else if (run('gh', ['skill', 'publish', '--dry-run']).ok) {
  console.log('Copilot check passed.');
} else if (process.env.STRICT_COPILOT === '1') {
  failed = true;
} else {
  console.warn('warning: gh skill publish --dry-run reported problems (advisory; set STRICT_COPILOT=1 to enforce)');
}

console.log();
if (failed) {
  console.error('Validation failed.');
  process.exit(1);
}
console.log('All validations passed.');
