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
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes server-side cache
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

    // D1 is the read-optimized source for the directory. Only call GitHub when
    // the database is unavailable or empty; GitHub metadata fetching is N+1 and slow.
    const getInstallCommand = (name: string) => `npx txtskills add ${name}`;
    let skills: SkillListResponseItem[] = [];

    try {
      const dbSkills = await listSkillsFromDB();
      skills = dbSkills.map((s) => ({
        name: s.name,
        url: s.github_url,
        command: getInstallCommand(s.name),
        metadata: {
          sourceUrl: s.source_url,
          generatedAt: s.created_at,
          updatedAt: s.updated_at,
        },
      }));
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('D1 query failed, falling back to GitHub:', error);
      }
    }

    if (skills.length === 0) {
      try {
        const githubSkills = await listAllSkills();
        skills = githubSkills.map((s) => ({
          ...s,
          command: getInstallCommand(s.name),
        }));
      } catch (error) {
        if (process.env.NODE_ENV === 'production') {
          console.warn('GitHub skills fetch failed:', error);
        }
      }
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
