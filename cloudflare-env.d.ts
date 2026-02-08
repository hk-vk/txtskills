// Extend the CloudflareEnv interface to include our D1 database
declare global {
  interface CloudflareEnv {
    DB: D1Database;
  }
}

export {};
