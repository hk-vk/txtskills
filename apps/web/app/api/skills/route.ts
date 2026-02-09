import { NextResponse } from 'next/server';
import { listAllSkills } from '@/lib/github-publisher';
import { listSkillsFromDB } from '@/lib/db';

// Server-side cache for skills list
let skillsCache: { data: any; timestamp: number; version: number } | null = null;
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
    let skills: Array<{
      name: string;
      url: string;
      command: string;
      metadata: {
        sourceUrl: string | null;
        generatedAt: string;
        updatedAt: string;
      } | null;
    }> = [];

    try {
      // Try D1 database first (much faster)
      const dbSkills = await listSkillsFromDB();
      if (dbSkills.length > 0) {
        skills = dbSkills.map((s) => ({
          name: s.name,
          url: s.github_url,
          command: s.install_command,
          metadata: {
            sourceUrl: s.source_url,
            generatedAt: s.created_at,
            updatedAt: s.updated_at,
          },
        }));
      } else {
        // D1 empty, fall back to GitHub API
        skills = await listAllSkills();
      }
    } catch (dbError) {
      // D1 failed, fall back to GitHub API
      console.warn('D1 query failed, falling back to GitHub:', dbError);
      skills = await listAllSkills();
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
  } catch (error: any) {
    console.error('List skills error:', error.message);
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
