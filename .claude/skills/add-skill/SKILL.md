---
name: add-skill
description: Add a new skill to this skills repository using its conventions. Use when the user asks to create, add, or scaffold a skill in this repo, or to move a skill in from another repo.
---

# Add Skill

Creates a new skill in this repository so it follows the repo layout, gets registered in the marketplace, and passes validation.

## Steps

1. **Pick the name.** Lowercase, hyphen-separated, short (for example `deck-review`). Check that `skills/<name>/` does not already exist.

2. **Copy the template.** Copy `template/` to `skills/<name>/`.

3. **Write SKILL.md.**
   - Set `name:` in the frontmatter to exactly the folder name.
   - Write a `description:` that says what the skill does and when to use it. Be specific about trigger situations; this is the only line the agent sees before loading the skill.
   - Replace the body with real instructions. Keep SKILL.md focused. Move long material into `references/` and link to it.

4. **Remove what isn't needed.** Delete any empty optional folders (`scripts/`, `references/`, `assets/`).

5. **Register it.** Add `./skills/<name>` to the `skills` array of the right plugin in `.claude-plugin/marketplace.json`. If no existing plugin fits, ask the user whether to create a new plugin group, then add an entry with `"source": "./"` and `"strict": false`.

6. **Check for private details.** This may be a public repo. Before finishing, scan the new skill for hardcoded IDs, tenant or account names, internal URLs, customer names, or email addresses. Remove anything environment-specific, or rewrite the step so the skill asks the user for the value.

7. **Validate.** Run `npm run validate` from the repo root. It checks repo conventions, the Agent Skills spec (which GitHub Copilot follows), Claude Code's plugin rules, and, when GitHub CLI 2.90+ is installed, `gh skill publish --dry-run`. Fix anything it reports.

8. **Update the README.** In the Skills section of `README.md`, add the skill: its name linked to its `SKILL.md`, the plugin it belongs to, and one line on what it does. Replace "No skills published yet." if it's still there.

## Moving a skill in from another repo

Copy the folder rather than moving git history. Then run steps 3 through 8 on it, paying extra attention to step 6.
