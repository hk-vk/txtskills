import { NextRequest, NextResponse } from "next/server";
import { autocompleteHosts } from "@/lib/llms-source-index";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q") || "";
    const limitParam = request.nextUrl.searchParams.get("limit") || "8";
    const result = await autocompleteHosts(query, Number(limitParam));

    return NextResponse.json({
      query: result.query,
      suggestions: result.matches,
      source: {
        type: "crawler-index",
        crawlId: result.crawlId,
        generatedAt: result.generatedAt
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Autocomplete lookup failed";
    return NextResponse.json(
      { query: "", suggestions: [], error: message },
      { status: 500 }
    );
  }
}
