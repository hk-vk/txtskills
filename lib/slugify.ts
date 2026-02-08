export function slugify(text: string): string {
  if (!text) return 'skill';
  
  let slug = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (slug.length > 64) {
    slug = slug.substring(0, 64).replace(/-+$/, '');
  }

  if (!slug) return 'skill';
  return slug;
}
