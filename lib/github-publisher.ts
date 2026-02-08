import { App } from '@octokit/app';
import { Octokit } from '@octokit/rest';
import { PublishMetadata } from './types';

const APP_ID = process.env.GITHUB_APP_ID;
const PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY;
const INSTALLATION_ID = process.env.GITHUB_INSTALLATION_ID;
const ORG = process.env.GITHUB_ORG || 'hk-vk';
const REPO = process.env.GITHUB_REPO || 'skills';
const GENERATOR_VERSION = '1.0.0';

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

  // Get installation access token via the App's JWT-authenticated Octokit
  let data: any;
  try {
    const response = await app.octokit.request(
      'POST /app/installations/{installation_id}/access_tokens',
      { installation_id: parseInt(INSTALLATION_ID) }
    );
    data = response.data;
  } catch (e: any) {
    console.error('GitHub App auth failed:', e?.response?.data?.message || e?.message);
    throw new Error('GitHub App authentication failed.');
  }

  // Create a full @octokit/rest instance with the token (has .repos, .git, etc.)
  cachedOctokit = new Octokit({ auth: data.token });

  // Cache for 50 minutes (installation tokens last 1 hour)
  tokenExpiry = Date.now() + 50 * 60 * 1000;
  
  return cachedOctokit;
}

/**
 * Check if a skill already exists in the repo.
 * Returns true if the skill directory exists.
 */
async function skillExists(octokit: Octokit, skillName: string): Promise<boolean> {
  try {
    await octokit.repos.getContent({
      owner: ORG,
      repo: REPO,
      path: `${skillName}/SKILL.md`,
    });
    return true;
  } catch (e: any) {
    if (e.status === 404) return false;
    throw e;
  }
}

/**
 * Fetch an existing skill's content and metadata from the repo.
 * Returns null if the skill doesn't exist.
 */
export async function getExistingSkill(skillName: string): Promise<{
  skillContent: string;
  metadata: PublishMetadata | null;
  url: string;
  command: string;
} | null> {
  const octokit = await getOctokit();

  try {
    // Fetch SKILL.md content
    const { data: skillFile } = await octokit.repos.getContent({
      owner: ORG,
      repo: REPO,
      path: `${skillName}/SKILL.md`,
    });

    if (!('content' in skillFile)) return null;

    const skillContent = Buffer.from(skillFile.content, 'base64').toString('utf-8');

    // Try to fetch .metadata.json (optional)
    let metadata: PublishMetadata | null = null;
    try {
      const { data: metaFile } = await octokit.repos.getContent({
        owner: ORG,
        repo: REPO,
        path: `${skillName}/.metadata.json`,
      });
      if ('content' in metaFile) {
        const metaContent = Buffer.from(metaFile.content, 'base64').toString('utf-8');
        metadata = JSON.parse(metaContent);
      }
    } catch {
      // .metadata.json may not exist for older skills
    }

    return {
      skillContent,
      metadata,
      url: `https://github.com/${ORG}/${REPO}/tree/main/${skillName}`,
      command: `npx skills add ${ORG}/${REPO} --skill ${skillName}`,
    };
  } catch (e: any) {
    if (e.status === 404) return null;
    throw e;
  }
}

/**
 * Publish or update a skill in the GitHub repo.
 * If the skill already exists, it updates in-place (overwrites SKILL.md and .metadata.json).
 * Returns the GitHub URL, install command, and whether it was an update.
 */
export async function publishSkill(
  skillName: string,
  content: string,
  sourceUrl?: string,
  contentHash?: string
): Promise<{ url: string; command: string; isUpdate: boolean }> {
  const octokit = await getOctokit();
  
  const isUpdate = await skillExists(octokit, skillName);
  const now = new Date().toISOString();

  // Create metadata JSON for provenance tracking
  const metadata: PublishMetadata = {
    skillName,
    sourceUrl: sourceUrl || null,
    contentHash: contentHash || '',
    generatedAt: now,
    updatedAt: now,
    generatorVersion: GENERATOR_VERSION,
  };

  const skillPath = `${skillName}/SKILL.md`;
  const metadataPath = `${skillName}/.metadata.json`;
  const metadataContent = JSON.stringify(metadata, null, 2);

  try {
    // Get latest commit SHA from main branch
    const { data: refData } = await octokit.git.getRef({
      owner: ORG,
      repo: REPO,
      ref: 'heads/main',
    });
    const latestCommitSha = refData.object.sha;

    // Get the tree of the latest commit
    const { data: commitData } = await octokit.git.getCommit({
      owner: ORG,
      repo: REPO,
      commit_sha: latestCommitSha,
    });
    const treeSha = commitData.tree.sha;

    // Create blobs for SKILL.md and .metadata.json
    const [skillBlob, metadataBlob] = await Promise.all([
      octokit.git.createBlob({
        owner: ORG,
        repo: REPO,
        content,
        encoding: 'utf-8',
      }),
      octokit.git.createBlob({
        owner: ORG,
        repo: REPO,
        content: metadataContent,
        encoding: 'utf-8',
      }),
    ]);

    // Create a new tree with both files (this overwrites if they already exist)
    const { data: newTreeData } = await octokit.git.createTree({
      owner: ORG,
      repo: REPO,
      base_tree: treeSha,
      tree: [
        {
          path: skillPath,
          mode: '100644',
          type: 'blob',
          sha: skillBlob.data.sha,
        },
        {
          path: metadataPath,
          mode: '100644',
          type: 'blob',
          sha: metadataBlob.data.sha,
        },
      ],
    });

    // Create a commit
    const commitMessage = isUpdate
      ? `Update ${skillName} skill`
      : `Add ${skillName} skill`;

    const { data: newCommitData } = await octokit.git.createCommit({
      owner: ORG,
      repo: REPO,
      message: commitMessage,
      tree: newTreeData.sha,
      parents: [latestCommitSha],
    });

    // Update main branch reference
    await octokit.git.updateRef({
      owner: ORG,
      repo: REPO,
      ref: 'heads/main',
      sha: newCommitData.sha,
    });

    return {
      url: `https://github.com/${ORG}/${REPO}/tree/main/${skillName}`,
      command: `npx skills add ${ORG}/${REPO} --skill ${skillName}`,
      isUpdate,
    };
  } catch (error: any) {
    console.error('GitHub Publish Error:', error?.response?.data?.message || error?.message);
    throw new Error('Failed to publish to GitHub.');
  }
}
