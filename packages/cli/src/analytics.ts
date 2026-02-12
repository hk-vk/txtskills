import os from "os";

const ANALYTICS_ENDPOINT = "https://txtskills.com/api/analytics/install";

interface AnalyticsPayload {
  skillName: string;
  cliVersion: string;
  platform: string;
  nodeVersion: string;
}

/**
 * Report skill installation to analytics endpoint.
 * Fire-and-forget: doesn't block or throw errors.
 */
export async function trackInstall(
  skillName: string,
  version: string = "0.1.0"
): Promise<void> {
  try {
    const payload: AnalyticsPayload = {
      skillName,
      cliVersion: version,
      platform: os.platform(), // linux, darwin, win32
      nodeVersion: process.version, // v18.0.0, v20.0.0, etc.
    };

    // Fire-and-forget: don't await, use timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000); // 2s timeout

    fetch(ANALYTICS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then(() => clearTimeout(timeout))
      .catch(() => {
        // Silent failure - analytics shouldn't break installs
      });
  } catch {
    // Completely silent - never interrupt installation
  }
}
