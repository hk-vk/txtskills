import { NextResponse } from 'next/server';
import { listAllSkills } from '@/lib/github-publisher';
import { upsertSkillInDB } from '@/lib/db';

/**
 * POST /api/skills/sync
 * Syncs all skills from GitHub to D1 database (one-time migration)
 */
export async function POST() {
  try {
    // Fetch all skills from GitHub
    const skills = await listAllSkills();
    
    if (skills.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No skills found in GitHub repo',
        synced: 0 
      });
    }

    // Sync each skill to D1
    let synced = 0;
    const errors: string[] = [];

    for (const skill of skills) {
      try {
        await upsertSkillInDB({
          name: skill.name,
          sourceUrl: skill.metadata?.sourceUrl || null,
          githubUrl: skill.url,
          installCommand: skill.command,
          contentHash: skill.metadata?.contentHash || null,
          generatorVersion: skill.metadata?.generatorVersion || null,
        });
        synced++;
      } catch (err: any) {
        errors.push(`${skill.name}: ${err?.message}`);
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      message: `Synced ${synced}/${skills.length} skills to D1`,
      synced,
      total: skills.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Sync error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
