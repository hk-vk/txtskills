import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
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

const config = {
  outputDir: process.env.OUTPUT_DIR || path.resolve(process.cwd(), "output"),
  crawlId: process.env.CC_CRAWL_ID,
  maxFiles: Number(process.env.MAX_FILES || 5),
  verifyLimit: Number(process.env.VERIFY_LIMIT || 200),
  verifyConcurrency: Number(process.env.VERIFY_CONCURRENCY || 12),
  timeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 10000)
};

const normalizeUrl = (value: string) => value.trim().toLowerCase().replace(/\/$/, "");

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
    WHERE url_path IN (${pathList})
      AND fetch_status = 200
  `;

  const reader = await connection.runAndReadAll(query);
  const rows = reader.getRowObjectsJson() as CrawlRow[];
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
        const response = await fetch(target, { signal: controller.signal });
        const contentType = response.headers.get("content-type") || "";
        if (response.ok && !/text\/html|application\/xhtml\+xml/i.test(contentType)) {
          results.push({ url: target, status: response.status, checkedAt: new Date().toISOString() });
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

async function run() {
  const latest = await getLatestCollection();
  const crawlId = config.crawlId || latest.id;
  const outputDir = config.outputDir;
  const startedAt = new Date().toISOString();

  fs.mkdirSync(outputDir, { recursive: true });

  const indexPaths = await fetchIndexPaths(crawlId);
  const limitedPaths = config.maxFiles > 0 ? indexPaths.slice(0, config.maxFiles) : indexPaths;

  const conn = await createDuckDbConnection();
  const results: CrawlResult[] = [];
  const seen = new Set<string>();

  for (const fileUrl of limitedPaths) {
    const rows = await extractFromParquet(conn, fileUrl);
    for (const row of rows) {
      const key = normalizeUrl(row.url);
      if (!seen.has(key)) {
        seen.add(key);
        results.push(row);
      }
    }
  }

  conn.closeSync();

  const verifyTargets = results.map((entry) => entry.url);
  const limitedVerify = config.verifyLimit > 0 ? verifyTargets.slice(0, config.verifyLimit) : verifyTargets;
  const liveResults = await verifyUrls(limitedVerify, config.timeoutMs, config.verifyConcurrency);
  const liveMap = new Map(liveResults.map((entry) => [normalizeUrl(entry.url), entry]));

  const dbPath = path.join(outputDir, "llms-index.sqlite");
  const { db, insert, save } = await openDatabase(dbPath);

  const jsonlPath = path.join(outputDir, "llms-index.jsonl");
  const jsonlStream = fs.createWriteStream(jsonlPath);

  const now = new Date().toISOString();
  db.exec("BEGIN");
  for (const entry of results) {
    const live = liveMap.get(normalizeUrl(entry.url));
    const payload = {
      url: entry.url,
      host: entry.host,
      path: entry.path,
      kind: entry.kind,
      source: "commoncrawl",
      crawlId,
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
      crawlId,
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

  const finishedAt = new Date().toISOString();
  const metaPath = path.join(outputDir, "llms-index.meta.json");
  fs.writeFileSync(metaPath, JSON.stringify({
    crawlId,
    totalCandidates: results.length,
    liveVerified: liveResults.length,
    startedAt,
    finishedAt,
    maxFiles: config.maxFiles,
    verifyLimit: config.verifyLimit
  }, null, 2));

  console.log(`Crawl complete. Candidates: ${results.length}, live verified: ${liveResults.length}`);
  console.log(`Outputs: ${dbPath}, ${jsonlPath}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
