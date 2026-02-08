import { NextResponse } from 'next/server';
import { updateSkillsManifest } from '@/lib/github-publisher';

export async function POST() {
  try {
    await updateSkillsManifest();
    return NextResponse.json({ success: true, message: 'skills.json manifest updated' });
  } catch (error: any) {
    console.error('Manifest update failed:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
