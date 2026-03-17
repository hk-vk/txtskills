import Link from "next/link";
import { UsageModeNav } from "@/components/usage-mode-nav";
import { CommandDocs } from "@/components/command-docs";

export default function AgentSkillPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-5 py-8 md:px-6 md:py-16">
        <header className="mb-14">
          <div className="mb-8 flex items-center justify-end">
            <nav aria-label="Primary" className="inline-flex items-center gap-5 text-xs sm:text-sm">
              <Link
                href="/skills"
                className="text-muted-foreground underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/40"
              >
                Browse Skills
              </Link>
              <a
                href="https://github.com/hk-vk/txtskills"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/40"
              >
                GitHub
              </a>
            </nav>
          </div>

          <div className="mb-8 flex justify-center">
            <UsageModeNav active="skill" />
          </div>

          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Use as Agent Skill</h1>
          <p className="mt-3 text-muted-foreground">
            Install the txtskills conversion skill via native skills CLI, then use it inside your coding agent to find llms.txt and convert it into an agent skill.
          </p>
        </header>

        <div className="space-y-10">
          <CommandDocs
            title="Install"
            entries={[
              {
                description: "Install only txtskills conversion workflow skill via skills CLI",
                command: "npx skills add hk-vk/txtskills --skill txtskills-llms-to-agent-skills",
              },
            ]}
          />

          <CommandDocs
            title="Prompt Example"
            entries={[
              {
                description: "Find llms.txt first, then convert",
                command: "Use skill txtskills-llms-to-agent-skills to find the llms.txt and convert it into an agent skill.",
              },
              {
                description: "Convert when llms.txt is already known",
                command: "Use skill txtskills-llms-to-agent-skills to convert this llms.txt into an agent skill.",
              },
            ]}
          />
        </div>
      </div>
    </main>
  );
}
