import { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "All Skills | txtskills - Agent Skills Directory",
  description: "Browse and discover all published agent skills. Find Claude Code skills, Cursor skills, Windsurf skills, and more AI agent skills created with txtskills.",
  keywords: [
    "agent skills",
    "skill directory",
    "claude code skills",
    "cursor skills",
    "windsurf skills",
    "published skills",
  ],
  openGraph: {
    title: "All Skills | txtskills - Agent Skills Directory",
    description: "Browse and discover all published agent skills for AI agents.",
    url: `${baseUrl}/skills`,
    type: "website",
  },
  twitter: {
    title: "All Skills | txtskills",
    description: "Browse published agent skills for Claude Code, Cursor, Windsurf, and more.",
  },
};

export default function SkillsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
