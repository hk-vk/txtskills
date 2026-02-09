import pc from "picocolors";

// txtskills ASCII banner — graffiti style
const LOGO_LINES = [
    "  __            __          __   .__.__  .__          ",
    "_/  |____  ____/  |_  _____|  | _|__|  | |  |   ______",
    "\\   __\\  \\/  /\\   __\\/  ___/  |/ /  |  | |  |  /  ___/",
    " |  |  >    <  |  |  \\___ \\|    <|  |  |_|  |__\\___ \\ ",
    " |__| /__/\\_ \\ |__| /____  >__|_ \\__|____/____/____  >",
    "            \\/           \\/     \\/                 \\/ ",
];

// Gradient grays — 6 lines fading from bright to dim
const GRAYS = [
    "\x1b[38;5;252m",
    "\x1b[38;5;250m",
    "\x1b[38;5;248m",
    "\x1b[38;5;246m",
    "\x1b[38;5;244m",
    "\x1b[38;5;240m",
];
const RESET = "\x1b[0m";

export function showBanner(): void {
    console.log();
    LOGO_LINES.forEach((line, i) => {
        console.log(`${GRAYS[i]}${line}${RESET}`);
    });
    console.log(
        `${pc.dim("llms.txt → agent skills")}  ${pc.dim("·")}  ${pc.dim("v0.1.0")}`
    );
    console.log();
}

/**
 * Format a skill name for display
 */
export function formatSkillName(name: string): string {
    return pc.cyan(name);
}

/**
 * Format a count
 */
export function formatCount(n: number, singular: string, plural?: string): string {
    const word = n === 1 ? singular : (plural || singular + "s");
    return `${pc.green(String(n))} ${word}`;
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Format a rate limit warning
 */
export function rateLimitWarning(remaining: number, limit: number): string | null {
    if (remaining > 10) return null;
    if (remaining === 0) {
        return pc.red(
            "GitHub API rate limit exhausted. Set GITHUB_TOKEN or GH_TOKEN for higher limits."
        );
    }
    return pc.yellow(
        `GitHub API rate limit: ${remaining}/${limit} remaining. Set GITHUB_TOKEN for higher limits.`
    );
}
