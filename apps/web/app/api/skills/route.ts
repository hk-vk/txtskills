import { NextResponse } from 'next/server';
import { listAllSkills } from '@/lib/github-publisher';
import { listSkillsFromDB } from '@/lib/db';

interface SkillListResponseItem {
  name: string;
  url: string;
  command: string;
  metadata: {
    sourceUrl: string | null;
    generatedAt: string;
    updatedAt: string;
  } | null;
}

type SkillsResponseData = { skills: SkillListResponseItem[] };

// Server-side cache for skills list
let skillsCache: { data: SkillsResponseData; timestamp: number; version: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute server-side cache
let cacheVersion = Date.now(); // Global version for cache busting

export async function GET() {
  try {
    // Return cached data if fresh
    if (skillsCache && Date.now() - skillsCache.timestamp < CACHE_TTL) {
      return NextResponse.json(
        { ...skillsCache.data, _v: cacheVersion },
        {
          headers: {
            // Don't cache in browsers - always validate with server
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'ETag': `"${cacheVersion}"`,
          },
        }
      );
    }

    // Try D1 first (fast), fallback to GitHub API
    let skills: SkillListResponseItem[] = [];

    // Helper to generate install command from skill name (always current format)
    const getInstallCommand = (name: string) => `npx txtskills add ${name}`;

    const [dbResult, githubResult] = await Promise.allSettled([
      listSkillsFromDB(),
      listAllSkills(),
    ]);

    const dbSkills = dbResult.status === 'fulfilled' ? dbResult.value : [];
    const githubSkills = githubResult.status === 'fulfilled' ? githubResult.value : [];

    if (dbResult.status === 'rejected' && process.env.NODE_ENV === 'production') {
      console.warn('D1 query failed, falling back to GitHub:', dbResult.reason);
    }

    if (githubResult.status === 'rejected' && process.env.NODE_ENV === 'production') {
      console.warn('GitHub skills fetch failed, falling back to D1:', githubResult.reason);
    }

    const mappedDbSkills = dbSkills.map((s) => ({
      name: s.name,
      url: s.github_url,
      command: getInstallCommand(s.name), // Generate dynamically
      metadata: {
        sourceUrl: s.source_url,
        generatedAt: s.created_at,
        updatedAt: s.updated_at,
      },
    }));

    const mappedGithubSkills = githubSkills.map((s) => ({
      ...s,
      command: getInstallCommand(s.name), // Generate dynamically
    }));

    // Prefer the more complete source to avoid stale/partial DB results.
    if (mappedGithubSkills.length > mappedDbSkills.length) {
      skills = mappedGithubSkills;
    } else if (mappedDbSkills.length > 0) {
      skills = mappedDbSkills;
    } else {
      skills = mappedGithubSkills;
    }

    const responseData = { skills };

    // Update cache
    skillsCache = { data: responseData, timestamp: Date.now(), version: cacheVersion };

    return NextResponse.json(
      { ...responseData, _v: cacheVersion },
      {
        headers: {
          // Don't cache in browsers - always validate with server
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'ETag': `"${cacheVersion}"`,
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('List skills error:', message);
    return NextResponse.json(
      { skills: [], error: 'Failed to fetch skills.' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}

// Allow cache invalidation via POST (call after publishing)
export async function POST() {
  skillsCache = null;
  cacheVersion = Date.now(); // Bump version to invalidate all caches
  return NextResponse.json({ success: true, message: 'Cache invalidated', version: cacheVersion });
}
