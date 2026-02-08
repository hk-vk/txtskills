"use client";

import { useState } from "react";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { useSkillsCache } from "@/hooks/use-skills-cache";

export default function SkillsPage() {
  const { skills, loading } = useSkillsCache();
  const [copiedSkill, setCopiedSkill] = useState<string | null>(null);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  const handleCopy = async (command: string, name: string) => {
    await navigator.clipboard.writeText(command);
    setCopiedSkill(name);
    setTimeout(() => setCopiedSkill(null), 2000);
  };

  return (
    <main className="min-h-dvh bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">All Skills</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading
                ? "Loading..."
                : `${skills.length} skill${skills.length !== 1 ? "s" : ""} published`}
            </p>
          </div>
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            Back
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-20 justify-center text-muted-foreground">
            <Spinner className="size-4" />
            <span className="text-sm">Fetching skills...</span>
          </div>
        ) : skills.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground text-sm">No skills published yet.</p>
            <Link
              href="/"
              className="text-sm text-primary hover:underline mt-3 inline-block"
            >
              Create your first skill
            </Link>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
            {skills.map((skill) => (
              <div key={skill.name}>
                <div className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-sm font-medium truncate block">
                      {skill.name}
                    </span>
                    {skill.metadata?.sourceUrl && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {skill.metadata.sourceUrl}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button
                      onClick={() =>
                        setExpandedSkill(
                          expandedSkill === skill.name ? null : skill.name
                        )
                      }
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-md hover:bg-muted/50 flex items-center gap-1.5"
                    >
                      Install
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-transform duration-150 ${
                          expandedSkill === skill.name ? "rotate-180" : ""
                        }`}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                    <a
                      href={skill.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-md hover:bg-muted/50"
                      title="View on GitHub"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                    </a>
                  </div>
                </div>
                {expandedSkill === skill.name && (
                  <div className="px-5 pb-4 -mt-1">
                    <div className="flex items-center gap-2 bg-black/5 dark:bg-black/40 border border-border/50 rounded-lg px-4 py-3 font-mono text-xs">
                      <span className="text-primary/70 select-none">$</span>
                      <span className="flex-1 overflow-x-auto text-foreground/90">
                        {skill.command}
                      </span>
                      <button
                        onClick={() => handleCopy(skill.command, skill.name)}
                        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      >
                        {copiedSkill === skill.name ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
