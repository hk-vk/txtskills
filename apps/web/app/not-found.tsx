import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background px-6 py-24">
      <article className="mx-auto max-w-2xl space-y-5">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          404 · page not found
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">That txtskills page does not exist.</h1>
        <p className="max-w-xl leading-relaxed text-muted-foreground">
          The requested path could not be found. Agents and people can continue from the homepage,
          browse the published skills directory, read the CLI guide, or use the machine-readable
          agent instructions.
        </p>
        <nav aria-label="Recovery links" className="flex flex-wrap gap-4 text-sm">
          <Link className="underline underline-offset-4" href="/">Homepage</Link>
          <Link className="underline underline-offset-4" href="/skills">Browse skills</Link>
          <Link className="underline underline-offset-4" href="/cli">CLI guide</Link>
          <Link className="underline underline-offset-4" href="/llms.txt">llms.txt</Link>
          <Link className="underline underline-offset-4" href="/sitemap.xml">Sitemap</Link>
        </nav>
      </article>
    </main>
  );
}
