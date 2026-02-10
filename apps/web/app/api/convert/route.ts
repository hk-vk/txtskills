import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { fetchLlmsTxt } from '@/lib/fetcher';
import { parseLlmsTxt } from '@/lib/llms-parser';
import { generateSkill } from '@/lib/skill-generator';
import { publishSkill, getExistingSkill, isSameSource, findAvailableVariantName } from '@/lib/github-publisher';
import { slugify, validateSkillName } from '@/lib/slugify';
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
          error: { type: 'fetch', message: 'Could not fetch llms.txt or llms-full.txt. Check the URL.' }
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

    // Use custom name if provided and valid, otherwise auto-generate
    let skillName: string;
    let originalRequestedName: string | undefined;
    if (body.customName) {
      const nameError = validateSkillName(body.customName);
      if (nameError) {
        return NextResponse.json({
          success: false,
          error: { type: 'validation', message: `Invalid skill name: ${nameError}` }
        } as ConversionResult, { status: 400 });
      }
      skillName = body.customName;
    } else {
      skillName = slugify(parsed.title);
    }
    const currentHash = hashContent(content);

    // Check if skill already exists and user didn't request regeneration
    if (!body.forceRegenerate) {
      try {
        const existing = await getExistingSkill(skillName);
        if (existing) {
          // Check if this is from the same source
          const sameSource = isSameSource(sourceUrl, existing.metadata?.sourceUrl);

          if (sameSource) {
            // Same source - compare content hash to detect changes
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
          } else {
            // Different source - find an available variant name
            originalRequestedName = skillName;
            skillName = await findAvailableVariantName(skillName);
          }
        }
      } catch (checkErr: any) {
        console.error('Existing skill check failed:', checkErr.message || checkErr);
        // If check fails, proceed with generation
      }
    }

    const { name, content: skillContent } = generateSkill(parsed, sourceUrl, skillName !== slugify(parsed.title) ? skillName : undefined);

    try {
      const { url, command, isUpdate } = await publishSkill(name, skillContent, sourceUrl, currentHash);

      return NextResponse.json({
        success: true,
        command,
        githubUrl: url,
        skillName: name,
        skillContent,
        isUpdate,
        ...(originalRequestedName ? { originalRequestedName } : {})
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
