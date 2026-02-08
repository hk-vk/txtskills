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

  const installationOctokit = await app.getInstallationOctokit(
    parseInt(INSTALLATION_ID)
  );

  // Cache for 50 minutes (installation tokens last 1 hour)
  tokenExpiry = Date.now() + 50 * 60 * 1000;
  cachedOctokit = installationOctokit as unknown as Octokit;
  
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
      path: `skills/${skillName}/SKILL.md`,
    });
    return true;
  } catch (e: any) {
    if (e.status === 404) return false;
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
  sourceUrl?: string
): Promise<{ url: string; command: string; isUpdate: boolean }> {
  const octokit = await getOctokit();
  
  const isUpdate = await skillExists(octokit, skillName);
  const now = new Date().toISOString();

  // Create metadata JSON for provenance tracking
  const metadata: PublishMetadata = {
    skillName,
    sourceUrl: sourceUrl || null,
    generatedAt: now,
    updatedAt: now,
    generatorVersion: GENERATOR_VERSION,
  };

  const skillPath = `skills/${skillName}/SKILL.md`;
  const metadataPath = `skills/${skillName}/.metadata.json`;
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
      url: `https://github.com/${ORG}/${REPO}/tree/main/skills/${skillName}`,
      command: `npx skills add ${ORG}/${REPO} --skill ${skillName}`,
      isUpdate,
    };
  } catch (error) {
    console.error('GitHub Publish Error:', error);
    throw new Error('Failed to publish to GitHub.');
  }
}
