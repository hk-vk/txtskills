import { ParsedLlmsTxt } from './types';
import { slugify } from './slugify';

export function generateSkill(parsed: ParsedLlmsTxt, sourceUrl?: string): { name: string; content: string } {
  const name = slugify(parsed.title);
  
  const frontmatter = `---
name: ${name}
description: ${parsed.summary || parsed.description.substring(0, 150).replace(/\n/g, ' ')}
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
