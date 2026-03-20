# txtskills CLI

A command-line interface for converting `llms.txt` documentation into installable agent skills and managing skills from the txtskills registry.

The CLI also includes an interactive mode and is useful for scripting.

---

## What is this?

`txtskills` CLI can do three things:

1. Convert docs into publishable skills.
2. Install skills into your local/global AI agent setup.
3. Discover, search, list, and remove registry skills.

It wraps the `skills` CLI for installs and removals, then adds discovery/conversion tooling tailored to txtskills.

---

## Quick start

Run directly without install:

```bash
npx txtskills
```

That starts an interactive prompt when no command is provided.

For a one-liner install:

```bash
npx txtskills add <skill-name>
```

---

## Commands

### `txtskills add [skill-name]`

Install a skill from the registry.

```bash
npx txtskills add next-js
npx txtskills add ai-sdk --global
npx txtskills add tailwind-css -y
```

Options:

- `-r, --repo <owner/repo>`: use a custom registry repo (default: `hk-vk/skills`)
- `-g, --global`: install globally instead of project scope
- `-a, --agent <agents...>`: target specific agents (e.g., `claude-code`, `cursor`)
- `-y, --yes`: skip confirmation prompts

If no skill name is provided, the CLI shows a searchable selector.

### `txtskills list` (alias: `ls`)

List available skills.

```bash
npx txtskills list
npx txtskills ls
npx txtskills list --json
```

Options:

- `-r, --repo <owner/repo>`: use custom registry repo
- `--json`: output JSON

### `txtskills search [query]` (alias: `find`)

Find skills by name/description, then choose one to install.

```bash
npx txtskills search react
npx txtskills find "llm"
```

Options:

- `-r, --repo <owner/repo>`: use custom registry repo

### `txtskills convert [url]`

Convert a docs URL or `llms.txt` URL directly into a publishable skill.

If URL is omitted, you are prompted for it.

```bash
npx txtskills convert github.com/llms.txt
npx txtskills convert docs.anthropic.com
npx txtskills convert docs.python.org --name python-docs
npx txtskills convert docs.python.org --install
npx txtskills convert docs.python.org --skip-install
npx txtskills convert docs.python.org --json
npx txtskills convert docs.python.org --api https://txtskills.hari.works
```

Convert options:

- `--api <url>`: override API base URL (or pass full `/api/convert` endpoint)
- `-n, --name <skill-name>`: set a custom skill name (lowercase + hyphens)
- `-f, --force`: force regeneration if the skill already exists
- `--json`: print full JSON response
- `--install`: auto-install after successful conversion
- `--skip-install`: skip the install prompt
- `-g, --global`: install globally when using `--install`
- `-a, --agent <agents...>`: target specific agents when auto-installing
- `-y, --yes`: skip prompts where applicable

Default behavior:

- Tries common `llms.txt` URL variants from the input
- Shows the resolved URL it used when it differs from your input
- Prints generated install command when `--json` is not used
- Prompts to install unless `--skip-install`
- Publishes to GitHub unless that step fails (you can still install from output)

### `txtskills remove [skills...]` (alias: `rm`)

Remove installed skills (wrapped from `skills` CLI).

```bash
npx txtskills remove <skill-name>
npx txtskills rm <skill-name>
```

Options:

- `-g, --global`: remove globally
- `-a, --agent <agents...>`: remove only from selected agents (`*` allowed)
- `-s, --skill <pattern>`: remove by pattern (`*` for all)
- `-y, --yes`: skip confirmation prompts
- `--all`: remove all skills from all agents

Alias: `rm`

---

## Usage patterns

### 1) Discover + install workflow

```bash
npx txtskills search docker
npx txtskills add docker
```

### 2) Convert then install in one command

```bash
npx txtskills convert https://docs.example.com/llms.txt --install --global -y
```

### 3) Convert in scripts / automation

```bash
npx txtskills convert docs.example.com --json --skip-install > conversion.json
```

---

## Compatibility

- [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview)
- [Cursor](https://cursor.com)
- [Windsurf](https://windsurf.com)
- [GitHub Copilot](https://github.com/features/copilot)
- [Amp](https://amp.dev)
- [Antigravity](https://antigravity.dev)
- Any agent supporting the [Agent Skills](https://agentskills.io) format

---

## Links

- Website: [txtskills.hari.works](https://txtskills.hari.works)
- Web app: [txtskills.hari.works](https://txtskills.hari.works)
- Browse skills: [txtskills.hari.works/skills](https://txtskills.hari.works/skills)
- GitHub: [github.com/hk-vk/txtskills](https://github.com/hk-vk/txtskills)
- Skills registry: [github.com/hk-vk/skills](https://github.com/hk-vk/skills)
- `llms.txt` standard: [llmstxt.org](https://llmstxt.org/)
- Agent Skills format: [agentskills.io](https://agentskills.io)

---

## License

MIT
