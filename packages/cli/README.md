# txtskills

Install agent skills from the [txtskills](https://txtskills.hari.works) registry.

## What are Agent Skills?

A simple, open format for giving agents new capabilities and expertise.

Agent Skills are folders of instructions, scripts, and resources that agents can discover and use to do things more accurately and efficiently.

### Why Agent Skills?

Agents are increasingly capable, but often don't have the context they need to do real work reliably. Skills solve this by giving agents access to procedural knowledge and company-, team-, and user-specific context they can load on demand. Agents with access to a set of skills can extend their capabilities based on the task they're working on.

- **For skill authors:** Build capabilities once and deploy them across multiple agent products.
- **For compatible agents:** Support for skills lets end users give agents new capabilities out of the box.
- **For teams and enterprises:** Capture organizational knowledge in portable, version-controlled packages.

### What can Agent Skills enable?

- **Domain expertise:** Package specialized knowledge into reusable instructions, from legal review processes to data analysis pipelines.
- **New capabilities:** Give agents new capabilities (e.g. creating presentations, building MCP servers, analyzing datasets).
- **Repeatable workflows:** Turn multi-step tasks into consistent and auditable workflows.
- **Interoperability:** Reuse the same skill across different agents and tools.

## Install a skill

```bash
npx txtskills add <skill-name>
```

For example:

```bash
npx txtskills add ai-sdk
npx txtskills add next-js
npx txtskills add tailwind-css
```

## Browse available skills

```bash
npx txtskills list
```

Or browse online at [txtskills.hari.works/skills](https://txtskills.hari.works/skills).

## Search for a skill

```bash
npx txtskills search react
```

## Remove a skill

```bash
npx txtskills remove <skill-name>
```

## Options

```
txtskills add [skill-name]     Install a skill
  -r, --repo <owner/repo>       Use a different skill registry
  -g, --global                   Install globally (all projects)
  -a, --agent <agents...>        Target specific agents (e.g., claude-code, cursor)
  -y, --yes                      Skip confirmation prompts

txtskills list                  List all available skills
  -r, --repo <owner/repo>       Use a different skill registry
  --json                         Output as JSON

txtskills search [query]        Search for skills
  -r, --repo <owner/repo>       Use a different skill registry

txtskills remove [skills...]    Remove installed skills
  -g, --global                   Remove from global scope
  -a, --agent <agents...>        Remove from specific agents
  -s, --skill <pattern>          Specify skills to remove (use '*' for all)
  -y, --yes                      Skip confirmation prompts
  --all                          Remove all skills from all agents
```

## Compatible agents

- [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview)
- [Cursor](https://cursor.com)
- [Windsurf](https://windsurf.com)
- [GitHub Copilot](https://github.com/features/copilot)
- [Amp](https://amp.dev)
- [Antigravity](https://antigravity.dev)
- Any agent that supports the [Agent Skills](https://agentskills.io) format

## How it works

**[llms.txt](https://llmstxt.org/) → Agent Skills**

1. Libraries publish documentation in the [llms.txt](https://llmstxt.org/) format — a simple standard for making docs accessible to language models.
2. txtskills converts that documentation into agent skills — portable, structured folders that agents can load on demand.
3. You install skills into your project, and your AI agent uses them for accurate, up-to-date context.

## Create a skill

Paste a URL or `llms.txt` content at [txtskills.hari.works](https://txtskills.hari.works) and get an installable skill in seconds.

## Links

- Website: [txtskills.hari.works](https://txtskills.hari.works)
- Browse skills: [txtskills.hari.works/skills](https://txtskills.hari.works/skills)
- GitHub: [github.com/hk-vk/txtskills](https://github.com/hk-vk/txtskills)
- Skills registry: [github.com/hk-vk/skills](https://github.com/hk-vk/skills)
- llms.txt standard: [llmstxt.org](https://llmstxt.org/)
- Agent Skills format: [agentskills.io](https://agentskills.io)

## License

MIT
