"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Spinner } from "@txtskills/ui/spinner";
import { Input } from "@txtskills/ui/input";
import { useSkillsCache } from "@/hooks/use-skills-cache";
import { useInstallStats } from "@/hooks/use-install-stats";

const SKILLS_PER_PAGE = 10;

export default function SkillsPage() {
  const { skills, loading } = useSkillsCache();
  const installStats = useInstallStats(); // Non-blocking, loads independently
  const [copiedSkill, setCopiedSkill] = useState<string | null>(null);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter skills based on search query
  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return skills;
    const query = searchQuery.toLowerCase().trim();
    return skills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(query) ||
        skill.metadata?.sourceUrl?.toLowerCase().includes(query)
    );
  }, [skills, searchQuery]);

  // Paginate filtered skills
  const totalPages = Math.ceil(filteredSkills.length / SKILLS_PER_PAGE);
  const paginatedSkills = useMemo(() => {
    const startIndex = (currentPage - 1) * SKILLS_PER_PAGE;
    return filteredSkills.slice(startIndex, startIndex + SKILLS_PER_PAGE);
  }, [filteredSkills, currentPage]);

  const handleCopy = async (command: string, name: string) => {
    await navigator.clipboard.writeText(command);
    setCopiedSkill(name);
    setTimeout(() => setCopiedSkill(null), 2000);
  };

  return (
    <main className="min-h-dvh bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16 md:py-24 ui-enter">
        <div className="flex items-center justify-between mb-10 gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">All Skills</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading
                ? "Loading..."
                : searchQuery
                ? `${filteredSkills.length} skill${filteredSkills.length !== 1 ? "s" : ""} found`
                : `${skills.length} skill${skills.length !== 1 ? "s" : ""} published`}
            </p>
          </div>
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            Back
          </Link>
        </div>

        {/* Search Bar */}
        {!loading && skills.length > 0 && (
          <div className="mb-8 relative max-w-xl">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.3-4.3"/>
              </svg>
            </div>
            <Input
              type="search"
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"/>
                  <path d="m6 6 12 12"/>
                </svg>
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 py-20 justify-center text-muted-foreground">
            <Spinner name="braille" className="size-4 text-sm" ariaLabel="Fetching skills" />
            <span className="text-sm">Fetching skills...</span>
          </div>
        ) : skills.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground text-sm">No skills published yet.</p>
            <Link href="/" className="text-sm text-primary hover:underline mt-3 inline-block">
              Create your first skill
            </Link>
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground text-sm">
              No skills found matching &ldquo;{searchQuery}&rdquo;
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="text-sm text-primary hover:underline mt-3 inline-block"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="border-y border-border/40">
            {paginatedSkills.map((skill) => (
              <article key={skill.name} className="py-5 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-medium truncate">
                        {skill.name}
                      </span>
                      {installStats.get(skill.name) ? (
                        <span className="text-[11px] text-muted-foreground/70 tabular-nums shrink-0">
                          {installStats.get(skill.name)!.toLocaleString()} installs
                        </span>
                      ) : null}
                    </div>
                    {skill.metadata?.sourceUrl && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {skill.metadata.sourceUrl}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-xs">
                    <button
                      onClick={() =>
                        setExpandedSkill(
                          expandedSkill === skill.name ? null : skill.name
                        )
                      }
                      className="inline-flex items-center gap-1.5 text-muted-foreground underline-offset-4 decoration-border/60 hover:text-foreground hover:underline hover:decoration-foreground/60 transition-colors"
                    >
                      {expandedSkill === skill.name ? "Hide install" : "Install"}
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
                      className="inline-flex items-center gap-1.5 text-muted-foreground underline-offset-4 decoration-border/60 hover:text-foreground hover:underline hover:decoration-foreground/60 transition-colors"
                      title="View on GitHub"
                    >
                      View source
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                    </a>
                  </div>
                </div>

                {expandedSkill === skill.name && (
                  <div className="mt-3 pl-0 sm:pl-0 border-l border-border/40 ml-0">
                    <div className="flex items-center gap-2 font-mono text-xs text-foreground/90 pl-3">
                      <span className="text-muted-foreground select-none">$</span>
                      <span className="flex-1 overflow-x-auto scrollbar-hide">
                        {skill.command}
                      </span>
                      <button
                        onClick={() => handleCopy(skill.command, skill.name)}
                        className="shrink-0 text-muted-foreground underline-offset-4 decoration-border/60 hover:text-foreground hover:underline hover:decoration-foreground/60 transition-colors"
                      >
                        {copiedSkill === skill.name ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredSkills.length > SKILLS_PER_PAGE && (
          <div className="flex items-center justify-between mt-6 text-sm gap-4">
            <p className="text-muted-foreground">
              Showing {((currentPage - 1) * SKILLS_PER_PAGE) + 1} to {Math.min(currentPage * SKILLS_PER_PAGE, filteredSkills.length)} of {filteredSkills.length}
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="text-muted-foreground underline-offset-4 decoration-border/60 hover:text-foreground hover:underline hover:decoration-foreground/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:no-underline"
              >
                Previous
              </button>
              <span className="text-muted-foreground min-w-[72px] text-center">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="text-muted-foreground underline-offset-4 decoration-border/60 hover:text-foreground hover:underline hover:decoration-foreground/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:no-underline"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
