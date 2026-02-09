import { mkdtemp, writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  GITHUB_API,
  GITHUB_RAW,
  DEFAULT_OWNER,
  DEFAULT_REPO,
  DEFAULT_BRANCH,
  MANIFEST_FILE,
  getApiHeaders,
} from "./config.js";

export interface GitHubContentItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: "file" | "dir" | "symlink";
}

export interface SkillManifestEntry {
  name: string;
  description?: string;
  sourceUrl?: string | null;
  generated?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Parse rate limit info from response headers
 */
function parseRateLimit(response: Response): RateLimitInfo {
  return {
    limit: parseInt(response.headers.get("x-ratelimit-limit") || "60", 10),
    remaining: parseInt(
      response.headers.get("x-ratelimit-remaining") || "0",
      10
    ),
    reset: parseInt(response.headers.get("x-ratelimit-reset") || "0", 10),
  };
}

/**
 * Fetch the skills manifest (skills.json) from the repo
 */
export async function fetchManifest(
  owner = DEFAULT_OWNER,
  repo = DEFAULT_REPO,
  branch = DEFAULT_BRANCH
): Promise<SkillManifestEntry[]> {
  const url = `${GITHUB_RAW}/${owner}/${repo}/${branch}/${MANIFEST_FILE}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      // No manifest, fall back to listing directories
      return [];
    }
    throw new Error(
      `Failed to fetch manifest: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  // The manifest wraps skills in a "skills" key
  if (data && typeof data === "object" && Array.isArray(data.skills)) {
    return data.skills;
  }
  // Direct array format
  if (Array.isArray(data)) {
    return data;
  }
  // Object with skill names as keys
  return Object.entries(data).map(([name, value]) => ({
    name,
    ...(typeof value === "object" && value !== null ? value : {}),
  })) as SkillManifestEntry[];
}

/**
 * List available skill directories from the repo root
 */
export async function listSkillDirs(
  owner = DEFAULT_OWNER,
  repo = DEFAULT_REPO
): Promise<{ items: GitHubContentItem[]; rateLimit: RateLimitInfo }> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/`;
  const response = await fetch(url, { headers: getApiHeaders() });

  if (!response.ok) {
    throw new Error(
      `Failed to list repo contents: ${response.status} ${response.statusText}`
    );
  }

  const rateLimit = parseRateLimit(response);
  const data: GitHubContentItem[] = await response.json();

  // Filter to directories only, exclude dotfiles, README, etc.
  const skillDirs = data.filter(
    (item) =>
      item.type === "dir" &&
      !item.name.startsWith(".") &&
      !item.name.startsWith("_")
  );

  return { items: skillDirs, rateLimit };
}

/**
 * List files in a specific skill directory
 */
export async function listSkillFiles(
  skillName: string,
  owner = DEFAULT_OWNER,
  repo = DEFAULT_REPO
): Promise<{ items: GitHubContentItem[]; rateLimit: RateLimitInfo }> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(skillName)}`;
  const response = await fetch(url, { headers: getApiHeaders() });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Skill "${skillName}" not found in ${owner}/${repo}`);
    }
    throw new Error(
      `Failed to list skill files: ${response.status} ${response.statusText}`
    );
  }

  const rateLimit = parseRateLimit(response);
  const data: GitHubContentItem[] = await response.json();

  return { items: data, rateLimit };
}

/**
 * Download a single skill folder to a temporary directory.
 * Returns the path to the skill folder inside the temp dir.
 */
export async function downloadSkillFolder(
  skillName: string,
  owner = DEFAULT_OWNER,
  repo = DEFAULT_REPO,
  branch = DEFAULT_BRANCH
): Promise<{ skillPath: string; tempDir: string; fileCount: number }> {
  // List files in the skill directory
  const { items } = await listSkillFiles(skillName, owner, repo);

  // Create temp directory
  const tempDir = await mkdtemp(join(tmpdir(), "txtskills-"));
  const skillDir = join(tempDir, skillName);
  await mkdir(skillDir, { recursive: true });

  let fileCount = 0;

  // Download all files recursively
  await downloadItems(items, skillDir, owner, repo, branch);
  fileCount = countFiles(items);

  return { skillPath: skillDir, tempDir, fileCount };
}

/**
 * Recursively download items (files and directories) to a local path
 */
async function downloadItems(
  items: GitHubContentItem[],
  localDir: string,
  owner: string,
  repo: string,
  branch: string
): Promise<void> {
  const downloadPromises = items.map(async (item) => {
    if (item.type === "file" && item.download_url) {
      // Download file from raw.githubusercontent.com (no API rate limit)
      const response = await fetch(item.download_url);
      if (!response.ok) {
        throw new Error(`Failed to download ${item.name}: ${response.status}`);
      }
      const content = await response.arrayBuffer();
      await writeFile(join(localDir, item.name), Buffer.from(content));
    } else if (item.type === "dir") {
      // Create subdirectory and recursively download
      const subDir = join(localDir, item.name);
      await mkdir(subDir, { recursive: true });

      const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${item.path}`;
      const response = await fetch(url, { headers: getApiHeaders() });

      if (!response.ok) {
        throw new Error(
          `Failed to list directory ${item.path}: ${response.status}`
        );
      }

      const subItems: GitHubContentItem[] = await response.json();
      await downloadItems(subItems, subDir, owner, repo, branch);
    }
  });

  await Promise.all(downloadPromises);
}

/**
 * Count files in a list of items (recursively counts dirs as their contents)
 */
function countFiles(items: GitHubContentItem[]): number {
  return items.reduce((count, item) => {
    if (item.type === "file") return count + 1;
    return count + 1; // Approximate for dirs
  }, 0);
}

/**
 * Clean up temporary directory
 */
export async function cleanupTempDir(tempDir: string): Promise<void> {
  await rm(tempDir, { recursive: true, force: true });
}

/**
 * Check if a skill exists in the repo
 */
export async function skillExists(
  skillName: string,
  owner = DEFAULT_OWNER,
  repo = DEFAULT_REPO
): Promise<boolean> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(skillName)}`;
  const response = await fetch(url, {
    method: "HEAD",
    headers: getApiHeaders(),
  });
  return response.ok;
}
