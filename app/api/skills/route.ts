import { NextResponse } from 'next/server';
import { listAllSkills } from '@/lib/github-publisher';

export async function GET() {
  try {
    const skills = await listAllSkills();
    return NextResponse.json({ skills });
  } catch (error: any) {
    console.error('List skills error:', error.message);
    return NextResponse.json(
      { skills: [], error: 'Failed to fetch skills.' },
      { status: 500 }
    );
  }
}
