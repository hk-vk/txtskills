export async function fetchLlmsTxt(urlInput: string): Promise<string> {
  const timeout = 10000;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  let targetUrl = urlInput;
  if (!targetUrl.startsWith('http')) {
    targetUrl = `https://${targetUrl}`;
  }
  
  if (targetUrl.endsWith('/')) {
    targetUrl = targetUrl.slice(0, -1);
  }

  const baseUrl = targetUrl.endsWith('llms.txt')
    ? targetUrl.replace(/\/?\.?well-known\/llms\.txt$|\/llms\.txt$/, '')
    : targetUrl;

  const variations = [
    targetUrl.endsWith('llms.txt') ? targetUrl : `${baseUrl}/llms.txt`,
    `${baseUrl}/llms.txt`,
    `${baseUrl}/.well-known/llms.txt`,
    targetUrl
  ];

  const uniqueVariations = [...new Set(variations)];

  for (const url of uniqueVariations) {
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
          continue;
        }
        const text = await response.text();
        const trimmed = text.trimStart();
        if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<HTML')) {
          continue;
        }
        if (text && text.length < 2 * 1024 * 1024) {
          clearTimeout(id);
          return text;
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch ${url}:`, error);
    }
  }

  clearTimeout(id);
  throw new Error('Could not fetch llms.txt from the provided URL.');
}
