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

  const variations = [
    targetUrl.endsWith('llms.txt') ? targetUrl : `${targetUrl}/llms.txt`,
    `${targetUrl}/llms.txt`, 
    targetUrl 
  ];

  const uniqueVariations = [...new Set(variations)];

  for (const url of uniqueVariations) {
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (response.ok) {
        const text = await response.text();
        if (text && text.length < 1024 * 1024) { 
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
