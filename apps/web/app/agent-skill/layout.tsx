import { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Use as Agent Skill | txtskills",
  description: "Install txtskills repository using native skills CLI and run conversion workflow in coding agents.",
  openGraph: {
    title: "Use as Agent Skill | txtskills",
    description: "Native skills CLI installation and usage guide for txtskills workflow.",
    url: `${baseUrl}/agent-skill`,
    type: "website",
  },
};

export default function AgentSkillLayout({ children }: { children: React.ReactNode }) {
  return children;
}
