import Link from "next/link";

interface UsageModeNavProps {
  active: "web" | "cli" | "skill";
}

export function UsageModeNav({ active }: UsageModeNavProps) {
  const tabClass = (isActive: boolean) =>
    `border-b pb-2 text-sm transition-colors ${
      isActive
        ? "border-foreground text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <nav className="inline-flex items-center gap-6 border-b border-border/40 pb-2" aria-label="Mode">
      <Link href="/" className={tabClass(active === "web")}>
        Web Convert
      </Link>
      <Link href="/cli" className={tabClass(active === "cli")}>
        Use via CLI
      </Link>
      <Link href="/agent-skill" className={tabClass(active === "skill")}>
        Use as Agent Skill
      </Link>
    </nav>
  );
}
