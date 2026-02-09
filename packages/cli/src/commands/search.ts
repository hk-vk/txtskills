import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  fetchManifest,
  listSkillDirs,
} from "../github.js";
import { DEFAULT_OWNER, DEFAULT_REPO } from "../config.js";
import { formatSkillName } from "../utils.js";
import { addCommand } from "./add.js";

interface SearchOptions {
  repo?: string;
}

/**
 * Simple fuzzy match — checks if all characters in query appear in order in the target
 */
function fuzzyMatch(query: string, target: string): { match: boolean; score: number } {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact match
  if (t === q) return { match: true, score: 100 };

  // Contains match
  if (t.includes(q)) return { match: true, score: 80 };

  // Word boundary match
  const words = t.split("-");
  const queryWords = q.split(/[-\s]+/);
  const wordMatches = queryWords.filter((qw) =>
    words.some((w) => w.startsWith(qw))
  );
  if (wordMatches.length === queryWords.length)
    return { match: true, score: 70 };

  // Character sequence match
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  if (qi === q.length) return { match: true, score: 50 };

  // Partial word match
  if (wordMatches.length > 0)
    return { match: true, score: 30 * (wordMatches.length / queryWords.length) };

  return { match: false, score: 0 };
}

export async function searchCommand(
  query: string | undefined,
  options: SearchOptions
): Promise<void> {
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

  // If no query, prompt for one
  if (!query) {
    const input = await p.text({
      message: "Search for a skill",
      placeholder: "e.g. prisma, docker, stripe",
    });

    if (p.isCancel(input) || !input) {
      p.outro(pc.dim("Cancelled"));
      return;
    }
    query = input;
  }

  const spinner = p.spinner();
  spinner.start("Searching...");

  try {
    // Get all skills
    let skills: { name: string; description?: string }[] = [];
    const manifest = await fetchManifest(owner, repo);

    if (manifest.length > 0) {
      skills = manifest;
    } else {
      const { items } = await listSkillDirs(owner, repo);
      skills = items.map((i) => ({ name: i.name }));
    }

    // Fuzzy match
    const results = skills
      .map((skill) => {
        const nameMatch = fuzzyMatch(query!, skill.name);
        const descMatch = skill.description
          ? fuzzyMatch(query!, skill.description)
          : { match: false, score: 0 };
        const score = Math.max(nameMatch.score, descMatch.score * 0.8);
        return { ...skill, match: nameMatch.match || descMatch.match, score };
      })
      .filter((r) => r.match)
      .sort((a, b) => b.score - a.score);

    if (results.length === 0) {
      spinner.stop(pc.yellow("No matches"));
      p.log.info(pc.dim(`No skills matching "${query}" found.`));
      p.log.info(pc.dim(`Run ${pc.reset("npx txtskills list")} to see all available skills.`));
      return;
    }

    spinner.stop(
      `Found ${pc.green(String(results.length))} matching skill${results.length !== 1 ? "s" : ""}`
    );

    // Show results and offer to install
    const selected = await p.select({
      message: "Select a skill to install",
      options: [
        ...results.map((r) => ({
          value: r.name,
          label: r.name,
          hint: r.description,
        })),
        { value: "__cancel__", label: pc.dim("Cancel") },
      ],
    });

    if (p.isCancel(selected) || selected === "__cancel__") {
      p.outro(pc.dim("Cancelled"));
      return;
    }

    // Install the selected skill
    await addCommand(selected as string, {
      repo: options.repo,
      yes: false,
    });
  } catch (err: any) {
    spinner.stop(pc.red("Failed"));
    p.log.error(pc.red(err.message || "Search failed"));
    process.exit(1);
  }
}
