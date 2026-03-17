import * as p from "@clack/prompts";
import pc from "picocolors";
import { addCommand } from "./add.js";

interface ConvertOptions {
  api?: string;
  name?: string;
  force?: boolean;
  json?: boolean;
  install?: boolean;
  skipInstall?: boolean;
  global?: boolean;
  agent?: string[];
  yes?: boolean;
}

interface ConvertResponse {
  success: boolean;
  command?: string;
  githubUrl?: string;
  skillName: string;
  skillContent: string;
  isUpdate?: boolean;
  alreadyExists?: boolean;
  contentChanged?: boolean;
  publishFailed?: boolean;
  originalRequestedName?: string;
  error?: {
    type: string;
    message: string;
  };
}

const DEFAULT_CONVERT_API = "https://txtskills.hari.works/api/convert";

function ensureProtocol(input: string): string {
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(input)) {
    return input;
  }
  return `https://${input}`;
}

function normalizeUrlInput(input: string): string {
  const value = input.trim();
  if (!value) {
    throw new Error("URL is required");
  }

  const parsed = new URL(ensureProtocol(value));
  parsed.hash = "";
  parsed.search = "";

  if (parsed.pathname !== "/") {
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
  }

  return parsed.toString();
}

function isExplicitLlmsPath(url: URL): boolean {
  const path = url.pathname.replace(/\/+$/, "");
  return /(?:^|\/)\.well-known\/llms(?:-full)?\.txt$|(?:^|\/)llms(?:-full)?\.txt$/i.test(
    path
  );
}

function buildUrlCandidates(normalizedInput: string): string[] {
  const parsed = new URL(normalizedInput);
  const candidates: string[] = [];
  const add = (value: string) => {
    if (!candidates.includes(value)) {
      candidates.push(value);
    }
  };

  if (isExplicitLlmsPath(parsed)) {
    add(parsed.toString());
    return candidates;
  }

  const base = parsed.toString().replace(/\/+$/, "");
  add(base);
  add(`${base}/llms.txt`);
  add(`${base}/.well-known/llms.txt`);
  add(`${base}/llms-full.txt`);
  add(`${base}/.well-known/llms-full.txt`);

  if (parsed.pathname !== "/") {
    add(`${parsed.origin}/llms.txt`);
    add(`${parsed.origin}/.well-known/llms.txt`);
    add(`${parsed.origin}/llms-full.txt`);
    add(`${parsed.origin}/.well-known/llms-full.txt`);
  }

  return candidates;
}

function resolveConvertEndpoint(apiOption?: string): string {
  if (!apiOption) return DEFAULT_CONVERT_API;

  const trimmed = apiOption.trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_CONVERT_API;

  if (trimmed.endsWith("/api/convert")) {
    return trimmed;
  }

  return `${trimmed}/api/convert`;
}

async function callConvertApi(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<ConvertResponse> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Unexpected response from convert API (${response.status})`);
  }

  const data = (await response.json()) as ConvertResponse;

  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || "Conversion failed");
  }

  return data;
}

export async function convertCommand(
  urlInput: string | undefined,
  options: ConvertOptions
): Promise<void> {
  let input = urlInput;

  if (!input) {
    const entered = await p.text({
      message: "Enter docs base URL or llms.txt URL",
      placeholder: "github.com/llms.txt or docs.anthropic.com",
    });

    if (p.isCancel(entered) || !entered) {
      p.outro(pc.dim("Cancelled"));
      return;
    }

    input = entered;
  }

  const normalizedInput = normalizeUrlInput(input);
  const urlCandidates = buildUrlCandidates(normalizedInput);
  const endpoint = resolveConvertEndpoint(options.api);

  p.log.info(`${pc.dim("Convert API:")} ${pc.underline(endpoint)}`);
  p.log.info(`${pc.dim("Input:")} ${normalizedInput}`);

  const spinner = p.spinner();
  spinner.start("Converting to skill...");

  let result: ConvertResponse | null = null;
  let successfulUrl: string | null = null;
  let lastError: string | null = null;

  for (const candidateUrl of urlCandidates) {
    try {
      result = await callConvertApi(endpoint, {
        type: "url",
        url: candidateUrl,
        ...(options.name ? { customName: options.name } : {}),
        ...(options.force ? { forceRegenerate: true } : {}),
      });
      successfulUrl = candidateUrl;
      break;
    } catch (error: any) {
      lastError = error?.message || "Conversion failed";
    }
  }

  if (!result || !successfulUrl) {
    spinner.stop(pc.red("Conversion failed"));
    throw new Error(lastError || "Could not convert URL to a skill");
  }

  spinner.stop(pc.green(`Converted ${result.skillName}`));

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          usedUrl: successfulUrl,
          ...result,
        },
        null,
        2
      )
    );
    return;
  }

  if (successfulUrl !== normalizedInput) {
    p.log.info(`${pc.dim("Resolved URL:")} ${successfulUrl}`);
  }

  if (result.originalRequestedName) {
    p.log.warn(
      `Requested name \"${result.originalRequestedName}\" was taken by another source; published as \"${result.skillName}\"`
    );
  }

  if (result.githubUrl) {
    p.log.info(`${pc.dim("GitHub:")} ${pc.underline(result.githubUrl)}`);
  }

  if (result.command) {
    p.log.step(`${pc.dim("Install:")} ${pc.cyan(result.command)}`);
  }

  if (result.publishFailed) {
    p.log.warn("Skill was generated but publish to GitHub failed");
  }

  if (result.alreadyExists && result.contentChanged && !options.force) {
    p.log.warn(
      "Skill already exists and source changed. Re-run with --force to regenerate."
    );
  } else if (result.alreadyExists) {
    p.log.info("Skill already exists and is up to date.");
  } else if (result.isUpdate) {
    p.log.info("Existing skill updated.");
  } else {
    p.log.success("Skill published and ready to install.");
  }

  const canInstall = Boolean(result.command) && !result.publishFailed;
  if (!canInstall || !result.skillName) {
    return;
  }

  let shouldInstall = false;

  if (options.install || options.yes) {
    shouldInstall = true;
  } else if (options.skipInstall) {
    shouldInstall = false;
  } else {
    const confirmInstall = await p.confirm({
      message: `Install ${result.skillName} now via CLI?`,
    });

    if (p.isCancel(confirmInstall)) {
      p.log.info(pc.dim("Install skipped."));
      return;
    }

    shouldInstall = Boolean(confirmInstall);
  }

  if (!shouldInstall) {
    p.log.info(pc.dim("Install skipped."));
    return;
  }

  p.log.step(`Installing ${pc.cyan(result.skillName)}...`);
  await addCommand(result.skillName, {
    yes: true,
    global: options.global,
    agent: options.agent,
  });
}
