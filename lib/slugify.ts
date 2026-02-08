export function slugify(text: string): string {
  if (!text) return 'skill';

  let slug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')  // only lowercase alphanumeric, spaces, hyphens
    .replace(/[\s-]+/g, '-')        // collapse whitespace/hyphens into single hyphen
    .replace(/^-+|-+$/g, '');       // strip leading/trailing hyphens

  if (slug.length > 64) {
    slug = slug.substring(0, 64).replace(/-+$/, '');
  }

  if (!slug) return 'skill';
  return slug;
}

/** Validate a skill name against the Agent Skills spec. Returns error message or null. */
export function validateSkillName(name: string): string | null {
  if (!name) return null; // empty is fine (optional field)
  if (name.length > 64) return 'Must be 64 characters or fewer';
  if (!/^[a-z0-9-]+$/.test(name)) return 'Only lowercase letters, numbers, and hyphens allowed';
  if (name.startsWith('-')) return 'Must not start with a hyphen';
  if (name.endsWith('-')) return 'Must not end with a hyphen';
  if (name.includes('--')) return 'Must not contain consecutive hyphens';
  return null;
}
