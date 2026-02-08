import { NextRequest, NextResponse } from 'next/server';
import { fetchLlmsTxt } from '@/lib/fetcher';
import { parseLlmsTxt } from '@/lib/llms-parser';
import { generateSkill } from '@/lib/skill-generator';
import { publishSkill } from '@/lib/github-publisher';
import { ConversionRequest, ConversionResult } from '@/lib/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ConversionRequest;
    
    let content = '';
    
    if (body.type === 'url' && body.url) {
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

    const { name, content: skillContent } = generateSkill(parsed);

    try {
      const { url, command } = await publishSkill(name, skillContent);
      
      return NextResponse.json({
        success: true,
        command,
        githubUrl: url,
        skillName: name,
        skillContent
      } as ConversionResult);
    } catch (e) {
      return NextResponse.json({
        success: true, 
        skillName: name,
        skillContent,
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
