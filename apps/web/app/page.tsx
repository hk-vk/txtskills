"use client";

import { useState } from "react";
import { invalidateSkillsCache, useSkillsCache } from "@/hooks/use-skills-cache";
import { ClaudeIcon, AntigravityIcon, AmpIcon, CursorIcon, WindsurfIcon, CopilotIcon } from "@txtskills/ui/icons/agent-icons";
import { Button } from "@txtskills/ui/button";
import { Input } from "@txtskills/ui/input";
import { Textarea } from "@txtskills/ui/textarea";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@txtskills/ui/tabs";
import { Progress } from "@txtskills/ui/progress";
import { Spinner } from "@txtskills/ui/spinner";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@txtskills/ui/collapsible";
import { ScrollArea } from "@txtskills/ui/scroll-area";
import { Alert, AlertDescription } from "@txtskills/ui/alert";
import { UsageModeNav } from "@/components/usage-mode-nav";
import { TopLinksNav } from "@/components/top-links-nav";

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
  originalRequestedName?: string; // Set when name was changed due to conflict from different source
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

const ASCII_PIXEL_FONT: Record<string, string[]> = {
  t: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  x: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  s: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  k: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  i: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  l: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
};

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
  const [customName, setCustomName] = useState("");
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [logoHoverX, setLogoHoverX] = useState<number | null>(null);

  // Fetch existing skills to check for duplicate names
  const { skills: existingSkills } = useSkillsCache();
  const isDuplicateName = customName.trim() && existingSkills.some(
    (s) => s.name.toLowerCase() === customName.trim().toLowerCase()
  );

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
          forceRegenerate,
          ...(customName ? { customName } : {})
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
        fetch('/api/skills/manifest', { method: 'POST' }).catch(() => { });
      }
      // Auto-expand preview when publish failed (no install command available)
      if (data.publishFailed) {
        setPreviewOpen(true);
      }
      setState("success");
    } catch (err: unknown) {
      setError({
        type: "api",
        message: getErrorMessage(err),
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
    setCustomName("");
  };

  const getCustomNameError = (name: string): string | null => {
    if (!name) return null;
    if (name.length > 64) return "Must be 64 characters or fewer";
    if (!/^[a-z0-9-]+$/.test(name)) return "Only lowercase letters, numbers, and hyphens allowed";
    if (name.startsWith("-")) return "Must not start with a hyphen";
    if (name.endsWith("-")) return "Must not end with a hyphen";
    if (name.includes("--")) return "Must not contain consecutive hyphens";
    return null;
  };

  const customNameError = getCustomNameError(customName);
  const hasInput = activeTab === "url" ? url.trim().length > 0 : content.trim().length > 0;
  const isValid = hasInput && !customNameError;
  const bitmapRows = Array.from({ length: 7 }, (_, row) =>
    "txtskills"
      .split("")
      .map((char) => ASCII_PIXEL_FONT[char]?.[row] ?? "00000")
      .join("0")
  );
  const bitmapCols = bitmapRows[0]?.length ?? 0;
  const pixelSize = 8;
  const pixelGap = 1;
  const cell = pixelSize + pixelGap;
  const viewBoxWidth = bitmapCols * cell - pixelGap;
  const viewBoxHeight = bitmapRows.length * cell - pixelGap;
  const isLogoLoading = state === "loading";

  return (
    <main className="relative min-h-screen bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.14),transparent_55%)]" />
      <div className="max-w-4xl mx-auto px-5 py-8 md:px-6 md:py-16">

        {/* Header */}
        <header className="mb-16 relative ui-enter">
          <div className="mb-8 flex items-center justify-end">
            <TopLinksNav />
          </div>

          <div className="mb-8 flex justify-center">
            <UsageModeNav active="web" />
          </div>

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
              <h1 className="sr-only" itemProp="name">txtskills</h1>
              <svg
                aria-hidden="true"
                viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                className="mb-3 h-auto w-[280px] max-w-full sm:w-[340px] md:w-[480px] lg:w-[580px]"
                role="img"
                style={{ filter: "drop-shadow(0 1px 0 rgba(255,255,255,0.08)) drop-shadow(0 8px 18px rgba(0,0,0,0.28))" }}
                onPointerEnter={(e) => {
                  setIsLogoHovered(true);
                  const rect = e.currentTarget.getBoundingClientRect();
                  const normalizedX = ((e.clientX - rect.left) / rect.width) * viewBoxWidth;
                  setLogoHoverX(normalizedX);
                }}
                onPointerMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const normalizedX = ((e.clientX - rect.left) / rect.width) * viewBoxWidth;
                  setLogoHoverX(normalizedX);
                }}
                onPointerLeave={() => {
                  setIsLogoHovered(false);
                  setLogoHoverX(null);
                }}
              >
                <defs>
                  <linearGradient id="logoToneGradient" x1="0" y1="0" x2={viewBoxWidth} y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="rgba(184, 184, 189, 0.74)" />
                    <stop offset="14%" stopColor="rgba(232, 232, 236, 0.9)" />
                    <stop offset="50%" stopColor="rgba(255, 255, 255, 0.98)" />
                    <stop offset="86%" stopColor="rgba(232, 232, 236, 0.9)" />
                    <stop offset="100%" stopColor="rgba(184, 184, 189, 0.74)" />
                  </linearGradient>
                  <linearGradient id="logoLoadingGradient" x1="0" y1="0" x2={viewBoxWidth} y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="rgba(170, 171, 178, 0.78)" />
                    <stop offset="24%" stopColor="rgba(221, 225, 238, 0.92)" />
                    <stop offset="50%" stopColor="rgba(244, 247, 255, 1)" />
                    <stop offset="76%" stopColor="rgba(221, 225, 238, 0.92)" />
                    <stop offset="100%" stopColor="rgba(170, 171, 178, 0.78)" />
                  </linearGradient>
                </defs>
                {bitmapRows.map((row, rowIndex) =>
                  row.split("").map((bit, colIndex) => {
                    if (bit !== "1") return null;

                    const pixelCenterX = colIndex * cell + pixelSize / 2;
                    const hoverInfluence =
                      !isLogoLoading && isLogoHovered && logoHoverX !== null
                        ? Math.max(0, 1 - Math.abs(pixelCenterX - logoHoverX) / (cell * 6.5))
                        : 0;
                    const idleOpacity = Math.min(1, 0.76 + hoverInfluence * 0.28);

                    return (
                      <rect
                        key={`${rowIndex}-${colIndex}`}
                        x={colIndex * cell}
                        y={rowIndex * cell}
                        width={pixelSize}
                        height={pixelSize}
                        rx={0.8}
                        fill={isLogoLoading ? "url(#logoLoadingGradient)" : "url(#logoToneGradient)"}
                        data-logo-pixel="1"
                        style={
                          isLogoLoading
                            ? {
                                animation: "logoShimmer 1700ms cubic-bezier(0.22, 1, 0.36, 1) infinite",
                                animationDelay: `${colIndex * 26}ms`,
                                opacity: 0.58,
                              }
                            : {
                                opacity: idleOpacity,
                                transition: "opacity 120ms linear",
                              }
                        }
                      />
                    );
                  })
                )}
              </svg>
            </div>

            <p className="text-muted-foreground tracking-[0.3em] text-xs uppercase mt-4 font-mono">
              llms.txt → agent skills
            </p>

            <p className="text-pretty text-lg md:text-xl text-muted-foreground max-w-xl mt-6 leading-relaxed mx-auto md:mx-0">
              Convert any <a href="https://llmstxt.org/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity"><code className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono border border-border/50">llms.txt</code></a> documentation into an installable <a href="https://agentskills.io/home" target="_blank" rel="noopener noreferrer" className="text-foreground border-b border-border hover:border-foreground transition-colors pb-0.5">skill</a> for AI agents.
            </p>
          </div>

          {/* Decorative corner elements */}
          <div className="absolute top-0 right-0 w-16 h-16 border-t border-r border-border/30 rounded-tr-lg pointer-events-none hidden md:block opacity-50" />
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b border-l border-border/30 rounded-bl-lg pointer-events-none hidden md:block opacity-50" />
        </header>

        {/* Input State */}
        {state === "input" && (
          <div className="space-y-10 ui-enter-delayed">
            <section className="rounded-2xl border border-border/50 bg-card/40 p-4 shadow-sm transition-colors hover:border-border/70 sm:p-6">
              <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-4">
                Enter Source
              </h2>

              <Tabs defaultValue="url" onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTab value="url" className="transition-transform duration-150 active:scale-[0.97]">URL</TabsTab>
                  <TabsTab value="paste" className="transition-transform duration-150 active:scale-[0.97]">Paste Content</TabsTab>
                </TabsList>

                <TabsPanel value="url" className="tab-panel-enter">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex-1 relative">
                      <GlobeIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        type="url"
                        placeholder="https://docs.example.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (isValid) {
                              handleSubmit();
                            }
                          }
                        }}
                        className="pl-11 font-mono h-12 w-full bg-card border-border"
                        autoComplete="off"
                        spellCheck="false"
                      />
                    </div>
                    <Button
                      onClick={() => handleSubmit()}
                      disabled={!isValid}
                      className="h-12 px-6 font-mono tracking-wide text-sm gap-2.5 shadow-none hover:shadow-none transition-colors bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-900"
                    >
                      Convert
                      <span className="text-zinc-400 dark:text-zinc-500 text-xs">→</span>
                    </Button>
                  </div>
                  <div className="grid transition-all duration-300 ease-in-out" style={{ gridTemplateRows: url.trim() ? '1fr' : '0fr' }}>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs text-muted-foreground/50 shrink-0">as</span>
                        <Input
                          type="text"
                          placeholder="custom-skill-name (optional)"
                          value={customName}
                          onChange={(e) => {
                            const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                            setCustomName(sanitized);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (isValid) {
                                handleSubmit();
                              }
                            }
                          }}
                          maxLength={64}
                          className={`font-mono h-9 text-xs max-w-[260px] bg-card text-muted-foreground focus:text-foreground ${customNameError ? 'border-red-400/30 focus-visible:ring-red-400/10' : 'border-border/50'}`}
                          autoComplete="off"
                          spellCheck="false"
                        />
                      </div>
                      {customNameError && (
                        <p className="text-[11px] text-red-400/50 mt-1 ml-6">{customNameError}</p>
                      )}
                      {!customNameError && isDuplicateName && (
                        <p className="text-[11px] text-amber-400/60 mt-1 ml-6">This name exists — will update if same source, or rename if different</p>
                      )}
                    </div>
                  </div>
                </TabsPanel>

                <TabsPanel value="paste" className="tab-panel-enter">
                  <Textarea
                    placeholder="# Project Name&#10;> Description&#10;&#10;## Section&#10;- [Link](url): Notes"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        if (isValid) {
                          handleSubmit();
                        }
                      }
                    }}
                    className="min-h-[200px] font-mono text-sm bg-card border-border mb-4"
                  />
                  <div className="grid transition-all duration-300 ease-in-out" style={{ gridTemplateRows: content.trim() ? '1fr' : '0fr' }}>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground/50 shrink-0">as</span>
                        <Input
                          type="text"
                          placeholder="custom-skill-name (optional)"
                          value={customName}
                          onChange={(e) => {
                            const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                            setCustomName(sanitized);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (isValid) {
                                handleSubmit();
                              }
                            }
                          }}
                          maxLength={64}
                          className={`font-mono h-9 text-xs max-w-[260px] bg-card text-muted-foreground focus:text-foreground ${customNameError ? 'border-red-400/30 focus-visible:ring-red-400/10' : 'border-border/50'}`}
                          autoComplete="off"
                          spellCheck="false"
                        />
                      </div>
                      {customNameError && (
                        <p className="text-[11px] text-red-400/50 mb-3 ml-6">{customNameError}</p>
                      )}
                      {!customNameError && isDuplicateName && (
                        <p className="text-[11px] text-amber-400/60 mb-3 ml-6">This name exists — will update if same source, or rename if different</p>
                      )}
                      {!customNameError && !isDuplicateName && <div className="mb-3" />}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleSubmit()}
                    disabled={!isValid}
                    className="h-12 w-full sm:w-auto px-6 font-mono tracking-wide text-sm gap-2.5 shadow-none hover:shadow-none transition-colors bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-900"
                  >
                    Convert
                    <span className="text-zinc-400 dark:text-zinc-500 text-xs">→</span>
                  </Button>
                </TabsPanel>
              </Tabs>

            </section>

            {/* Works With - Agent Compatibility */}
            <section className="space-y-4">
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold opacity-70">Works with</span>
              <div className="flex flex-wrap items-center gap-3">
                {/* Claude Code */}
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border/40 hover:border-border/70 hover:bg-muted/50 transition-colors cursor-default group">
                  <ClaudeIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">Claude Code</span>
                </div>
                {/* Cursor */}
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border/40 hover:border-border/70 hover:bg-muted/50 transition-colors cursor-default group">
                  <CursorIcon className="w-4 h-4 text-foreground group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">Cursor</span>
                </div>
                {/* Windsurf */}
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border/40 hover:border-border/70 hover:bg-muted/50 transition-colors cursor-default group">
                  <WindsurfIcon className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">Windsurf</span>
                </div>
                {/* GitHub Copilot */}
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border/40 hover:border-border/70 hover:bg-muted/50 transition-colors cursor-default group">
                  <CopilotIcon className="w-4 h-4 text-foreground group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">Copilot</span>
                </div>
                {/* Amp */}
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border/40 hover:border-border/70 hover:bg-muted/50 transition-colors cursor-default group">
                  <AmpIcon className="w-4 h-4 text-foreground group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">Amp</span>
                </div>
                {/* Antigravity */}
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border/40 hover:border-border/70 hover:bg-muted/50 transition-colors cursor-default group">
                  <AntigravityIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">Antigravity</span>
                </div>
                {/* More */}
                <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground/60 border border-transparent select-none">
                  <span className="text-xs font-medium">+ more</span>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Loading State */}
        {state === "loading" && (
          <div className="space-y-8 rounded-2xl border border-border/50 bg-card/40 p-5 shadow-sm sm:p-6 ui-enter-delayed">
            <div className="flex items-center gap-4">
              <Spinner name="braille" className="h-5 w-5 text-lg" ariaLabel="Converting skill" />
              <span className="text-lg">{steps[loadingStep]}...</span>
            </div>
            <Progress value={((loadingStep + 1) / steps.length) * 100} className="h-1" />
            <div className="flex flex-wrap gap-4 text-sm">
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
          <div className="space-y-12 ui-enter-delayed">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
              Back
            </button>
            <section className="border border-border/60 rounded-2xl overflow-hidden bg-card/50 backdrop-blur-sm transition-all shadow-sm">
              {/* Header */}
              <div className="px-6 py-5 border-b border-border/40 flex items-center justify-between bg-gradient-to-b from-muted/20 to-transparent">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="font-mono font-semibold text-base">{result.skillName}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {result.publishFailed ? (
                        <span className="flex items-center gap-1.5 text-red-500/80">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
                          Publish failed
                        </span>
                      ) : result.alreadyExists && result.contentChanged ? (
                        <span className="flex items-center gap-1.5 text-amber-600/80 dark:text-amber-500/70">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
                          Content changed
                          {result.existingMetadata?.updatedAt && (
                            <span className="text-muted-foreground/50">
                              · {new Date(result.existingMetadata.updatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </span>
                      ) : result.alreadyExists ? (
                        <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                          Up to date
                          {result.existingMetadata?.updatedAt && (
                            <span className="text-muted-foreground/50">
                              · {new Date(result.existingMetadata.updatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </span>
                      ) : result.isUpdate ? (
                        <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                          Updated
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-emerald-600/80 dark:text-emerald-500/80">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" /></svg>
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
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border/50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
                    View Source
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

                {result.originalRequestedName && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" /></svg>
                    Name &ldquo;{result.originalRequestedName}&rdquo; was already taken by a different source, so we published as &ldquo;{result.skillName}&rdquo; instead.
                  </div>
                )}

                {result.command ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Install Command</label>
                    </div>
                    <div className="relative group">
                      {/* Terminal-style command box with subtle depth */}
                      <div className="relative flex items-center gap-3 bg-zinc-100/70 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-700/40 rounded-xl p-4 font-mono text-sm shadow-[inset_0_1px_1px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]">
                        <span className="text-zinc-400 dark:text-zinc-500 select-none font-medium">$</span>
                        <span className="flex-1 overflow-x-auto scrollbar-hide selection:bg-primary/20 text-zinc-700 dark:text-zinc-200">{result.command}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleCopy}
                          aria-label={copied ? "Copied" : "Copy generated command"}
                          className="h-8 w-8 shrink-0 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 rounded-lg transition-all"
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
                <Button
                  onClick={handleRegenerate}
                  className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-900"
                >
                  Regenerate
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleReset}
                className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Convert Another
              </Button>
            </div>
          </div>
        )}

        {/* Error State */}
        {state === "error" && error && (
          <div className="space-y-6 rounded-2xl border border-border/50 bg-card/40 p-5 shadow-sm sm:p-6 ui-enter-delayed">
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

      </div>

      <style jsx>{`
        @keyframes logoShimmer {
          0%,
          100% {
            opacity: 0.5;
          }
          45% {
            opacity: 0.96;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-logo-pixel='1'] {
            animation: none !important;
            transition: none !important;
            opacity: 0.82 !important;
          }
        }
      `}</style>
    </main>
  );
}
