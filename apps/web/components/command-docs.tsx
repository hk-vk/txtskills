"use client";

import { useState } from "react";

export interface CommandDocEntry {
  description: string;
  command: string;
}

export function CommandDocs({ title, entries }: { title: string; entries: CommandDocEntry[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (command: string) => {
    await navigator.clipboard.writeText(command);
    setCopied(command);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="space-y-4">
        {entries.map((entry) => (
          <div key={entry.command} className="space-y-2">
            <p className="text-sm text-muted-foreground">{entry.description}</p>
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-black/5 px-4 py-3 font-mono text-xs dark:bg-black/40 sm:text-sm">
              <span className="text-primary/70 select-none">$</span>
              <code className="flex-1 truncate text-foreground/90" title={entry.command}>
                {entry.command}
              </code>
              <button
                onClick={() => handleCopy(entry.command)}
                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`Copy command: ${entry.command}`}
              >
                {copied === entry.command ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
