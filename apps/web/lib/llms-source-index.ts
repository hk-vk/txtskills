interface AutocompleteIndexPayload {
  crawlId: string;
  generatedAt: string;
  totalHosts: number;
  hosts: string[];
}

interface HostMatch {
  host: string;
  url: string;
}

interface IndexState {
  loadedAt: number;
  data: AutocompleteIndexPayload;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_LIMIT = 8;

let cache: IndexState | null = null;
let inflightLoad: Promise<IndexState> | null = null;

function normalizeQuery(input: string): string {
  let value = input.trim().toLowerCase();
  if (!value) return "";
  value = value.replace(/^https?:\/\//, "");
  value = value.replace(/^www\./, "");
  const slashIndex = value.indexOf("/");
  if (slashIndex >= 0) value = value.slice(0, slashIndex);
  return value;
}

async function loadIndexFromRemote(): Promise<AutocompleteIndexPayload> {
  const baseUrl = process.env.LLMS_INDEX_BASE_URL;
  if (!baseUrl) {
    return { crawlId: "", generatedAt: "", totalHosts: 0, hosts: [] };
  }

  const url = `${baseUrl.replace(/\/$/, "")}/llms-autocomplete.json`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch llms autocomplete index: ${response.status}`);
  }

  const payload = (await response.json()) as AutocompleteIndexPayload;
  if (!Array.isArray(payload.hosts)) {
    throw new Error("Invalid llms autocomplete payload.");
  }

  return {
    crawlId: payload.crawlId || "",
    generatedAt: payload.generatedAt || "",
    totalHosts: Number(payload.totalHosts || payload.hosts.length || 0),
    hosts: payload.hosts.filter((entry) => typeof entry === "string")
  };
}

async function getIndexState(): Promise<IndexState> {
  const ttlMs = Number(process.env.LLMS_INDEX_CACHE_TTL_MS || DEFAULT_TTL_MS);
  if (cache && Date.now() - cache.loadedAt <= ttlMs) {
    return cache;
  }

  if (!inflightLoad) {
    inflightLoad = loadIndexFromRemote()
      .then((data) => {
        cache = { loadedAt: Date.now(), data };
        return cache;
      })
      .finally(() => {
        inflightLoad = null;
      });
  }

  try {
    return await inflightLoad;
  } catch (error) {
    if (cache) {
      return cache;
    }
    throw error;
  }
}

export async function autocompleteHosts(input: string, limit = DEFAULT_LIMIT) {
  const query = normalizeQuery(input);
  if (!query) {
    return {
      query,
      matches: [] as HostMatch[],
      crawlId: cache?.data.crawlId || "",
      generatedAt: cache?.data.generatedAt || ""
    };
  }

  const state = await getIndexState();
  const normalizedLimit = Math.max(1, Math.min(50, Number(limit) || DEFAULT_LIMIT));

  const startsWith: HostMatch[] = [];
  const contains: HostMatch[] = [];

  for (const host of state.data.hosts) {
    if (host.startsWith(query)) {
      startsWith.push({ host, url: `https://${host}` });
    } else if (host.includes(query)) {
      contains.push({ host, url: `https://${host}` });
    }

    if (startsWith.length >= normalizedLimit && contains.length >= normalizedLimit) {
      break;
    }
  }

  const matches = startsWith.concat(contains).slice(0, normalizedLimit);
  return {
    query,
    matches,
    crawlId: state.data.crawlId,
    generatedAt: state.data.generatedAt
  };
}
