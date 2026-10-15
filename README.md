# Agent Skills by Scott Blackwell

Skills for AI agents, written in the open [Agent Skills](https://agentskills.io) format. Each skill is a folder with a `SKILL.md`, so the same skill works in Claude Code, the Claude apps, GitHub Copilot, and other agents that support the standard.

## Skills

No skills published yet.

## Install

**Claude Code.** Skills are grouped into plugins. Install a plugin in one step (Claude Code 2.1.275 or later):

```
/plugin install <plugin> --marketplace blackwellscotta/skills
```

Or add the marketplace first, then install from it:

```
/plugin marketplace add blackwellscotta/skills
/plugin install <plugin>@blackwellscotta-skills
```

**GitHub Copilot.** With GitHub CLI 2.90 or later:

```
gh skill install blackwellscotta/skills <skill>
```

Or copy any folder under `skills/` into `~/.copilot/skills` (personal) or `.github/skills` (one project).

**Other agents.** Copy any folder under `skills/` into your agent's skills directory. Many agents read `~/.agents/skills`.

**Claude apps.** Clone the repo, run `npm run package`, and upload the zip from `dist/` in Settings.

## Working on this repo

### Layout

```
.claude-plugin/marketplace.json   groups skills into installable plugins
skills/<name>/SKILL.md            one folder per published skill
.agents/skills/add-skill/         repo helper skill (not published)
template/                         starting point for a new skill
scripts/                          Node scripts, run with npm
```

### Adding a skill

1. Copy `template/` to `skills/<name>/` and set `name:` to match the folder.
2. Add `./skills/<name>` to a plugin in `.claude-plugin/marketplace.json`.
3. Add it to the Skills section above.
4. Run `npm run validate`.

Or, with this repo open in VS Code, ask Copilot (in Agent mode) to add the skill. The `add-skill` helper in `.agents/skills/` walks it through these steps.

Only finished skills go here. Drafts and experiments live in the private repo's sandbox until they're ready, and validation fails if anything besides the helper shows up in this repo's `.agents/skills/`.

### Commands

Requires Node 20 or later. The scripts have no dependencies, so there's nothing to `npm install`.

| Command | What it does |
|---|---|
| `npm run validate` | Runs every check below |
| `npm run check` | Repo convention checks only |
| `npm run sync` | Links every skill into `~/.claude/skills` and `~/.agents/skills` so edits are live without reinstalling. Uses junctions on Windows, so no admin rights needed. Add other repos with `npm run sync -- <path> <path>` |
| `npm run package` | Zips skills into `dist/` for upload to the Claude apps |

### Validation

`npm run validate` runs on every push and pull request, on both Windows and Linux.

| Check | Tool | Blocking |
|---|---|---|
| Repo conventions: lowercase-hyphen names, folder matches `name:`, every skill registered | `npm run check` | Yes |
| Agent Skills spec, the standard GitHub Copilot implements | `skills-ref` reference validator | Yes |
| Claude Code marketplace and plugins | `claude plugin validate . --strict` | Yes |
| GitHub Copilot publish check | `gh skill publish --dry-run` (GitHub CLI 2.90+) | Advisory |

The Copilot check is advisory because `gh skill` is in preview and also flags repo settings such as tag protection. Set `STRICT_COPILOT=1` to make it blocking.

To run every check locally, install the validators once:

```
pip install skills-ref
npm install -g @anthropic-ai/claude-code
```

## License

Apache License 2.0. See [LICENSE](LICENSE).
