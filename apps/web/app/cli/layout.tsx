import { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

const baseUrl = getSiteUrl();

export const metadata: Metadata = {
  title: "Use via CLI | txtskills",
  description: "txtskills CLI commands for convert, add, list, search, and remove.",
  openGraph: {
    title: "Use via CLI | txtskills",
    description: "Run txtskills directly from terminal with complete command reference.",
    url: `${baseUrl}/cli`,
    type: "website",
  },
};

export default function CliLayout({ children }: { children: React.ReactNode }) {
  return children;
}
