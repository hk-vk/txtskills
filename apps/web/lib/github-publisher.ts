import { App } from '@octokit/app';
import { Octokit } from '@octokit/rest';
import { PublishMetadata } from './types';
import { upsertSkillInDB } from './db';

const APP_ID = process.env.GITHUB_APP_ID;
const PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY;
const INSTALLATION_ID = process.env.GITHUB_INSTALLATION_ID;
const ORG = process.env.GITHUB_ORG || 'hk-vk';
const REPO = process.env.GITHUB_REPO || 'skills';
const REGISTRY_PREFIX = 'registry';
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
      path: `${REGISTRY_PREFIX}/${skillName}/SKILL.md`,
    });
    return true;
  } catch (e: any) {
    if (e.status === 404) return false;
    throw e;
  }
}

/**
 * List all skills in the repo using Git Trees API (single API call).
 * This is MUCH faster than the old N+1 approach.
 * 
 * Performance: 1 API call for tree + N parallel blob fetches (batched)
 * vs old: 1 + N sequential API calls
 */
export async function listAllSkills(): Promise<Array<{
  name: string;
  url: string;
  command: string;
  metadata: PublishMetadata | null;
}>> {
  const octokit = await getOctokit();

  try {
    // Get the main branch reference
    const { data: refData } = await octokit.git.getRef({
      owner: ORG,
      repo: REPO,
      ref: 'heads/main',
    });

    // Fetch the ENTIRE repo tree recursively in ONE API call
    const { data: treeData } = await octokit.git.getTree({
      owner: ORG,
      repo: REPO,
      tree_sha: refData.object.sha,
      recursive: 'true',
    });

    // Parse tree to find skills and their metadata blob SHAs
    const skillDirs = new Set<string>();
    const metadataBlobShas = new Map<string, string>(); // skillName -> blob sha

    for (const item of treeData.tree) {
      if (!item.path) continue;

      // Identify skill directories by SKILL.md presence (inside registry/ folder)
      const skillMdMatch = item.path.match(/^registry\/([^/]+)\/SKILL\.md$/);
      if (skillMdMatch) {
        skillDirs.add(skillMdMatch[1]);
      }

      // Track metadata blob SHAs for later fetching
      const metaMatch = item.path.match(/^registry\/([^/]+)\/\.metadata\.json$/);
      if (metaMatch && item.sha) {
        metadataBlobShas.set(metaMatch[1], item.sha);
      }
    }

    if (skillDirs.size === 0) return [];

    // Fetch metadata blobs in parallel (much faster than sequential)
    // Limit concurrency to avoid rate limiting
    const BATCH_SIZE = 10;
    const skillNames = Array.from(skillDirs);
    const metadataMap = new Map<string, PublishMetadata | null>();

    for (let i = 0; i < skillNames.length; i += BATCH_SIZE) {
      const batch = skillNames.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (skillName) => {
          const blobSha = metadataBlobShas.get(skillName);
          if (!blobSha) return { skillName, metadata: null };

          try {
            const { data } = await octokit.git.getBlob({
              owner: ORG,
              repo: REPO,
              file_sha: blobSha,
            });
            const content = Buffer.from(data.content, 'base64').toString('utf-8');
            return { skillName, metadata: JSON.parse(content) as PublishMetadata };
          } catch {
            return { skillName, metadata: null };
          }
        })
      );

      for (const { skillName, metadata } of batchResults) {
        metadataMap.set(skillName, metadata);
      }
    }

    // Build and sort skills array
    const skills = skillNames
      .map(name => ({
        name,
        url: `https://github.com/${ORG}/${REPO}/tree/main/${REGISTRY_PREFIX}/${name}`,
        command: `npx txtskills add ${name}`,
        metadata: metadataMap.get(name) || null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return skills;
  } catch (e: any) {
    if (e.status === 404) return [];
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
      path: `${REGISTRY_PREFIX}/${skillName}/SKILL.md`,
    });

    if (!('content' in skillFile)) return null;

    const skillContent = Buffer.from(skillFile.content, 'base64').toString('utf-8');

    // Try to fetch .metadata.json (optional)
    let metadata: PublishMetadata | null = null;
    try {
      const { data: metaFile } = await octokit.repos.getContent({
        owner: ORG,
        repo: REPO,
        path: `${REGISTRY_PREFIX}/${skillName}/.metadata.json`,
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
      url: `https://github.com/${ORG}/${REPO}/tree/main/${REGISTRY_PREFIX}/${skillName}`,
      command: `npx txtskills add ${skillName}`,
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

  const skillPath = `${REGISTRY_PREFIX}/${skillName}/SKILL.md`;
  const metadataPath = `${REGISTRY_PREFIX}/${skillName}/.metadata.json`;
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

    const githubUrl = `https://github.com/${ORG}/${REPO}/tree/main/${REGISTRY_PREFIX}/${skillName}`;
    const installCommand = `npx txtskills add ${skillName}`;

    // Also save to D1 database for fast listing
    try {
      await upsertSkillInDB({
        name: skillName,
        sourceUrl: sourceUrl || null,
        githubUrl,
        installCommand,
        contentHash: contentHash || null,
        generatorVersion: GENERATOR_VERSION,
      });
    } catch (dbError: any) {
      // Log but don't fail - GitHub is the source of truth
      console.error('D1 upsert failed (non-fatal):', dbError?.message);
    }

    return {
      url: githubUrl,
      command: installCommand,
      isUpdate,
    };
  } catch (error: any) {
    console.error('GitHub Publish Error:', error?.response?.data?.message || error?.message);
    throw new Error('Failed to publish to GitHub.');
  }
}

/**
 * Update the skills.json manifest file in the repo.
 * This file is required by the `skills` CLI to list available skills.
 */
export async function updateSkillsManifest(): Promise<void> {
  const octokit = await getOctokit();

  try {
    // Get all skills
    const skills = await listAllSkills();

    // Create manifest JSON
    const manifest = {
      skills: skills.map(s => ({
        name: s.name,
        sourceUrl: s.metadata?.sourceUrl || null,
      })),
    };

    const manifestContent = JSON.stringify(manifest, null, 2);

    // Get latest commit SHA
    const { data: refData } = await octokit.git.getRef({
      owner: ORG,
      repo: REPO,
      ref: 'heads/main',
    });
    const latestCommitSha = refData.object.sha;

    // Get the tree
    const { data: commitData } = await octokit.git.getCommit({
      owner: ORG,
      repo: REPO,
      commit_sha: latestCommitSha,
    });
    const treeSha = commitData.tree.sha;

    // Create blob for skills.json
    const { data: blobData } = await octokit.git.createBlob({
      owner: ORG,
      repo: REPO,
      content: manifestContent,
      encoding: 'utf-8',
    });

    // Create new tree
    const { data: newTreeData } = await octokit.git.createTree({
      owner: ORG,
      repo: REPO,
      base_tree: treeSha,
      tree: [
        {
          path: 'skills.json',
          mode: '100644',
          type: 'blob',
          sha: blobData.sha,
        },
      ],
    });

    // Create commit
    const { data: newCommitData } = await octokit.git.createCommit({
      owner: ORG,
      repo: REPO,
      message: 'Update skills.json manifest',
      tree: newTreeData.sha,
      parents: [latestCommitSha],
    });

    // Update main branch
    await octokit.git.updateRef({
      owner: ORG,
      repo: REPO,
      ref: 'heads/main',
      sha: newCommitData.sha,
    });
  } catch (error: any) {
    console.error('Failed to update skills.json:', error?.message);
    throw new Error('Failed to update skills manifest.');
  }
}
