import { markdownForPath } from "@/lib/agent-content";

function markdownQuality(accept: string): number {
  const match = accept
    .split(",")
    .map((part) => part.trim().split(";"))
    .find(([mediaType]) => mediaType.toLowerCase() === "text/markdown");

  if (!match) return 0;
  const quality = match.find((part) => part.trim().startsWith("q="));
  return quality ? Number.parseFloat(quality.trim().slice(2)) || 0 : 1;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug = [] } = await params;
  const rawPathname = `/${slug.join("/")}` || "/";
  const pathname = rawPathname.startsWith("/api/markdown")
    ? rawPathname.slice("/api/markdown".length) || "/"
    : rawPathname;
  const markdown = markdownForPath(pathname);
  const headers = {
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
    "Content-Type": "text/markdown; charset=utf-8",
    Vary: "Accept, Accept-Encoding",
  };

  if (markdownQuality(request.headers.get("accept") || "") <= 0) {
    return new Response("Not Acceptable", { status: 406, headers });
  }

  if (!markdown) {
    return new Response(
      "# Not found\n\nThis page does not exist. Start at https://txtskills.hari.works/llms.txt or https://txtskills.hari.works/sitemap.xml.\n",
      { status: 404, headers },
    );
  }

  return new Response(markdown, { headers });
}
