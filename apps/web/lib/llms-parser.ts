import { marked } from 'marked';
import { ParsedLlmsTxt, LlmsTxtSection, LlmsTxtLink } from './types';

export function parseLlmsTxt(content: string): ParsedLlmsTxt {
  const tokens = marked.lexer(content);
  
  let title = 'Documentation';
  let summary = '';
  let description = '';
  const sections: LlmsTxtSection[] = [];
  const optionalSections: LlmsTxtSection[] = [];
  
  let currentSection: LlmsTxtSection | null = null;
  let isOptional = false;
  let descriptionParts: string[] = [];

  for (const token of tokens) {
    if (token.type === 'heading') {
      if (token.depth === 1) {
        title = token.text;
      } else if (token.depth === 2) {
        if (currentSection) {
          if (isOptional) optionalSections.push(currentSection);
          else sections.push(currentSection);
        }
        
        const sectionTitle = token.text;
        currentSection = { title: sectionTitle, links: [] };
        isOptional = sectionTitle.toLowerCase().includes('optional');
      }
    } else if (token.type === 'blockquote') {
      if (!summary) {
        summary = token.text.replace(/^> ?/gm, '').trim();
      }
    } else if (token.type === 'paragraph') {
      if (!currentSection && !summary) {
      } else if (!currentSection) {
        descriptionParts.push(token.text);
      }
    } else if (token.type === 'list' && currentSection) {
      for (const item of token.items) {
        const text = item.text;
        
        const linkMatch = text.match(/\[([^\]]+)\]\(([^)]+)\)(?::\s*(.*))?/);
        if (linkMatch) {
          const linkTitle = linkMatch[1];
          const url = linkMatch[2];
          const notes = linkMatch[3] || undefined;
          
          currentSection.links.push({ title: linkTitle, url, notes });
        } else {
           const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
           if (urlMatch) {
             currentSection.links.push({
               title: 'Link',
               url: urlMatch[1],
               notes: text.replace(urlMatch[1], '').trim() || undefined
             });
           }
        }
      }
    }
  }

  if (currentSection) {
    if (isOptional) optionalSections.push(currentSection);
    else sections.push(currentSection);
  }

  description = descriptionParts.join('\n\n').trim();
  if (!description && summary) description = summary;

  return { title, summary, description, sections, optionalSections };
}
