import Link from "next/link";
import type { ReactNode } from "react";
import { TopLinksNav } from "@/components/top-links-nav";

export function TrustPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-8 md:px-6 md:py-16">
        <div className="mb-14 flex items-center justify-between gap-4">
          <Link href="/" className="font-mono text-sm tracking-tight hover:opacity-70">
            txtskills
          </Link>
          <TopLinksNav />
        </div>
        <article className="space-y-8">
          <header className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
            <p className="leading-relaxed text-muted-foreground">{intro}</p>
          </header>
          <div className="space-y-6 text-sm leading-7 text-muted-foreground">{children}</div>
        </article>
      </div>
    </main>
  );
}
