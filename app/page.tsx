"use client";

import { useState } from "react";
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
  command: string;
  githubUrl: string;
  skillName: string;
  skillContent: string;
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

  const handleSubmit = async () => {
    const input = activeTab === "url" ? url.trim() : content.trim();
    if (!input) return;

    setState("loading");
    setLoadingStep(0);

    try {
      for (let i = 0; i < 4; i++) {
        setLoadingStep(i);
        await new Promise((r) => setTimeout(r, 800));
      }

      const mockSkillName = activeTab === "url"
        ? new URL(url).hostname.replace(/\./g, "-").replace("www-", "")
        : "custom-skill";

      setResult({
        command: `npx skills add llmskills/skills --skill ${mockSkillName}`,
        githubUrl: `https://github.com/llmskills/skills/tree/main/skills/${mockSkillName}`,
        skillName: mockSkillName,
        skillContent: `---
name: ${mockSkillName}
description: Documentation converted from llms.txt.
metadata:
  source: llms.txt
  generated: ${new Date().toISOString()}
---

# ${mockSkillName}

> Generated skill from llms.txt

## Available Resources

This skill was automatically generated.

## How to Use

Reference these resources when working with ${mockSkillName}.
`,
      });
      setState("success");
    } catch {
      setError({
        type: "unknown",
        message: "Conversion failed. Please try again.",
        suggestion: "Check your input and try again.",
      });
      setState("error");
    }
  };

  const handleCopy = async () => {
    if (result) {
      await navigator.clipboard.writeText(result.command);
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
      <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">

        {/* Header */}
        <header className="mb-16 relative">
          {/* Decorative grid background */}
          <div className="absolute inset-0 -z-10 overflow-hidden opacity-[0.03]">
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }} />
          </div>
          
          {/* Main title section */}
          <div className="text-center md:text-left">
            <div className="flex items-start justify-between gap-4">
              <div className="inline-block relative">
                <h1 
                  className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-4 bg-gradient-to-br from-foreground via-foreground to-muted-foreground/60 bg-clip-text"
                  style={{ fontFamily: 'var(--font-geist-pixel-grid)' }}
                >
                  TXTSKILLS
                </h1>
                {/* Decorative accent line */}
                <div className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
              </div>
              
              <a 
                href="https://github.com/llmskills/txtskills" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono flex items-center gap-2 mt-2 shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </a>
            </div>
            
            <p className="text-muted-foreground tracking-[0.3em] text-xs uppercase mt-4 font-mono">
              llms.txt → agent skills
            </p>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mt-4 leading-relaxed mx-auto md:mx-0">
              Convert any <code className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono">llms.txt</code> documentation into an installable skill for AI agents.
            </p>
            
            {/* Works With - Agent Compatibility */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wider mr-1">Works with</span>
              <div className="flex flex-wrap items-center gap-2">
                {/* Claude Code */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/50 rounded-md border border-border/50 hover:border-border transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                  </svg>
                  <span className="text-xs font-medium">Claude Code</span>
                </div>
                {/* Cursor */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/50 rounded-md border border-border/50 hover:border-border transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
                    <path d="M5 12h14"/><path d="M12 5v14"/>
                  </svg>
                  <span className="text-xs font-medium">Cursor</span>
                </div>
                {/* Windsurf */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/50 rounded-md border border-border/50 hover:border-border transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
                    <path d="M2 12c2-4 6-6 10-6s8 2 10 6c-2 4-6 6-10 6s-8-2-10-6z"/>
                  </svg>
                  <span className="text-xs font-medium">Windsurf</span>
                </div>
                {/* GitHub Copilot */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/50 rounded-md border border-border/50 hover:border-border transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-purple-400">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"/>
                  </svg>
                  <span className="text-xs font-medium">Copilot</span>
                </div>
                {/* More */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-muted-foreground">
                  <span className="text-xs">+ more</span>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative corner elements */}
          <div className="absolute top-0 right-0 w-16 h-16 border-t border-r border-border/30 rounded-tr-lg pointer-events-none hidden md:block" />
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b border-l border-border/30 rounded-bl-lg pointer-events-none hidden md:block" />
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
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <GlobeIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        type="url"
                        placeholder="https://docs.example.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="pl-11 font-mono h-12 w-full bg-card border-border"
                      />
                    </div>
                    <Button
                      onClick={handleSubmit}
                      disabled={!isValid}
                      className="h-12 px-8"
                    >
                      Convert
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    We&apos;ll fetch /llms.txt from this URL automatically
                  </p>
                </TabsPanel>

                <TabsPanel value="paste">
                  <Textarea
                    placeholder="# Project Name&#10;> Description&#10;&#10;## Section&#10;- [Link](url): Notes"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[200px] font-mono text-sm bg-card border-border mb-4"
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={!isValid}
                    className="h-12 px-6"
                  >
                    Convert
                  </Button>
                </TabsPanel>
              </Tabs>
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
            <section>
              <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-4">
                Install Command
              </h2>
              <div className="flex items-center gap-3 bg-card border border-border rounded-lg p-4">
                <span className="text-muted-foreground font-mono">$</span>
                <code className="flex-1 font-mono text-sm">{result.command}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </section>

            <section>
              <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-4">
                Skill Created
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono">{result.skillName}</span>
                  <a
                    href={result.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View on GitHub →
                  </a>
                </div>

                <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
                  <CollapsibleTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                    {previewOpen ? "Hide" : "Show"} SKILL.md Preview
                  </CollapsibleTrigger>
                  <CollapsiblePanel>
                    <ScrollArea className="h-[300px] mt-4 rounded-lg border border-border">
                      <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
                        {result.skillContent}
                      </pre>
                    </ScrollArea>
                  </CollapsiblePanel>
                </Collapsible>
              </div>
            </section>

            <Button variant="outline" onClick={handleReset}>
              Convert Another
            </Button>
          </div>
        )}

        {/* Error State */}
        {state === "error" && error && (
          <div className="space-y-6">
            <Alert variant="destructive">
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
        <footer className="mt-24 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Built for the{" "}
            <a
              href="https://skills.sh"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              skills.sh
            </a>
            {" "}ecosystem
          </p>
        </footer>
      </div>
    </main>
  );
}
