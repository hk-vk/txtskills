import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DuckDBInstance } from "@duckdb/node-api";
import initSqlJs from "sql.js";

const COLLECTIONS_URL = "https://index.commoncrawl.org/collinfo.json";
const TARGET_PATHS = new Map([
  ["/llms.txt", "llms"],
  ["/.well-known/llms.txt", "llms"],
  ["/llms-full.txt", "llms-full"],
  ["/.well-known/llms-full.txt", "llms-full"]
]);

interface CollectionInfo {
  id: string;
  name: string;
}

interface CrawlRow {
  url: string;
  url_path: string;
  url_host_registered_domain: string;
  fetch_status: number;
  fetch_time: string;
  content_mime_type?: string | null;
  content_mime_detected?: string | null;
}

interface CrawlResult {
  url: string;
  host: string;
  path: string;
  kind: string;
  fetchStatus?: number;
  fetchTime?: string;
  contentType?: string | null;
}

interface LiveResult {
  url: string;
  status: number;
  checkedAt: string;
}

interface AutocompletePayload {
  crawlId: string;
  generatedAt: string;
  totalHosts: number;
  hosts: string[];
}

const config = {
  outputDir: process.env.OUTPUT_DIR || path.resolve(process.cwd(), "output"),
  crawlId: process.env.CC_CRAWL_ID,
  crawlIds: process.env.CC_CRAWL_IDS,
  recentCollections: Number(process.env.RECENT_COLLECTIONS || 8),
  maxFiles: Number(process.env.MAX_FILES || 200),
  verifyLimit: Number(process.env.VERIFY_LIMIT || 0),
  verifyConcurrency: Number(process.env.VERIFY_CONCURRENCY || 12),
  timeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 10000),
  fileSelectionStrategy: process.env.FILE_SELECTION_STRATEGY || "spread",
  artifactPrefix: process.env.ARTIFACT_PREFIX || "llms-index",
  publishR2: process.env.PUBLISH_R2 === "true",
  r2Endpoint: process.env.R2_ENDPOINT,
  r2Bucket: process.env.R2_BUCKET,
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  r2PublicBaseUrl: process.env.R2_PUBLIC_BASE_URL
};

const normalizeUrl = (value: string) => {
  const trimmed = value.trim().replace(/\s+/g, "");
  if (!trimmed) return trimmed;
  try {
    const parsed = new URL(trimmed);
    const normalizedPath = parsed.pathname.replace(/\/$/, "");
    return `${parsed.host.toLowerCase()}${normalizedPath}${parsed.search}`;
  } catch {
    return trimmed.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
};

const normalizeHost = (value: string) => value.trim().toLowerCase().replace(/^www\./, "");

async function getLatestCollection(): Promise<CollectionInfo> {
  const response = await fetch(COLLECTIONS_URL);
  if (!response.ok) {
    throw new Error(`Failed to load Common Crawl collections: ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data) || !data[0]?.id) {
    throw new Error("Invalid Common Crawl collection response.");
  }

  return data[0] as CollectionInfo;
}

async function getRecentCollections(limit: number): Promise<CollectionInfo[]> {
  const response = await fetch(COLLECTIONS_URL);
  if (!response.ok) {
    throw new Error(`Failed to load Common Crawl collections: ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("Invalid Common Crawl collection response.");
  }

  return data
    .filter((entry) => entry?.id)
    .slice(0, Math.max(1, limit)) as CollectionInfo[];
}

async function fetchIndexPaths(crawlId: string): Promise<string[]> {
  const listUrl = `https://data.commoncrawl.org/crawl-data/${crawlId}/cc-index-table.paths.gz`;
  const response = await fetch(listUrl);
  if (!response.ok) {
    throw new Error(`Failed to load index paths: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const content = zlib.gunzipSync(buffer).toString("utf8");
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `https://data.commoncrawl.org/${line}`);
}

function pickIndexPaths(indexPaths: string[], maxFiles: number, strategy: string): string[] {
  if (maxFiles <= 0 || maxFiles >= indexPaths.length) {
    return indexPaths;
  }

  if (strategy === "first") {
    return indexPaths.slice(0, maxFiles);
  }

  const picked: string[] = [];
  const last = indexPaths.length - 1;
  for (let i = 0; i < maxFiles; i++) {
    const ratio = maxFiles === 1 ? 0 : i / (maxFiles - 1);
    const idx = Math.floor(ratio * last);
    picked.push(indexPaths[idx]);
  }

  return Array.from(new Set(picked));
}

async function createDuckDbConnection() {
  const instance = await DuckDBInstance.create(":memory:");
  return instance.connect();
}

async function extractFromParquet(
  connection: Awaited<ReturnType<typeof createDuckDbConnection>>,
  fileUrl: string
): Promise<CrawlResult[]> {
  const pathList = Array.from(TARGET_PATHS.keys())
    .map((entry) => `'${entry.replace(/'/g, "''")}'`)
    .join(", ");
  const query = `
    SELECT
      url,
      url_path,
      url_host_registered_domain,
      fetch_status,
      fetch_time,
      content_mime_type,
      content_mime_detected
    FROM read_parquet('${fileUrl}')
    WHERE (
      url_path IN (${pathList})
      OR regexp_matches(lower(url), '/(?:\\.well-known/)?llms(?:-full)?\\.txt(?:\\?.*)?$')
    )
      AND fetch_status = 200
  `;

  const reader = await connection.runAndReadAll(query);
  const rows = reader.getRowObjectsJson() as unknown as CrawlRow[];
  return rows.map((row) => ({
    url: row.url,
    host: row.url_host_registered_domain,
    path: row.url_path,
    kind: TARGET_PATHS.get(row.url_path) || "llms",
    fetchStatus: row.fetch_status,
    fetchTime: row.fetch_time,
    contentType: row.content_mime_detected || row.content_mime_type
  }));
}

async function verifyUrls(urls: string[], timeoutMs: number, concurrency: number) {
  const queue = urls.slice();
  const results: LiveResult[] = [];

  const runWorker = async () => {
    while (queue.length > 0) {
      const target = queue.shift();
      if (!target) return;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const headResponse = await fetch(target, {
          method: "HEAD",
          redirect: "follow",
          signal: controller.signal
        });
        let finalResponse = headResponse;
        let contentType = headResponse.headers.get("content-type") || "";

        if (!headResponse.ok || !contentType || /text\/html|application\/xhtml\+xml/i.test(contentType)) {
          finalResponse = await fetch(target, { method: "GET", redirect: "follow", signal: controller.signal });
          contentType = finalResponse.headers.get("content-type") || "";
        }

        if (finalResponse.ok && !/text\/html|application\/xhtml\+xml/i.test(contentType)) {
          results.push({ url: target, status: finalResponse.status, checkedAt: new Date().toISOString() });
        }
      } catch {
      } finally {
        clearTimeout(timeout);
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => runWorker()));
  return results;
}

async function openDatabase(filePath: string) {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.exec(`
    CREATE TABLE IF NOT EXISTS llms_index (
      url TEXT PRIMARY KEY,
      host TEXT NOT NULL,
      path TEXT NOT NULL,
      kind TEXT NOT NULL,
      source TEXT NOT NULL,
      crawl_id TEXT NOT NULL,
      fetch_status INTEGER,
      fetch_time TEXT,
      content_type TEXT,
      live_status INTEGER,
      live_checked_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_llms_host ON llms_index(host);
    CREATE INDEX IF NOT EXISTS idx_llms_kind ON llms_index(kind);
  `);

  const insert = db.prepare(`
    INSERT INTO llms_index (
      url,
      host,
      path,
      kind,
      source,
      crawl_id,
      fetch_status,
      fetch_time,
      content_type,
      live_status,
      live_checked_at,
      created_at,
      updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(url) DO UPDATE SET
      host = excluded.host,
      path = excluded.path,
      kind = excluded.kind,
      source = excluded.source,
      crawl_id = excluded.crawl_id,
      fetch_status = excluded.fetch_status,
      fetch_time = excluded.fetch_time,
      content_type = excluded.content_type,
      live_status = excluded.live_status,
      live_checked_at = excluded.live_checked_at,
      updated_at = excluded.updated_at
  `);

  const save = () => {
    insert.free();
    const data = db.export();
    fs.writeFileSync(filePath, Buffer.from(data));
    db.close();
  };

  return { db, insert, save };
}

async function uploadArtifactsToR2(
  outputDir: string,
  crawlId: string,
  generatedAt: string
) {
  if (!config.publishR2) {
    return;
  }

  if (!config.r2Bucket || !config.r2Endpoint || !config.r2AccessKeyId || !config.r2SecretAccessKey) {
    throw new Error("R2 publishing enabled but required R2 env vars are missing.");
  }

  const client = new S3Client({
    endpoint: config.r2Endpoint,
    region: "auto",
    credentials: {
      accessKeyId: config.r2AccessKeyId,
      secretAccessKey: config.r2SecretAccessKey
    }
  });

  const files = [
    "llms-index.sqlite",
    "llms-index.jsonl",
    "llms-index.meta.json",
    "llms-autocomplete.json",
    "latest.json"
  ];
  const timestamp = generatedAt.replace(/[:.]/g, "-");
  const versionPrefix = `${config.artifactPrefix}/${crawlId}-${timestamp}`;
  const latestPrefix = `${config.artifactPrefix}/latest`;

  for (const fileName of files) {
    const body = fs.readFileSync(path.join(outputDir, fileName));
    await client.send(
      new PutObjectCommand({
        Bucket: config.r2Bucket,
        Key: `${versionPrefix}/${fileName}`,
        Body: body
      })
    );
    await client.send(
      new PutObjectCommand({
        Bucket: config.r2Bucket,
        Key: `${latestPrefix}/${fileName}`,
        Body: body
      })
    );
  }

  if (config.r2PublicBaseUrl) {
    const base = config.r2PublicBaseUrl.replace(/\/$/, "");
    console.log(`Published latest manifest: ${base}/${latestPrefix}/latest.json`);
  }
}

async function run() {
  const outputDir = config.outputDir;
  const startedAt = new Date().toISOString();

  fs.mkdirSync(outputDir, { recursive: true });

  const recentCollections = await getRecentCollections(config.recentCollections);
  const crawlIds = config.crawlIds
    ? config.crawlIds.split(",").map((entry) => entry.trim()).filter(Boolean)
    : config.crawlId
      ? [config.crawlId]
      : recentCollections.map((entry) => entry.id);
  if (crawlIds.length === 0) {
    throw new Error("No crawl IDs available.");
  }
  const activeCrawlId = crawlIds[0];

  const conn = await createDuckDbConnection();
  const results: CrawlResult[] = [];
  const seen = new Set<string>();
  const collectionStats: Array<{ crawlId: string; selectedFiles: number; candidates: number; errors: number }> = [];

  for (const crawlId of crawlIds) {
    console.log(`Scanning crawl ${crawlId}...`);
    const indexPaths = await fetchIndexPaths(crawlId);
    const limitedPaths = pickIndexPaths(indexPaths, config.maxFiles, config.fileSelectionStrategy);

    let crawlCandidates = 0;
    let crawlErrors = 0;
    for (const fileUrl of limitedPaths) {
      try {
        const rows = await extractFromParquet(conn, fileUrl);
        for (const row of rows) {
          const key = normalizeUrl(row.url);
          if (!seen.has(key)) {
            seen.add(key);
            results.push(row);
            crawlCandidates++;
          }
        }
      } catch {
        crawlErrors++;
      }
    }
    collectionStats.push({
      crawlId,
      selectedFiles: limitedPaths.length,
      candidates: crawlCandidates,
      errors: crawlErrors
    });
    console.log(
      `Crawl ${crawlId}: scanned ${limitedPaths.length} files, candidates ${crawlCandidates}, errors ${crawlErrors}`
    );
  }

  conn.closeSync();

  const verifyTargets = results.map((entry) => entry.url);
  const limitedVerify = config.verifyLimit > 0 ? verifyTargets.slice(0, config.verifyLimit) : verifyTargets;
  const liveResults = await verifyUrls(limitedVerify, config.timeoutMs, config.verifyConcurrency);
  const liveMap = new Map(liveResults.map((entry) => [normalizeUrl(entry.url), entry]));
  const verifiedEntries = results.filter((entry) => liveMap.has(normalizeUrl(entry.url)));

  const dbPath = path.join(outputDir, "llms-index.sqlite");
  const { db, insert, save } = await openDatabase(dbPath);

  const jsonlPath = path.join(outputDir, "llms-index.jsonl");
  const jsonlStream = fs.createWriteStream(jsonlPath);

  const now = new Date().toISOString();
  db.exec("BEGIN");
  for (const entry of verifiedEntries) {
    const live = liveMap.get(normalizeUrl(entry.url));
    const payload = {
      url: entry.url,
      host: entry.host,
      path: entry.path,
      kind: entry.kind,
      source: "commoncrawl",
      crawlId: activeCrawlId,
      fetchStatus: entry.fetchStatus ?? null,
      fetchTime: entry.fetchTime ?? null,
      contentType: entry.contentType ?? null,
      liveStatus: live?.status ?? null,
      liveCheckedAt: live?.checkedAt ?? null,
      updatedAt: now
    };
    insert.run([
      entry.url,
      entry.host,
      entry.path,
      entry.kind,
      "commoncrawl",
      activeCrawlId,
      entry.fetchStatus ?? null,
      entry.fetchTime ?? null,
      entry.contentType ?? null,
      live?.status ?? null,
      live?.checkedAt ?? null,
      now,
      now
    ]);
    jsonlStream.write(`${JSON.stringify(payload)}\n`);
  }
  db.exec("COMMIT");
  jsonlStream.end();
  save();

  const autocompleteHosts = Array.from(
    new Set(verifiedEntries.map((entry) => normalizeHost(entry.host)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  const autocompletePayload: AutocompletePayload = {
    crawlId: activeCrawlId,
    generatedAt: now,
    totalHosts: autocompleteHosts.length,
    hosts: autocompleteHosts
  };
  fs.writeFileSync(
    path.join(outputDir, "llms-autocomplete.json"),
    JSON.stringify(autocompletePayload)
  );
  fs.writeFileSync(
    path.join(outputDir, "latest.json"),
    JSON.stringify({
      crawlId: activeCrawlId,
      generatedAt: now,
      files: [
        "llms-index.sqlite",
        "llms-index.jsonl",
        "llms-index.meta.json",
        "llms-autocomplete.json"
      ],
      prefix: config.artifactPrefix
    })
  );

  const finishedAt = new Date().toISOString();
  const metaPath = path.join(outputDir, "llms-index.meta.json");
  const totalSelectedFiles = collectionStats.reduce((sum, stat) => sum + stat.selectedFiles, 0);
  fs.writeFileSync(metaPath, JSON.stringify({
    crawlId: activeCrawlId,
    crawlsScanned: crawlIds,
    collectionStats,
    totalCandidates: results.length,
    liveVerified: liveResults.length,
    persistedRecords: verifiedEntries.length,
    verifyCoverage: verifyTargets.length === 0 ? 0 : Number((liveResults.length / verifyTargets.length).toFixed(4)),
    startedAt,
    finishedAt,
    maxFiles: config.maxFiles,
    selectedFiles: totalSelectedFiles,
    selectionStrategy: config.fileSelectionStrategy,
    verifyLimit: config.verifyLimit
  }, null, 2));

  await uploadArtifactsToR2(outputDir, activeCrawlId, now);

  console.log(
    `Crawl complete. Candidates: ${results.length}, live verified: ${liveResults.length}, persisted: ${verifiedEntries.length}`
  );
  console.log(`Outputs: ${dbPath}, ${jsonlPath}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
