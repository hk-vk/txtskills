import assert from "node:assert/strict";

const baseUrl = process.env.AGENT_READINESS_URL || "http://localhost:3000";

async function get(path, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  return { response, body: await response.text() };
}

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const homepage = await get("/", { Accept: "text/html" });
assert.equal(homepage.response.status, 200);
assert.match(homepage.body, /<h1\b[^>]*>[^<]+<\/h1>/i);
assert.ok(visibleText(homepage.body).length >= 500, "homepage needs at least 500 raw HTML text characters");

const markdown = await get("/", { Accept: "text/markdown" });
assert.equal(markdown.response.status, 200);
assert.match(markdown.response.headers.get("content-type") || "", /^text\/markdown/i);
assert.match(markdown.response.headers.get("vary") || "", /accept/i);
assert.match(markdown.body, /## When to use this/);

const notFound = await get("/path-that-does-not-exist");
assert.equal(notFound.response.status, 404);
assert.match(visibleText(notFound.body), /llms\.txt|sitemap/i);

for (const path of ["/about", "/contact", "/privacy"]) {
  const page = await get(path);
  assert.equal(page.response.status, 200, `${path} should resolve`);
  assert.ok(visibleText(page.body).length >= 500, `${path} needs meaningful trust content`);
}

const robots = await get("/robots.txt");
assert.equal(robots.response.status, 200);
assert.ok(robots.body.includes("User-agent: ClaudeBot\nAllow: /"));
assert.match(robots.body, /Sitemap:/);

const sitemap = await get("/sitemap.xml");
assert.equal(sitemap.response.status, 200);
for (const path of ["/about", "/contact", "/privacy", "/llms.txt"]) {
  assert.ok(sitemap.body.includes(path), `sitemap should include ${path}`);
}

console.log(`Agent readiness checks passed for ${baseUrl}`);
