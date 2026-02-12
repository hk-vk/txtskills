import { Command } from "commander";
import * as p from "@clack/prompts";
import { showBanner } from "./utils.js";
import { addCommand } from "./commands/add.js";
import { listCommand } from "./commands/list.js";
import { searchCommand } from "./commands/search.js";
import { removeCommand } from "./commands/remove.js";

const program = new Command();

program
    .name("txtskills")
    .description("Install individual skills from txtskills registry")
    .version("0.2.1")
    .hook("preAction", () => {
        showBanner();
        p.intro("txtskills");
    });

program
    .command("add [skill-name]")
    .description("Install a skill by name")
    .option("-r, --repo <owner/repo>", "Source repository (default: hk-vk/skills)")
    .option("-g, --global", "Install globally instead of project-level")
    .option(
        "-a, --agent <agents...>",
        "Target specific agents (e.g., claude-code, cursor)"
    )
    .option("-y, --yes", "Skip confirmation prompts")
    .action(async (skillName: string | undefined, options) => {
        try {
            await addCommand(skillName, options);
            p.outro("Done!");
        } catch (err: any) {
            p.log.error(err.message);
            process.exit(1);
        }
    });

program
    .command("list")
    .alias("ls")
    .description("List all available skills in the registry")
    .option("-r, --repo <owner/repo>", "Source repository (default: hk-vk/skills)")
    .option("--json", "Output as JSON")
    .action(async (options) => {
        try {
            await listCommand(options);
        } catch (err: any) {
            p.log.error(err.message);
            process.exit(1);
        }
    });

program
    .command("search [query]")
    .alias("find")
    .description("Search for skills by name or description")
    .option("-r, --repo <owner/repo>", "Source repository (default: hk-vk/skills)")
    .action(async (query: string | undefined, options) => {
        try {
            await searchCommand(query, options);
        } catch (err: any) {
            p.log.error(err.message);
            process.exit(1);
        }
    });

program
    .command("remove [skills...]")
    .alias("rm")
    .description("Remove installed skills (wraps skills CLI remove)")
    .option("-g, --global", "Remove from global scope instead of project scope")
    .option(
        "-a, --agent <agents...>",
        "Remove from specific agents (use '*' for all)"
    )
    .option("-s, --skill <pattern>", "Specify skills to remove (use '*' for all)")
    .option("-y, --yes", "Skip confirmation prompts")
    .option("--all", "Remove all skills from all agents")
    .action(async (skills: string[] | undefined, options) => {
        try {
            await removeCommand(skills, options);
            p.outro("Done!");
        } catch (err: any) {
            p.log.error(err.message);
            process.exit(1);
        }
    });

// Default: if no command, show help with interactive prompt
program.action(async () => {
    showBanner();
    p.intro("txtskills");

    const action = await p.select({
        message: "What would you like to do?",
        options: [
            {
                value: "add",
                label: "Install a skill",
                hint: "Download and install a skill for your AI agents",
            },
            {
                value: "list",
                label: "Browse skills",
                hint: "List all available skills",
            },
            {
                value: "search",
                label: "Search skills",
                hint: "Search for a specific skill",
            },
            {
                value: "remove",
                label: "Remove a skill",
                hint: "Remove an installed skill from your agents",
            },
        ],
    });

    if (p.isCancel(action)) {
        p.outro("Goodbye!");
        return;
    }

    switch (action) {
        case "add":
            await addCommand(undefined, {});
            break;
        case "list":
            await listCommand({});
            break;
        case "search":
            await searchCommand(undefined, {});
            break;
        case "remove":
            await removeCommand(undefined, {});
            break;
    }

    p.outro("Done!");
});

program.parse();
