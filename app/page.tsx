"use client";

import { useState } from "react";
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
  command: string;
  githubUrl: string;
  skillName: string;
  skillContent: string;
  isUpdate?: boolean;
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

    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2000);

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab,
          [activeTab]: input
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Conversion failed');
      }

      setResult(data);
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

  const handleDemo = () => {
    setState("loading");
    setLoadingStep(0);

    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 500);

    setTimeout(() => {
      clearInterval(interval);
      setResult({
        command: "npx skills add hk-vk/skills --skill nuxt-ui",
        githubUrl: "https://github.com/hk-vk/skills/tree/main/skills/nuxt-ui",
        skillName: "nuxt-ui",
        skillContent: `---
name: nuxt-ui
description: A comprehensive Vue UI component library (Nuxt optional) with 125+ accessible, production-ready, Tailwind CSS components for building modern web applications.
metadata:
  source: llms.txt
  generated: ${new Date().toISOString()}
---

# Nuxt UI

> A comprehensive Vue UI component library (Nuxt optional) with 125+ accessible, production-ready, Tailwind CSS components for building modern web applications.

## Available Resources

### Installation (Nuxt & Vue)

- **Installation**: Learn how to install and configure Nuxt UI in your Nuxt application.
  - URL: https://ui.nuxt.com/raw/docs/getting-started/installation/nuxt.md

- **Installation**: Learn how to install and configure Nuxt UI in your Vue application, compatible with both plain Vite and Inertia.
  - URL: https://ui.nuxt.com/raw/docs/getting-started/installation/vue.md

### Components

- **Accordion**: A stacked set of collapsible panels.
  - URL: https://ui.nuxt.com/raw/docs/components/accordion.md

- **Alert**: A callout to draw user's attention.
  - URL: https://ui.nuxt.com/raw/docs/components/alert.md

- **Button**: A button element that can act as a link or trigger an action.
  - URL: https://ui.nuxt.com/raw/docs/components/button.md

## How to Use This Skill

Reference these resources when working with Nuxt UI.`
      });
      setState("success");
    }, 2500);
  };

  const isValid = activeTab === "url" ? url.trim().length > 0 : content.trim().length > 0;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">

        {/* Header */}
        <header className="mb-16 relative">
          {/* Decorative background */}
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }} />
            <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
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
                      />
                    </div>
                    <Button
                      onClick={handleSubmit}
                      disabled={!isValid}
                      className="h-12 px-8 shadow-lg hover:shadow-primary/25 transition-all"
                    >
                      Convert
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 mt-3 px-1">
                    <p className="text-xs text-muted-foreground/60">
                      We&apos;ll fetch /llms.txt from this URL automatically.
                    </p>
                    <span className="text-border/40 select-none">|</span>
                    <button 
                      onClick={handleDemo}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary transition-colors" />
                      Try a demo
                    </button>
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
                    onClick={handleSubmit}
                    disabled={!isValid}
                    className="h-12 px-6 shadow-lg hover:shadow-primary/25 transition-all"
                  >
                    Convert
                  </Button>
                </TabsPanel>
              </Tabs>

              {/* Works With - Agent Compatibility */}
              <div className="mt-12 space-y-4">
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
            <section className="border border-border rounded-xl overflow-hidden bg-card/30 backdrop-blur-sm transition-all hover:border-border/80 shadow-sm">
              {/* Header */}
              <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-muted/10">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="font-mono font-medium text-sm">{result.skillName}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {result.isUpdate ? (
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
                <a
                  href={result.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-muted/50"
                >
                  View Source <LinkIcon className="w-3 h-3" />
                </a>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Install Command</label>
                  </div>
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
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
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

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
                          <path d="m9 18 6-6-6-6"/>
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



            <Button variant="outline" onClick={handleReset}>
              Convert Another
            </Button>
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
