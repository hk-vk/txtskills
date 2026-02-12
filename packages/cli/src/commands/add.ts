import * as p from "@clack/prompts";
import pc from "picocolors";
import { execSync, spawn } from "child_process";
import { createRequire } from "module";
import { resolve, dirname } from "path";
import {
    downloadSkillFolder,
    cleanupTempDir,
    skillExists,
    fetchManifest,
    listSkillDirs,
} from "../github.js";
import { DEFAULT_OWNER, DEFAULT_REPO, getGitHubToken } from "../config.js";
import { formatSkillName, rateLimitWarning } from "../utils.js";
import { trackInstall } from "../analytics.js";

interface AddOptions {
    repo?: string;
    global?: boolean;
    agent?: string[];
    yes?: boolean;
}


/**
 * Resolve the skill name — if user provides an exact name, use it.
 * Otherwise, show available skills and let them pick.
 */
async function resolveSkillName(
    nameArg: string | undefined,
    owner: string,
    repo: string
): Promise<string | null> {
    if (nameArg) {
        // Check if skill exists
        const spinner = p.spinner();
        spinner.start(`Checking ${formatSkillName(nameArg)}...`);

        const exists = await skillExists(nameArg, owner, repo);
        if (exists) {
            spinner.stop(`Found ${formatSkillName(nameArg)}`);
            return nameArg;
        }

        spinner.stop(pc.red(`Skill "${nameArg}" not found`));

        // Try fuzzy matching
        const manifest = await fetchManifest(owner, repo);
        if (manifest.length > 0) {
            const matches = manifest.filter(
                (s) =>
                    s.name.includes(nameArg.toLowerCase()) ||
                    nameArg.toLowerCase().includes(s.name.toLowerCase())
            );

            if (matches.length > 0) {
                p.log.info("Did you mean one of these?");
                const selected = await p.select({
                    message: "Select a skill",
                    options: matches.map((m) => ({
                        value: m.name,
                        label: m.name,
                        hint: m.description,
                    })),
                });

                if (p.isCancel(selected)) {
                    return null;
                }
                return selected as string;
            }
        }

        // Fall back to listing directories
        const { items } = await listSkillDirs(owner, repo);
        const dirMatches = items.filter(
            (item) =>
                item.name.includes(nameArg.toLowerCase()) ||
                nameArg.toLowerCase().includes(item.name.toLowerCase())
        );

        if (dirMatches.length > 0) {
            p.log.info("Did you mean one of these?");
            const selected = await p.select({
                message: "Select a skill",
                options: dirMatches.map((d) => ({
                    value: d.name,
                    label: d.name,
                })),
            });

            if (p.isCancel(selected)) {
                return null;
            }
            return selected as string;
        }

        p.log.error(`No skills matching "${nameArg}" found in ${owner}/${repo}`);
        return null;
    }

    // No name provided — show all skills
    const spinner = p.spinner();
    spinner.start("Fetching available skills...");

    // Try manifest first
    let options: { value: string; label: string; hint?: string }[] = [];
    const manifest = await fetchManifest(owner, repo);

    if (manifest.length > 0) {
        options = manifest.map((s) => ({
            value: s.name,
            label: s.name,
            hint: s.description,
        }));
    } else {
        // Fall back to directory listing
        const { items } = await listSkillDirs(owner, repo);
        options = items.map((item) => ({
            value: item.name,
            label: item.name,
        }));
    }

    spinner.stop(`Found ${pc.green(String(options.length))} skills`);

    const selected = await p.select({
        message: "Select a skill to install",
        options,
    });

    if (p.isCancel(selected)) {
        return null;
    }

    return selected as string;
}

/**
 * Resolve the path to the locally installed `skills` CLI binary.
 */
function getSkillsBinPath(): string {
    const require = createRequire(import.meta.url);
    const skillsPkg = require.resolve("skills/package.json");
    return resolve(dirname(skillsPkg), "bin", "cli.mjs");
}

export async function addCommand(
    skillName: string | undefined,
    options: AddOptions
): Promise<void> {
    // Parse repo
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

    p.log.info(
        `${pc.dim("Source:")} ${pc.underline(`https://github.com/${owner}/${repo}`)}`
    );

    // Resolve skill name
    const resolvedName = await resolveSkillName(skillName, owner, repo);
    if (!resolvedName) {
        p.outro(pc.dim("Cancelled"));
        return;
    }

    // Confirm installation
    if (!options.yes) {
        const confirmed = await p.confirm({
            message: `Install ${formatSkillName(resolvedName)}?`,
        });

        if (p.isCancel(confirmed) || !confirmed) {
            p.outro(pc.dim("Cancelled"));
            return;
        }
    }

    // Download the skill folder
    const spinner = p.spinner();
    let tempDir: string | null = null;

    try {
        spinner.start(
            `Downloading ${formatSkillName(resolvedName)}...`
        );

        const result = await downloadSkillFolder(resolvedName, owner, repo);
        tempDir = result.tempDir;

        spinner.stop(
            `Downloaded ${formatSkillName(resolvedName)} ${pc.dim(`(${result.fileCount} files)`)}`
        );

        // Build the skills CLI command
        const args = ["add", result.skillPath];

        if (options.global) args.push("-g");
        if (options.yes) args.push("-y");
        if (options.agent) {
            for (const agent of options.agent) {
                args.push("-a", agent);
            }
        }

        const skillsBin = getSkillsBinPath();

        p.log.step(
            `${pc.dim("Running:")} skills ${args.join(" ")}`
        );

        // Delegate to locally installed skills CLI
        const child = spawn(process.execPath, [skillsBin, ...args], {
            stdio: "inherit",
        });

        await new Promise<void>((resolve, reject) => {
            child.on("close", (code) => {
                if (code === 0) {
                    // Track successful installation (fire-and-forget)
                    trackInstall(resolvedName, "0.2.1").catch(() => {});
                    resolve();
                } else {
                    reject(new Error(`skills CLI exited with code ${code}`));
                }
            });
            child.on("error", reject);
        });
    } catch (err: any) {
        spinner.stop(pc.red("Failed"));

        if (err.message?.includes("not found")) {
            p.log.error(
                pc.red(
                    `Skill "${resolvedName}" not found in ${owner}/${repo}`
                )
            );
        } else if (err.message?.includes("rate limit")) {
            p.log.error(pc.red("GitHub API rate limit exceeded."));
            p.log.info(
                pc.dim(
                    "Set GITHUB_TOKEN or GH_TOKEN environment variable for higher limits."
                )
            );
        } else {
            p.log.error(pc.red(err.message || "An error occurred"));
        }

        process.exit(1);
    } finally {
        // Clean up temp directory
        if (tempDir) {
            await cleanupTempDir(tempDir).catch(() => { });
        }
    }
}
