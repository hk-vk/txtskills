import { getSiteUrl } from "@/lib/site-url";

export const agentInstructionsMarkdown = `# txtskills

## When to use this

Use txtskills when you have documentation published as an llms.txt file or a compatible documentation URL and need a compact, installable skill for an AI coding agent. It is a good fit for turning framework, SDK, API, and product documentation into reusable context for Claude Code, Codex, Cursor, Windsurf, Hermes, OpenCode, GitHub Copilot, Amp, Antigravity, and other agents.

## How to use it

- Convert a documentation URL in the web app: ${getSiteUrl()}/
- Use the CLI for scripts and local workflows: **npx txtskills@latest convert <url>**
- Browse or install an existing skill: **npx txtskills@latest list** and **npx txtskills@latest add <skill-name>**
- Install the agent workflow skill: **npx skills@latest add hk-vk/txtskills --skill txtskills-llms-to-agent-skills**


## Choose a mode

- Web mode: use the browser for a fast, one-off conversion when you want to inspect the result visually.
- CLI mode: use **npx txtskills@latest** for repeatable conversions, discovery, installation, and scripts.
- Agent Skills mode: install the txtskills workflow so Claude Code, Codex, Cursor, Hermes, OpenCode, or another compatible agent can find llms.txt and convert it for you.

## Public indexes

- Website: ${getSiteUrl()}/
- Skills directory: ${getSiteUrl()}/skills
- CLI guide: ${getSiteUrl()}/cli
- Agent skill guide: ${getSiteUrl()}/agent-skill
- Skill registry: https://github.com/hk-vk/skills
- Sitemap: ${getSiteUrl()}/sitemap.xml

## Output

A successful conversion produces an Agent Skills-compatible SKILL.md, publishes it to the txtskills registry when configured, and returns an install command. Prefer the CLI when you need repeatable automation; use the web app for a quick one-off conversion.
`;

export function markdownForPath(pathname: string): string | null {
  const siteUrl = getSiteUrl();

  switch (pathname) {
    case "/":
    case "/__home":
      return agentInstructionsMarkdown;
    case "/skills":
      return `# Skills | txtskills

Browse published documentation skills and install one with **npx txtskills@latest add <skill-name>**.

- Directory: ${siteUrl}/skills
- Machine-readable skill manifest: ${siteUrl}/api/skills/manifest
- Full agent instructions: ${siteUrl}/llms.txt
`;
    case "/cli":
      return `# Use txtskills via CLI

Convert documentation, discover skills, and install them from a terminal.

\`\`\`bash
npx txtskills@latest convert https://docs.example.com/llms.txt
npx txtskills@latest list
npx txtskills@latest add <skill-name>
\`\`\`

See ${siteUrl}/llms.txt for when to use txtskills.
`;
    case "/agent-skill":
      return `# Use txtskills as an Agent Skill

Install the conversion workflow into a compatible coding agent:

\`\`\`bash
npx skills@latest add hk-vk/txtskills --skill txtskills-llms-to-agent-skills
\`\`\`

Then ask the agent to find an llms.txt source and convert it into an Agent Skill.
`;
    case "/about":
      return `# About txtskills

${siteUrl} is a small developer tool for converting documentation published as llms.txt into installable Agent Skills. It provides a web converter, a CLI, and a public skills directory backed by the hk-vk/skills registry.
`;
    case "/contact":
      return `# Contact txtskills

For questions, bug reports, and feature requests, open an issue in the public repository: https://github.com/hk-vk/txtskills/issues. Include the source URL, command, and a reproducible example when reporting a problem.
`;
    case "/privacy":
      return `# Privacy

Txtskills does not require an account. Conversion requests may send a documentation URL or pasted documentation to the service so it can fetch, parse, and generate a skill. CLI installation events may include the skill name, CLI version, operating system, and Node.js version for aggregate install statistics. Production pages load Umami analytics. Do not submit secrets or private documentation.
`;
    case "/llms.txt":
      return agentInstructionsMarkdown;
    default:
      return null;
  }
}
