import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  fetchManifest,
  listSkillDirs,
} from "../github.js";
import { DEFAULT_OWNER, DEFAULT_REPO } from "../config.js";
import { formatSkillName, rateLimitWarning } from "../utils.js";

interface ListOptions {
  repo?: string;
  json?: boolean;
}

export async function listCommand(options: ListOptions): Promise<void> {
  let owner = DEFAULT_OWNER;
  let repo = DEFAULT_REPO;

  if (options.repo) {
    const parts = options.repo.split("/");
    if (parts.length !== 2) {
      p.log.error('Invalid repo format. Use "owner/repo"');
      process.exit(1);
    }
    owner = parts[0];
    repo = parts[1];
  }

  const spinner = p.spinner();
  spinner.start("Fetching available skills...");

  try {
    // Try manifest first for richer metadata
    const manifest = await fetchManifest(owner, repo);

    if (manifest.length > 0) {
      spinner.stop(
        `Found ${pc.green(String(manifest.length))} skills in ${pc.dim(`${owner}/${repo}`)}`
      );

      if (options.json) {
        console.log(JSON.stringify(manifest, null, 2));
        return;
      }

      console.log();
      for (const skill of manifest) {
        console.log(
          `  ${formatSkillName(skill.name)}${skill.description ? pc.dim(` — ${skill.description}`) : ""}`
        );
      }
      console.log();
      p.log.info(
        pc.dim(`Install with: ${pc.reset("npx txtskills add <skill-name>")}`)
      );
      return;
    }

    // Fall back to directory listing
    const { items, rateLimit } = await listSkillDirs(owner, repo);

    spinner.stop(
      `Found ${pc.green(String(items.length))} skills in ${pc.dim(`${owner}/${repo}`)}`
    );

    const warning = rateLimitWarning(rateLimit.remaining, rateLimit.limit);
    if (warning) {
      p.log.warn(warning);
    }

    if (options.json) {
      console.log(
        JSON.stringify(
          items.map((i) => ({ name: i.name })),
          null,
          2
        )
      );
      return;
    }

    console.log();
    for (const item of items) {
      console.log(`  ${formatSkillName(item.name)}`);
    }
    console.log();
    p.log.info(
      pc.dim(`Install with: ${pc.reset("npx txtskills add <skill-name>")}`)
    );
  } catch (err: any) {
    spinner.stop(pc.red("Failed"));
    p.log.error(pc.red(err.message || "Failed to fetch skills"));
    process.exit(1);
  }
}
