/** Default GitHub owner for the skills registry */
export const DEFAULT_OWNER = "hk-vk";

/** Default GitHub repo for the skills registry */
export const DEFAULT_REPO = "skills";

/** Default branch */
export const DEFAULT_BRANCH = "main";

/** GitHub API base URL */
export const GITHUB_API = "https://api.github.com";

/** GitHub raw content base URL */
export const GITHUB_RAW = "https://raw.githubusercontent.com";

/** Skills manifest filename */
export const MANIFEST_FILE = "skills.json";

/** Get the GitHub token from environment if available */
export function getGitHubToken(): string | undefined {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
}

/** Build common headers for GitHub API requests */
export function getApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "txtskills-cli",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const token = getGitHubToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}
