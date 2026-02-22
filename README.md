# txtskills

Convert any llms.txt documentation into an installable skill for AI agents.

<div align="center">
  <img src="apps/web/public/mockup.png" alt="txtskills mockup" width="500" />
</div>

Generated skills are saved to [hk-vk/skills](https://github.com/hk-vk/skills)

---

## What This Repo Contains

- `apps/web`: Next.js app (`txtskills.hari.works`)
- `apps/crawler`: Common Crawl worker that builds the canonical llms index for autocomplete
- `packages/cli`: `txtskills` CLI to list/search/install skills
- `packages/ui`: shared UI components

## Getting Started

```bash
pnpm dev
```

## Useful Commands

```bash
pnpm dev:web
pnpm build:web
pnpm deploy:web
pnpm crawl:index
```

## Crawler As Source Of Truth

- Run crawler locally: `pnpm crawl:index`
- Crawler scans: `/llms.txt`, `/.well-known/llms.txt`, `/llms-full.txt`, `/.well-known/llms-full.txt`
- Output artifacts: `apps/crawler/output/llms-index.sqlite`, `apps/crawler/output/llms-index.jsonl`, `apps/crawler/output/llms-index.meta.json`, `apps/crawler/output/llms-autocomplete.json`
- Web autocomplete source: set `LLMS_INDEX_BASE_URL` in `apps/web` env to the public base URL containing `llms-autocomplete.json`
- Optional publish target: set crawler env vars `PUBLISH_R2=true`, `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL`
- Recommended larger crawl envs: `RECENT_COLLECTIONS=8`, `MAX_FILES=500`, `FILE_SELECTION_STRATEGY=spread`, `VERIFY_LIMIT=0`
- Scheduled crawl: `.github/workflows/crawl-llms-index.yml`

## CLI

Install:

```bash
npx txtskills add <skill-name>
```

Browse:

```bash
npx txtskills list
```

## Links

- Website: https://txtskills.hari.works
- Skills directory: https://txtskills.hari.works/skills
- Skills registry: https://github.com/hk-vk/skills
