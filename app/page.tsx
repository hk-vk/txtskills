"use client";

import { useState } from "react";
import Link from "next/link";
import { invalidateSkillsCache } from "@/hooks/use-skills-cache";
import { ClaudeIcon, AntigravityIcon, AmpIcon, CursorIcon, WindsurfIcon, CopilotIcon } from "@/components/icons/agent-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

// URL/Link icon SVG
function LinkIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// Globe icon for URL
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

type AppState = "input" | "loading" | "success" | "error";

interface ConversionResult {
  command?: string;
  githubUrl?: string;
  skillName: string;
  skillContent: string;
  isUpdate?: boolean;
  alreadyExists?: boolean;
  contentChanged?: boolean;
  publishFailed?: boolean;
  existingMetadata?: {
    skillName: string;
    sourceUrl: string | null;
    contentHash: string;
    generatedAt: string;
    updatedAt: string;
    generatorVersion: string;
  } | null;
}

interface ConversionError {
  type: string;
  message: string;
  suggestion?: string;
}

export default function Home() {
  const [state, setState] = useState<AppState>("input");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState("url");
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<ConversionError | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const steps = ["Fetching", "Parsing", "Generating", "Publishing"];

  const handleSubmit = async (forceRegenerate = false) => {
    const input = activeTab === "url" ? url.trim() : content.trim();
    if (!input) return;

    setState("loading");
    setLoadingStep(0);

    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2000);

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab,
          [activeTab]: input,
          forceRegenerate
        })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          response.status >= 500
            ? 'Server error — the input may be too large to process. Try a smaller llms.txt.'
            : 'Unexpected response from server. Please try again.'
        );
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Conversion failed');
      }

      setResult(data);
      // Invalidate skills cache and update manifest after a new publish
      if (!data.publishFailed && !data.alreadyExists) {
        invalidateSkillsCache();
        // Update skills.json manifest in a separate request (fire-and-forget)
        fetch('/api/skills/manifest', { method: 'POST' }).catch(() => {});
      }
      // Auto-expand preview when publish failed (no install command available)
      if (data.publishFailed) {
        setPreviewOpen(true);
      }
      setState("success");
    } catch (err: any) {
      setError({
        type: "api",
        message: err.message || "Something went wrong. Please try again.",
        suggestion: "Check your input and try again.",
      });
      setState("error");
    } finally {
      clearInterval(interval);
    }
  };

  const handleRegenerate = () => {
    handleSubmit(true);
  };

  const handleCopy = async () => {
    if (result) {
      const textToCopy = result.command || result.skillContent || '';
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setState("input");
    setResult(null);
    setError(null);
    setUrl("");
    setContent("");
  };

  const isValid = activeTab === "url" ? url.trim().length > 0 : content.trim().length > 0;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-10 md:py-20">

        {/* Header */}
        <header className="mb-16 relative">
          {/* Decorative background */}
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }} />

          </div>

          {/* Main title section */}
          <div className="text-center md:text-left">
            <div className="inline-block relative">
              <h1
                className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-4 bg-gradient-to-br from-foreground via-foreground to-muted-foreground/60 bg-clip-text"
                style={{ fontFamily: "'Doto', sans-serif" }}
              >
                txtskills
              </h1>
              {/* Pixelated underline effect */}
              <div className="flex gap-1 justify-center md:justify-start h-2 opacity-50">
                <div className="w-2 h-2 bg-foreground/10" />
                <div className="w-2 h-2 bg-foreground/20" />
                <div className="w-2 h-2 bg-foreground/40" />
                <div className="w-2 h-2 bg-foreground/60" />
                <div className="w-2 h-2 bg-foreground/80" />
                <div className="w-2 h-2 bg-foreground/60" />
                <div className="w-2 h-2 bg-foreground/40" />
                <div className="w-2 h-2 bg-foreground/20" />
                <div className="w-2 h-2 bg-foreground/10" />
              </div>
            </div>

            <p className="text-muted-foreground tracking-[0.3em] text-xs uppercase mt-4 font-mono">
              llms.txt → agent skills
            </p>

            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mt-6 leading-relaxed mx-auto md:mx-0">
              Convert any <a href="https://llmstxt.org/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity"><code className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono border border-border/50">llms.txt</code></a> documentation into an installable <a href="https://agentskills.io/home" target="_blank" rel="noopener noreferrer" className="text-foreground border-b border-border hover:border-foreground transition-colors pb-0.5">skill</a> for AI agents.
            </p>
          </div>

          {/* Decorative corner elements */}
          <div className="absolute top-0 right-0 w-16 h-16 border-t border-r border-border/30 rounded-tr-lg pointer-events-none hidden md:block opacity-50" />
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b border-l border-border/30 rounded-bl-lg pointer-events-none hidden md:block opacity-50" />
        </header>

        {/* Input State */}
        {state === "input" && (
          <div className="space-y-12">
            <section>
              <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-4">
                Enter Source
              </h2>

              <Tabs defaultValue="url" onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTab value="url">URL</TabsTab>
                  <TabsTab value="paste">Paste Content</TabsTab>
                </TabsList>

                <TabsPanel value="url">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex-1 relative">
                      <GlobeIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        type="url"
                        placeholder="https://docs.example.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="pl-11 font-mono h-12 w-full bg-card border-border"
                        autoComplete="off"
                        spellCheck="false"
                      />
                    </div>
                    <Button
                      onClick={() => handleSubmit()}
                      disabled={!isValid}
                      className="h-12 px-6 font-mono tracking-wide text-sm gap-2.5 shadow-none hover:shadow-none transition-all"
                    >
                      Convert
                      <span className="text-primary-foreground/50 text-xs">→</span>
                    </Button>
                  </div>
                  <div className="mt-3 px-1">
                    <p className="text-xs text-muted-foreground/60">
                      Paste a base URL or a direct llms.txt link.
                    </p>
                  </div>
                </TabsPanel>

                <TabsPanel value="paste">
                  <Textarea
                    placeholder="# Project Name&#10;> Description&#10;&#10;## Section&#10;- [Link](url): Notes"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[200px] font-mono text-sm bg-card border-border mb-4"
                  />
                  <Button
                    onClick={() => handleSubmit()}
                    disabled={!isValid}
                    className="h-12 px-6 font-mono tracking-wide text-sm gap-2.5 shadow-none hover:shadow-none transition-all"
                  >
                    Convert
                    <span className="text-primary-foreground/50 text-xs">→</span>
                  </Button>
                </TabsPanel>
              </Tabs>

              {/* Browse Skills Link */}
              <div className="mt-12 mb-8">
                <Link
                  href="/skills"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 w-fit"
                >
                  Browse all skills
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </Link>
              </div>

              {/* Works With - Agent Compatibility */}
              <div className="space-y-4">
                <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold opacity-70">Compatible with</span>
                <div className="flex flex-wrap items-center gap-3">
                  {/* Claude Code */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border/40 hover:border-primary/20 hover:bg-muted/50 transition-all cursor-default group">
                    <ClaudeIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium">Claude Code</span>
                  </div>
                  {/* Cursor */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border/40 hover:border-primary/20 hover:bg-muted/50 transition-all cursor-default group">
                    <CursorIcon className="w-4 h-4 text-foreground group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium">Cursor</span>
                  </div>
                  {/* Windsurf */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border/40 hover:border-primary/20 hover:bg-muted/50 transition-all cursor-default group">
                    <WindsurfIcon className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium">Windsurf</span>
                  </div>
                  {/* GitHub Copilot */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border/40 hover:border-primary/20 hover:bg-muted/50 transition-all cursor-default group">
                    <CopilotIcon className="w-4 h-4 text-foreground group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium">Copilot</span>
                  </div>
                  {/* Amp */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border/40 hover:border-primary/20 hover:bg-muted/50 transition-all cursor-default group">
                    <AmpIcon className="w-4 h-4 text-foreground group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium">Amp</span>
                  </div>
                  {/* Antigravity */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border/40 hover:border-primary/20 hover:bg-muted/50 transition-all cursor-default group">
                    <AntigravityIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium">Antigravity</span>
                  </div>
                  {/* More */}
                  <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground/60 border border-transparent select-none">
                    <span className="text-xs font-medium">+ more</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Loading State */}
        {state === "loading" && (
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <Spinner className="h-5 w-5" />
              <span className="text-lg">{steps[loadingStep]}...</span>
            </div>
            <Progress value={((loadingStep + 1) / steps.length) * 100} className="h-1" />
            <div className="flex gap-6 text-sm">
              {steps.map((step, i) => (
                <span
                  key={step}
                  className={i <= loadingStep ? "text-foreground" : "text-muted-foreground"}
                >
                  {i < loadingStep ? "✓" : i === loadingStep ? "→" : "○"} {step}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Success State */}
        {state === "success" && result && (
          <div className="space-y-12">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
              Back
            </button>
            <section className="border border-border rounded-xl overflow-hidden bg-card/30 transition-all hover:border-border/80 shadow-sm">
              {/* Header */}
              <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-muted/10">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="font-mono font-medium text-sm">{result.skillName}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {result.publishFailed ? (
                        <span className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-red-500" />
                          Generated · publish failed
                        </span>
                      ) : result.alreadyExists && result.contentChanged ? (
                        <span className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-orange-500" />
                          Source content changed
                          {result.existingMetadata?.updatedAt && (
                            <span className="text-muted-foreground/60">
                              · last published {new Date(result.existingMetadata.updatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </span>
                      ) : result.alreadyExists ? (
                        <span className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-blue-500" />
                          Already published · up to date
                          {result.existingMetadata?.updatedAt && (
                            <span className="text-muted-foreground/60">
                              · {new Date(result.existingMetadata.updatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </span>
                      ) : result.isUpdate ? (
                        <span className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-amber-500" />
                          Updated in-place
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          Ready to install
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {result.githubUrl && (
                  <a
                    href={result.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-muted/50"
                  >
                    View Source <LinkIcon className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {result.publishFailed && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                    Publishing to GitHub failed. You can still copy the generated skill below.
                  </div>
                )}

                {result.command ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Install Command</label>
                    </div>
                    <div className="relative group">

                      <div className="relative flex items-center gap-3 bg-black/5 dark:bg-black/40 border border-border/50 rounded-lg p-4 font-mono text-sm">
                        <span className="text-primary/70 select-none">$</span>
                        <span className="flex-1 overflow-x-auto scrollbar-hide selection:bg-primary/20 text-foreground/90">{result.command}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleCopy}
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-background/20"
                        >
                          {copied ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><polyline points="20 6 9 17 4 12" /></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
                  <div className="pt-4 border-t border-border/30">
                    <CollapsibleTrigger className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors group">
                      <span className="flex items-center gap-2">
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
                          className={`transition-transform duration-200 text-muted-foreground/50 group-hover:text-muted-foreground ${previewOpen ? "rotate-90" : ""}`}
                        >
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                        Preview generated skill
                      </span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                        {previewOpen ? "Close" : "Expand"}
                      </span>
                    </CollapsibleTrigger>
                    <CollapsiblePanel>
                      <div className="mt-4 rounded-lg border border-border/40 bg-muted/5 p-4 overflow-hidden">
                        <ScrollArea className="h-[300px] pr-4">
                          <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {result.skillContent}
                          </pre>
                        </ScrollArea>
                      </div>
                    </CollapsiblePanel>
                  </div>
                </Collapsible>
              </div>
            </section>



            <div className="flex gap-3">
              {result.alreadyExists && result.contentChanged && (
                <Button onClick={handleRegenerate}>
                  Regenerate
                </Button>
              )}
              <Button variant="outline" onClick={handleReset}>
                Convert Another
              </Button>
            </div>
          </div>
        )}

        {/* Error State */}
        {state === "error" && error && (
          <div className="space-y-6">
            <Alert variant="error">
              <AlertDescription>
                <p className="font-medium">{error.message}</p>
                {error.suggestion && (
                  <p className="text-sm mt-1 opacity-80">{error.suggestion}</p>
                )}
              </AlertDescription>
            </Alert>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setState("input")}>
                Try Again
              </Button>
              <Button variant="ghost" onClick={handleReset}>
                Start Over
              </Button>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-24 pt-8 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Built for the{" "}
            <a
              href="https://skills.sh"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors inline-flex items-center gap-0.5"
            >
              <span className="text-xs">&#9650;</span>/<span>skills</span>
            </a>
            {" "}ecosystem
          </p>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            Star on
            <a
              href="https://github.com/hk-vk/txtskills"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-medium rounded-md border border-border bg-card text-foreground hover:bg-muted/50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
              GitHub
            </a>
          </span>
        </footer>
      </div>
    </main>
  );
}
