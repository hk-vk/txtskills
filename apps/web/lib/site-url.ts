const FALLBACK_PRODUCTION_SITE_URL = "https://txtskills.hari.works";
const LOCAL_SITE_URL = "http://localhost:3000";

export function getSiteUrl(): string {
  if (process.env.NODE_ENV === "development") {
    return LOCAL_SITE_URL;
  }

  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (!configured) {
    return FALLBACK_PRODUCTION_SITE_URL;
  }

  try {
    const url = new URL(configured);

    // Cloudflare preview/deployment URLs are not our canonical share URLs.
    if (url.hostname.endsWith(".pages.dev")) {
      return FALLBACK_PRODUCTION_SITE_URL;
    }

    return url.origin;
  } catch {
    return FALLBACK_PRODUCTION_SITE_URL;
  }
}
