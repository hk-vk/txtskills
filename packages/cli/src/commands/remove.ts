import { execSync } from "node:child_process";
import * as p from "@clack/prompts";
import { getSkillsBinPath } from "../utils.js";

interface RemoveOptions {
    global?: boolean;
    agent?: string[];
    skill?: string;
    yes?: boolean;
    all?: boolean;
}

/**
 * Remove command — direct wrapper over `npx skills remove`
 */
export async function removeCommand(
    skills: string[] | undefined,
    options: RemoveOptions
): Promise<void> {
    const skillsBin = getSkillsBinPath();
    const args: string[] = [skillsBin, "remove"];

    // Append skill names if provided
    if (skills && skills.length > 0) {
        args.push(...skills);
    }

    // Pass through flags
    if (options.global) args.push("--global");
    if (options.agent) {
        for (const a of options.agent) {
            args.push("--agent", a);
        }
    }
    if (options.skill) args.push("--skill", options.skill);
    if (options.yes) args.push("--yes");
    if (options.all) args.push("--all");

    const cmd = `skills ${args.slice(1).join(" ")}`;
    p.log.step(`Running: ${cmd}`);

    try {
        execSync(`${process.execPath} ${args.join(" ")}`, { stdio: "inherit" });
    } catch {
        throw new Error("Skills remove command failed");
    }
}
