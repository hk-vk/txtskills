import { UsageModeNav } from "@/components/usage-mode-nav";
import { CommandDocs } from "@/components/command-docs";
import { TopLinksNav } from "@/components/top-links-nav";

export default function CliPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-5 py-8 md:px-6 md:py-16">
        <header className="mb-14">
          <div className="mb-8 flex items-center justify-end">
            <TopLinksNav />
          </div>

          <div className="mb-8 flex justify-center">
            <UsageModeNav active="cli" />
          </div>

          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Use via CLI</h1>
          <p className="mt-3 text-muted-foreground">
            Run conversion, discovery, install, and maintenance directly from terminal.
          </p>
        </header>

        <div className="space-y-10">
          <CommandDocs
            title="Convert"
            entries={[
              {
                description: "Convert from a direct llms.txt URL",
                command: "npx txtskills convert https://docs.example.com/llms.txt",
              },
              {
                description: "Convert from docs base URL and set custom skill name",
                command: "npx txtskills convert docs.example.com --name example-docs",
              },
              {
                description: "Convert and auto-install after success",
                command: "npx txtskills convert docs.example.com --install",
              },
              {
                description: "Return JSON output for scripts",
                command: "npx txtskills convert docs.example.com --json",
              },
            ]}
          />

          <CommandDocs
            title="Discover and Install"
            entries={[
              {
                description: "List all published skills",
                command: "npx txtskills list",
              },
              {
                description: "Search skills by name",
                command: "npx txtskills search <query>",
              },
              {
                description: "Install one skill",
                command: "npx txtskills add <skill-name>",
              },
              {
                description: "Remove one skill",
                command: "npx txtskills remove <skill-name>",
              },
            ]}
          />

          <CommandDocs
            title="Advanced Flags"
            entries={[
              {
                description: "Force regeneration when existing skill changed",
                command: "npx txtskills convert <url> --force",
              },
              {
                description: "Skip post-convert install prompt",
                command: "npx txtskills convert <url> --skip-install",
              },
              {
                description: "Use custom convert API endpoint",
                command: "npx txtskills convert <url> --api https://txtskills.hari.works",
              },
            ]}
          />
        </div>
      </div>
    </main>
  );
}
