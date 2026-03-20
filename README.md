# txtskills

Convert any `llms.txt` documentation into installable agent skills.

<div align="center">
  <img src="apps/web/public/mockup.png" alt="txtskills mockup" width="500" />
</div>

Generated skills are saved to [hk-vk/skills](https://github.com/hk-vk/skills).

---

## What this repo contains

- `apps/web`: Next.js web app (`txtskills.hari.works`)
- `packages/cli`: `txtskills` CLI for conversion and skill management
- `packages/ui`: shared UI components

---

## 3 ways to use txtskills

The app now exposes three usage modes, matching the UI nav:

1. **Convert (Web)** → `https://txtskills.hari.works/`
2. **CLI** → `https://txtskills.hari.works/cli`
3. **Agent Skill** → `https://txtskills.hari.works/agent-skill`

### 1. Convert in the browser (Web)

Visit **[txtskills.hari.works](https://txtskills.hari.works)** and use the Convert flow:

- Paste a docs URL (or paste raw content)
- Generate a publishable skill
- Copy install command instantly

### 2. Convert & manage with CLI

See `packages/cli/README.md` for the complete command reference.

```bash
# Install one skill from the registry
npx txtskills add <skill-name>

# Convert docs URL -> skill
npx txtskills convert docs.example.com

# Convert and auto-install
npx txtskills convert docs.example.com --install

# Search and list
npx txtskills search react
npx txtskills list

# Remove installed skills
npx txtskills remove <skill-name>
```

### 3. Use as an agent skill

For agent workflows that only need a CLI-native experience:

- Install the conversion workflow skill:

```bash
npx skills add hk-vk/txtskills --skill txtskills-llms-to-agent-skills
```

- Use that skill in your coding agent to discover `llms.txt` and generate an agent skill.

---

## Quick CLI tips

The CLI supports these commands:

- `add` – install a skill
- `list` – browse available registry skills
- `search` – find skills by name (alias: `find`)
- `convert` – convert docs URL/`llms.txt` into a publishable skill
- `remove` – remove installed skills (alias: `rm`)

Run without arguments to open an interactive prompt:

```bash
npx txtskills
```

No terminal setup required.

## Links

- Website: https://txtskills.hari.works
- Skills browser: https://txtskills.hari.works/skills
- Skills registry: https://github.com/hk-vk/skills
- llms.txt standard: https://llmstxt.org/
- Agent Skills format: https://agentskills.io
