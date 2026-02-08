import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { fetchLlmsTxt } from '@/lib/fetcher';
import { parseLlmsTxt } from '@/lib/llms-parser';
import { generateSkill } from '@/lib/skill-generator';
import { publishSkill, getExistingSkill } from '@/lib/github-publisher';
import { slugify } from '@/lib/slugify';
import { ConversionRequest, ConversionResult } from '@/lib/types';

export const maxDuration = 60;

function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ConversionRequest;
    
    let content = '';
    let sourceUrl: string | undefined;
    
    if (body.type === 'url' && body.url) {
      sourceUrl = body.url;
      try {
        content = await fetchLlmsTxt(body.url);
      } catch (e) {
        return NextResponse.json({ 
          success: false, 
          error: { type: 'fetch', message: 'Could not fetch llms.txt. Check the URL.' } 
        } as ConversionResult, { status: 400 });
      }
    } else if (body.type === 'content' && body.content) {
      content = body.content;
      sourceUrl = body.sourceUrl; // Allow passing sourceUrl with content
    } else {
      return NextResponse.json({ 
        success: false, 
        error: { type: 'validation', message: 'Missing URL or content.' } 
      } as ConversionResult, { status: 400 });
    }

    const parsed = parseLlmsTxt(content);
    if (!parsed.title) {
       return NextResponse.json({ 
          success: false, 
          error: { type: 'parse', message: 'Invalid format: could not find a title.' } 
        } as ConversionResult, { status: 400 });
    }

    const skillName = slugify(parsed.title);
    const currentHash = hashContent(content);

    // Check if skill already exists and user didn't request regeneration
    if (!body.forceRegenerate) {
      try {
        const existing = await getExistingSkill(skillName);
        if (existing) {
          // Compare content hash to detect changes
          const storedHash = existing.metadata?.contentHash || '';
          const contentChanged = storedHash !== currentHash;

          return NextResponse.json({
            success: true,
            command: existing.command,
            githubUrl: existing.url,
            skillName,
            skillContent: existing.skillContent,
            alreadyExists: true,
            contentChanged,
            existingMetadata: existing.metadata,
          } as ConversionResult);
        }
      } catch (checkErr: any) {
        console.error('Existing skill check failed:', checkErr.message || checkErr);
        // If check fails, proceed with generation
      }
    }

    const { name, content: skillContent } = generateSkill(parsed, sourceUrl);

    try {
      const { url, command, isUpdate } = await publishSkill(name, skillContent, sourceUrl, currentHash);
      
      return NextResponse.json({
        success: true,
        command,
        githubUrl: url,
        skillName: name,
        skillContent,
        isUpdate
      } as ConversionResult);
    } catch (e: any) {
      console.error('Publish failed:', e.message);
      return NextResponse.json({
        success: true, 
        skillName: name,
        skillContent,
        publishFailed: true,
        error: { type: 'publish', message: 'Generated skill but failed to publish to GitHub.' }
      } as ConversionResult);
    }

  } catch (error: any) {
    console.error('Conversion error:', error);
    return NextResponse.json({ 
      success: false, 
      error: { type: 'unknown', message: error.message || 'Internal server error' } 
    } as ConversionResult, { status: 500 });
  }
}
