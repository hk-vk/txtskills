"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";

interface UsageModeNavProps {
  active: "web" | "cli" | "skill";
}

const MODE_TABS = [
  {
    key: "web",
    href: "/",
    mobileLabel: "Convert",
    label: "Convert",
  },
  {
    key: "cli",
    href: "/cli",
    mobileLabel: "CLI",
    label: "Use via CLI",
  },
  {
    key: "skill",
    href: "/agent-skill",
    mobileLabel: "Agent Skills",
    label: "Use as Agent Skill",
  },
] as const;

type ModeKey = (typeof MODE_TABS)[number]["key"];

export function UsageModeNav({ active }: UsageModeNavProps) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<ModeKey | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const visualActive = pendingKey ?? active;
  const activeIndex = useMemo(
    () => Math.max(0, MODE_TABS.findIndex((tab) => tab.key === visualActive)),
    [visualActive],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const tabClass = (isActive: boolean) =>
    `relative z-10 flex min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
      isActive
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground"
    }`;

  const handleTabClick = (
    event: MouseEvent<HTMLAnchorElement>,
    tabKey: ModeKey,
    href: string,
  ) => {
    if (tabKey === active || pendingKey !== null) return;

    event.preventDefault();
    setPendingKey(tabKey);

    timeoutRef.current = window.setTimeout(() => {
      router.push(href);
      setPendingKey(null);
    }, 340);
  };

  return (
    <nav
      className="relative inline-flex w-full max-w-full items-center overflow-x-auto rounded-lg border border-border/40 bg-background/50 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Mode"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1 left-1 top-1 w-[calc((100%-0.5rem)/3)] rounded-md border border-border/70 bg-gradient-to-b from-muted/85 to-background shadow-sm transition-transform duration-[320ms] [transition-timing-function:cubic-bezier(0.88,-0.12,0.565,1.2)] dark:from-muted/70 dark:to-background"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />

      {MODE_TABS.map((tab) => {
        const isActive = visualActive === tab.key;

        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={tabClass(isActive)}
            aria-current={active === tab.key ? "page" : undefined}
            onClick={(event) => handleTabClick(event, tab.key, tab.href)}
          >
            <span className="sm:hidden">{tab.mobileLabel}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
