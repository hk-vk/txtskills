import { ParsedLlmsTxt } from './types';
import { slugify } from './slugify';

export function generateSkill(parsed: ParsedLlmsTxt, sourceUrl?: string): { name: string; content: string } {
  const name = slugify(parsed.title);
  
  // Generate a meaningful description (required by Agent Skills spec, 1-1024 chars)
  let description = '';
  if (parsed.summary) {
    description = parsed.summary;
  } else if (parsed.description) {
    // Take first 200 chars of description
    description = parsed.description.substring(0, 200).replace(/\n/g, ' ').trim();
  } else {
    // Fallback description based on title
    description = `${parsed.title} documentation and resources. Use this skill when working with ${parsed.title} or when the user mentions ${parsed.title.toLowerCase()}.`;
  }
  
  // Ensure description is not empty and not too long
  if (!description || description.length === 0) {
    description = `${parsed.title} documentation and best practices.`;
  }
  if (description.length > 1024) {
    description = description.substring(0, 1020) + '...';
  }
  
  const frontmatter = `---
name: ${name}
description: ${description}
metadata:
  source: llms.txt
  source_url: ${sourceUrl || 'unknown'}
  generated: ${new Date().toISOString()}
---`;

  let body = `# ${parsed.title}\n\n`;
  
  if (parsed.summary) {
    body += `> ${parsed.summary}\n\n`;
  }
  
  if (parsed.description) {
    body += `${parsed.description}\n\n`;
  }
  
  body += `## Available Resources\n\n`;
  
  if (parsed.sections.length === 0) {
    body += `No specific resources found.\n\n`;
  }
  
  for (const section of parsed.sections) {
    body += `### ${section.title}\n\n`;
    for (const link of section.links) {
      body += `- **${link.title}**${link.notes ? `: ${link.notes}` : ''}\n`;
      body += `  - URL: ${link.url}\n\n`;
    }
  }
  
  if (parsed.optionalSections.length > 0) {
    body += `## Additional Resources (Optional)\n\n`;
    for (const section of parsed.optionalSections) {
      body += `### ${section.title}\n\n`;
      for (const link of section.links) {
        body += `- **${link.title}**${link.notes ? `: ${link.notes}` : ''}\n`;
        body += `  - URL: ${link.url}\n\n`;
      }
    }
  }
  
  body += `## How to Use This Skill\n\n`;
  body += `Reference these resources when working with ${parsed.title}.`;
  
  return {
    name,
    content: `${frontmatter}\n\n${body}`
  };
}
