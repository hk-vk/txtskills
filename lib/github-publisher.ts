import { App } from '@octokit/app';
import { Octokit } from '@octokit/rest';

const APP_ID = process.env.GITHUB_APP_ID;
const PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY;
const INSTALLATION_ID = process.env.GITHUB_INSTALLATION_ID;
const ORG = process.env.GITHUB_ORG || 'txt2skill-generated';
const REPO = process.env.GITHUB_REPO || 'skills';

let cachedOctokit: Octokit | null = null;
let tokenExpiry = 0;

async function getOctokit() {
  if (cachedOctokit && Date.now() < tokenExpiry) {
    return cachedOctokit;
  }

  if (!APP_ID || !PRIVATE_KEY || !INSTALLATION_ID) {
    throw new Error('GitHub App credentials not configured.');
  }

  const app = new App({
    appId: APP_ID,
    privateKey: PRIVATE_KEY.replace(/\\n/g, '\n'),
  });

  const { token, expiresAt } = await app.getInstallationAccessToken({
    installationId: parseInt(INSTALLATION_ID),
  });

  tokenExpiry = new Date(expiresAt).getTime() - 60000; 
  cachedOctokit = new Octokit({ auth: token });
  
  return cachedOctokit;
}

export async function publishSkill(skillName: string, content: string): Promise<{ url: string; command: string }> {
  const octokit = await getOctokit();
  
  let finalSkillName = skillName;
  const path = `skills/${finalSkillName}/SKILL.md`;

  try {
    try {
      await octokit.repos.getContent({
        owner: ORG,
        repo: REPO,
        path,
      });
      finalSkillName = `${skillName}-${Date.now()}`;
    } catch (e: any) {
      if (e.status !== 404) throw e;
    }

    const finalPath = `skills/${finalSkillName}/SKILL.md`;
    
    const { data: refData } = await octokit.git.getRef({
      owner: ORG,
      repo: REPO,
      ref: 'heads/main',
    });
    
    const latestCommitSha = refData.object.sha;
    
    const { data: commitData } = await octokit.git.getCommit({
      owner: ORG,
      repo: REPO,
      commit_sha: latestCommitSha,
    });
    
    const treeSha = commitData.tree.sha;
    
    const { data: blobData } = await octokit.git.createBlob({
      owner: ORG,
      repo: REPO,
      content,
      encoding: 'utf-8',
    });
    
    const { data: newTreeData } = await octokit.git.createTree({
      owner: ORG,
      repo: REPO,
      base_tree: treeSha,
      tree: [
        {
          path: finalPath,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha,
        },
      ],
    });
    
    const { data: newCommitData } = await octokit.git.createCommit({
      owner: ORG,
      repo: REPO,
      message: `Add ${finalSkillName} skill`,
      tree: newTreeData.sha,
      parents: [latestCommitSha],
    });
    
    await octokit.git.updateRef({
      owner: ORG,
      repo: REPO,
      ref: 'heads/main',
      sha: newCommitData.sha,
    });

    return {
      url: `https://github.com/${ORG}/${REPO}/tree/main/skills/${finalSkillName}`,
      command: `npx skills add ${ORG}/${REPO} --skill ${finalSkillName}`
    };
  } catch (error) {
    console.error('GitHub Publish Error:', error);
    throw new Error('Failed to publish to GitHub.');
  }
}
