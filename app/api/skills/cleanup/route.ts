import { NextResponse } from 'next/server';
import { App } from '@octokit/app';
import { Octokit } from '@octokit/rest';

const SKILLS_TO_DELETE = ['documentation', 'untitled'];

export async function POST() {
  try {
    const APP_ID = process.env.GITHUB_APP_ID;
    const PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY;
    const INSTALLATION_ID = process.env.GITHUB_INSTALLATION_ID;
    const ORG = process.env.GITHUB_ORG || 'hk-vk';
    const REPO = process.env.GITHUB_REPO || 'skills';

    if (!APP_ID || !PRIVATE_KEY || !INSTALLATION_ID) {
      throw new Error('GitHub credentials not configured');
    }

    const app = new App({
      appId: APP_ID,
      privateKey: PRIVATE_KEY.replace(/\\n/g, '\n'),
    });

    const { data } = await app.octokit.request(
      'POST /app/installations/{installation_id}/access_tokens',
      { installation_id: parseInt(INSTALLATION_ID) }
    );

    const octokit = new Octokit({ auth: data.token });

    const results = [];

    for (const skillName of SKILLS_TO_DELETE) {
      try {
        // Delete SKILL.md
        const { data: fileData } = await octokit.repos.getContent({
          owner: ORG,
          repo: REPO,
          path: `${skillName}/SKILL.md`,
        });

        if ('sha' in fileData) {
          await octokit.repos.deleteFile({
            owner: ORG,
            repo: REPO,
            path: `${skillName}/SKILL.md`,
            message: `Delete ${skillName} skill (cleanup)`,
            sha: fileData.sha,
          });
          results.push({ name: skillName, deleted: true });
        }
      } catch (error: any) {
        results.push({ name: skillName, deleted: false, reason: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cleanup complete',
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
