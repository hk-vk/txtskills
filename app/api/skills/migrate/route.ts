import { NextResponse } from 'next/server';
import { listAllSkills, publishSkill } from '@/lib/github-publisher';
import { fetchLlmsTxt } from '@/lib/fetcher';
import { parseLlmsTxt } from '@/lib/llms-parser';
import { generateSkill } from '@/lib/skill-generator';
import { createHash } from 'crypto';

export const maxDuration = 300; // 5 minutes for migration

function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

export async function POST() {
  try {
    // Get all existing skills from GitHub
    const skills = await listAllSkills();
    
    const results = [];
    
    for (const skill of skills) {
      const sourceUrl = skill.metadata?.sourceUrl;
      
      if (!sourceUrl) {
        results.push({
          name: skill.name,
          status: 'skipped',
          reason: 'No source URL in metadata'
        });
        continue;
      }
      
      try {
        // Fetch the original llms.txt
        const content = await fetchLlmsTxt(sourceUrl);
        const parsed = parseLlmsTxt(content);
        
        if (!parsed.title) {
          results.push({
            name: skill.name,
            status: 'failed',
            reason: 'Could not parse llms.txt'
          });
          continue;
        }
        
        // Generate new skill with fixed description
        const { name, content: skillContent } = generateSkill(parsed, sourceUrl);
        const currentHash = hashContent(content);
        
        // Republish the skill (will update in-place)
        await publishSkill(name, skillContent, sourceUrl, currentHash);
        
        results.push({
          name: skill.name,
          status: 'updated',
          sourceUrl
        });
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error: any) {
        results.push({
          name: skill.name,
          status: 'failed',
          reason: error.message
        });
      }
    }
    
    const updated = results.filter(r => r.status === 'updated').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    
    return NextResponse.json({
      success: true,
      message: `Migration complete: ${updated} updated, ${failed} failed, ${skipped} skipped`,
      total: skills.length,
      updated,
      failed,
      skipped,
      details: results
    });
    
  } catch (error: any) {
    console.error('Migration failed:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
