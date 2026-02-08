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
            <section>
              <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-4">
                Install Command
              </h2>
              <div className="flex items-center gap-3 bg-card border border-border rounded-lg p-4 overflow-hidden">
                <span className="text-muted-foreground font-mono shrink-0">$</span>
                <code className="flex-1 font-mono text-sm overflow-x-auto whitespace-nowrap scrollbar-hide">{result.command}</code>
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
              <div className="space-y-4 bg-card/50 border border-border/50 rounded-xl p-6 backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                      <span className="text-lg">✨</span>
                    </div>
                    <div>
                      <h3 className="font-medium font-mono">{result.skillName}</h3>
                      <p className="text-xs text-muted-foreground">Ready to install</p>
                    </div>
                  </div>
                  <a
                    href={result.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline underline-offset-4 flex items-center gap-1"
                  >
                    View on GitHub <LinkIcon className="w-3 h-3" />
                  </a>
                </div>

                <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors border border-border/30 text-sm font-medium mt-2">
                    <span>SKILL.md Preview</span>
                    <span className="text-xs text-muted-foreground">{previewOpen ? "Hide" : "Show"}</span>
                  </CollapsibleTrigger>
                  <CollapsiblePanel>
                    <ScrollArea className="h-[300px] mt-2 rounded-lg border border-border bg-muted/10">
                      <pre className="p-4 text-xs font-mono whitespace-pre-wrap text-muted-foreground">
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
