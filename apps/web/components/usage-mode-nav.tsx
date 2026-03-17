import Link from "next/link";

interface UsageModeNavProps {
  active: "web" | "cli" | "skill";
}

export function UsageModeNav({ active }: UsageModeNavProps) {
  const tabClass = (isActive: boolean) =>
    `whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${
      isActive
        ? "bg-muted text-foreground"
        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
    }`;

  return (
    <nav
      className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-border/40 bg-background/60 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Mode"
    >
      <Link href="/" className={tabClass(active === "web")}>
        <span className="sm:hidden">Convert</span>
        <span className="hidden sm:inline">Convert</span>
      </Link>
      <Link href="/cli" className={tabClass(active === "cli")}>
        <span className="sm:hidden">CLI</span>
        <span className="hidden sm:inline">Use via CLI</span>
      </Link>
      <Link href="/agent-skill" className={tabClass(active === "skill")}>
        <span className="sm:hidden">Agent Skills</span>
        <span className="hidden sm:inline">Use as Agent Skill</span>
      </Link>
    </nav>
  );
}
