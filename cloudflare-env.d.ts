interface CloudflareEnv {
  DB: D1Database;
  NEXT_PUBLIC_BASE_URL: string;
  WORKER_SELF_REFERENCE: Fetcher;
  ASSETS: Fetcher;
}
