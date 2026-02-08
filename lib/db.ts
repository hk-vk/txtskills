import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface SkillRecord {
  id: number;
  name: string;
  source_url: string | null;
  github_url: string;
  install_command: string;
  content_hash: string | null;
  generator_version: string | null;
  created_at: string;
  updated_at: string;
}

export interface SkillInput {
  name: string;
  sourceUrl?: string | null;
  githubUrl: string;
  installCommand: string;
  contentHash?: string | null;
  generatorVersion?: string | null;
}

/**
 * Get the D1 database binding
 */
async function getDB() {
  const { env } = await getCloudflareContext({ async: true });
  console.log('Available env bindings:', Object.keys(env || {}));
  if (!env.DB) {
    throw new Error("D1 database not configured");
  }
  return env.DB;
}

/**
 * List all skills from D1 database
 */
export async function listSkillsFromDB(): Promise<SkillRecord[]> {
  const db = await getDB();
  const { results } = await db
    .prepare("SELECT * FROM skills ORDER BY name ASC")
    .all<SkillRecord>();
  return results || [];
}

/**
 * Get a skill by name from D1
 */
export async function getSkillFromDB(name: string): Promise<SkillRecord | null> {
  const db = await getDB();
  const result = await db
    .prepare("SELECT * FROM skills WHERE name = ?")
    .bind(name)
    .first<SkillRecord>();
  return result || null;
}

/**
 * Insert or update a skill in D1
 */
export async function upsertSkillInDB(skill: SkillInput): Promise<void> {
  const db = await getDB();
  await db
    .prepare(`
      INSERT INTO skills (name, source_url, github_url, install_command, content_hash, generator_version, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(name) DO UPDATE SET
        source_url = excluded.source_url,
        github_url = excluded.github_url,
        install_command = excluded.install_command,
        content_hash = excluded.content_hash,
        generator_version = excluded.generator_version,
        updated_at = datetime('now')
    `)
    .bind(
      skill.name,
      skill.sourceUrl || null,
      skill.githubUrl,
      skill.installCommand,
      skill.contentHash || null,
      skill.generatorVersion || null
    )
    .run();
}

/**
 * Delete a skill from D1
 */
export async function deleteSkillFromDB(name: string): Promise<void> {
  const db = await getDB();
  await db.prepare("DELETE FROM skills WHERE name = ?").bind(name).run();
}

/**
 * Search skills by name or source URL
 */
export async function searchSkillsInDB(query: string): Promise<SkillRecord[]> {
  const db = await getDB();
  const searchPattern = `%${query}%`;
  const { results } = await db
    .prepare(`
      SELECT * FROM skills 
      WHERE name LIKE ? OR source_url LIKE ?
      ORDER BY name ASC
    `)
    .bind(searchPattern, searchPattern)
    .all<SkillRecord>();
  return results || [];
}
