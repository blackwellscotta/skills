---
name: add-skill
description: Add a finished skill to this public skills repo, or work on a new version of one. Use when the user asks to add, publish, or bring in a skill in this repo, or to start a new version (v2) of a published skill.
---

# Add Skill

This is the **public** repo. Only finished skills go here, in `skills/`, and everything pushed is visible to anyone.

Drafts and experiments belong in the private repo's sandbox (`.agents/skills/` in `blackwellscotta/skills-private`), where they stay out of sight until they're ready. If the user wants to start a new skill or experiment with an idea, suggest doing it there instead. Never put drafts in this repo's `.agents/skills/` folder; it holds only this helper, and validation fails if anything else appears there.

These steps add a finished skill so it follows the repo layout, gets registered in the marketplace, and passes validation.

## Steps

1. **Pick the name.** Lowercase, hyphen-separated, short (for example `deck-review`). Check that `skills/<name>/` does not already exist.

2. **Copy the template.** Copy `template/` to `skills/<name>/`.

3. **Write SKILL.md.**
   - Set `name:` in the frontmatter to exactly the folder name.
   - Write a `description:` that says what the skill does and when to use it. Be specific about trigger situations; this is the only line the agent sees before loading the skill.
   - Replace the body with real instructions. Keep SKILL.md focused. Move long material into `references/` and link to it.

4. **Remove what isn't needed.** Delete any empty optional folders (`scripts/`, `references/`, `assets/`).

5. **Register it.** Add `./skills/<name>` to the `skills` array of the right plugin in `.claude-plugin/marketplace.json`. If no existing plugin fits, ask the user whether to create a new plugin group, then add an entry with `"source": "./"` and `"strict": false`.

6. **Check for private details.** This repo is public. Before finishing, scan the new skill for hardcoded IDs, tenant or account names, internal URLs, customer or partner names, email addresses, and references to internal documents. Remove anything environment-specific, or rewrite the step so the skill asks the user for the value. Show the user anything you're unsure about rather than deciding alone.

7. **Validate.** Run `npm run validate` from the repo root. It checks repo conventions, the Agent Skills spec (which GitHub Copilot follows), Claude Code's plugin rules, and, when GitHub CLI 2.90+ is installed, `gh skill publish --dry-run`. Fix anything it reports.

8. **Update the README.** In the Skills section of `README.md`, add the skill: its name linked to its `SKILL.md`, the plugin it belongs to, and one line on what it does. Replace "No skills published yet." if it's still there.

9. **Stop for review.** Let the user review the changes before anything is committed or pushed, then remind them to run `npm run sync` so the skill is active everywhere.

## Moving a skill in from another repo

Copy the folder rather than moving git history. Then run steps 3 through 9 on it, paying extra attention to step 6.

## Working on a new version of a published skill

Every skill has one home. For a skill in this repo's `skills/`, new versions are made here, on a git branch, never as a copy with the same name somewhere else.

1. **Confirm the skill exists** in `skills/<name>/`. If it's actually in the private repo, tell the user to open that repo instead.
2. **Create a branch** from an up-to-date `main`: `git switch main`, `git pull`, then `git switch -c <name>-v2`. Tell the user that while this branch is checked out, their own agents use the new version (`npm run sync` links point at these files), and everyone else still gets the version on `main`.
3. **Edit the skill in place** in `skills/<name>/`. Don't copy it, rename it, or change its `name:`.
4. **Run `npm run validate`** and fix anything it reports.
5. **Don't push the branch** unless the user asks. Branches pushed to this repo are public.
6. **When the user says it's ready:** stop and let them review the changes. When they approve, merge the branch into `main`, push `main`, and delete the branch.
7. **To go back to the published version** at any point, switch to `main`. The user's agents follow.

If the user wants a big experimental rethink rather than an update, suggest doing it in the private repo's sandbox under a temporary name like `<name>-next`, so the two versions never collide.
