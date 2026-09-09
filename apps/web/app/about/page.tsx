import type { Metadata } from "next";
import { TrustPage } from "@/components/trust-page";

export const metadata: Metadata = {
  title: "About txtskills",
  description: "Learn what txtskills does and when to use it to turn llms.txt documentation into Agent Skills.",
};

export default function AboutPage() {
  return (
    <TrustPage
      title="About txtskills"
      intro="txtskills is a small developer tool for turning documentation into reusable context for AI coding agents."
    >
      <p>
        Many documentation sites publish an llms.txt file: a machine-readable index of the pages that
        matter to an agent. txtskills fetches that source, parses the documentation links, and generates
        an Agent Skills-compatible SKILL.md that can be installed and reused in a coding workflow.
      </p>
      <p>
        The project has three modes. Web mode is the quickest way to try a one-off conversion and inspect
        the result. CLI mode is for repeatable conversions, discovery, installation, and scripts using
        <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">npx txtskills@latest</code>.
        Agent Skills mode lets a compatible agent such as Claude Code, Codex, Cursor, Hermes, OpenCode,
        Windsurf, GitHub Copilot, Amp, or Antigravity find an llms.txt source and run the workflow.
      </p>
      <p>
        Generated skills are published to the public hk-vk/skills registry when publishing is enabled.
        txtskills is best for public framework, SDK, API, and product documentation. Do not submit secrets,
        credentials, or private documentation to the service.
      </p>
    </TrustPage>
  );
}
