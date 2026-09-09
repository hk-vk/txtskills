import { agentInstructionsMarkdown } from "@/lib/agent-content";

export function GET() {
  return new Response(agentInstructionsMarkdown, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
