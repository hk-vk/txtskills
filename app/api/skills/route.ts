import { NextResponse } from 'next/server';
import { listAllSkills } from '@/lib/github-publisher';

// Server-side cache for skills list
let skillsCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute server-side cache

export async function GET() {
  try {
    // Return cached data if fresh
    if (skillsCache && Date.now() - skillsCache.timestamp < CACHE_TTL) {
      return NextResponse.json(skillsCache.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      });
    }

    const skills = await listAllSkills();
    const responseData = { skills };
    
    // Update cache
    skillsCache = { data: responseData, timestamp: Date.now() };
    
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error('List skills error:', error.message);
    return NextResponse.json(
      { skills: [], error: 'Failed to fetch skills.' },
      { status: 500 }
    );
  }
}

// Allow cache invalidation via POST (call after publishing)
export async function POST() {
  skillsCache = null;
  return NextResponse.json({ success: true, message: 'Cache invalidated' });
}
