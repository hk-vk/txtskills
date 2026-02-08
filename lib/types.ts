export interface LlmsTxtSection {
  title: string;
  links: LlmsTxtLink[];
}

export interface LlmsTxtLink {
  title: string;
  url: string;
  notes?: string;
}

export interface ParsedLlmsTxt {
  title: string;
  summary: string;
  description: string;
  sections: LlmsTxtSection[];
  optionalSections: LlmsTxtSection[];
}

export interface SkillMetadata {
  name: string;
  description: string;
  source: string;
  sourceUrl?: string;
  generated: string;
}

export interface PublishMetadata {
  skillName: string;
  sourceUrl: string | null;
  generatedAt: string;
  updatedAt: string;
  generatorVersion: string;
}

export interface ConversionResult {
  success: boolean;
  command?: string;
  githubUrl?: string;
  skillName?: string;
  skillContent?: string;
  isUpdate?: boolean;
  zipData?: string; 
  error?: ConversionError;
}

export interface ConversionError {
  type: 'fetch' | 'parse' | 'generate' | 'publish' | 'validation' | 'unknown';
  message: string;
  suggestion?: string;
}

export interface ConversionRequest {
  type: 'url' | 'content';
  url?: string;
  content?: string;
}
