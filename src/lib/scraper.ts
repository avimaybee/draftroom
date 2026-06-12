/**
 * Web Scraping utility using Jina Reader (https://r.jina.ai)
 * Optimised for fetching and extracting website content for LLMs.
 */

export interface ScrapedContent {
  title: string;
  url: string;
  content: string;
  description: string;
}

/**
 * Normalises a URL to ensure it has a protocol (defaults to https://)
 */
export function normalizeUrl(url: string): string {
  let cleaned = url.trim();
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
}

/**
 * Fetches website content via Jina Reader.
 * Falls back to basic direct fetch or throws error if unreachable.
 */
export async function fetchSiteContent(url: string, timeoutMs: number = 15000): Promise<ScrapedContent> {
  const normalized = normalizeUrl(url);
  const targetUrl = `https://r.jina.ai/${normalized}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers: HeadersInit = {
    'Accept': 'application/json',
  };

  // Support optional JINA_API_KEY from environment if available
  const jinaKey = (process as any).env?.JINA_API_KEY;
  if (jinaKey && jinaKey !== 'placeholder') {
    headers['Authorization'] = `Bearer ${jinaKey}`;
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Jina Reader returned status ${response.status}: ${response.statusText}`);
    }

    const json = (await response.json()) as {
      data?: {
        title?: string;
        content?: string;
        description?: string;
      };
    };
    if (json && json.data) {
      const data = json.data;
      const title = data.title || '';
      const content = data.content || '';
      const description = data.description || '';

      // Truncate markdown to 15,000 characters
      const maxChars = 15000;
      let truncatedContent = content;
      if (content.length > maxChars) {
        truncatedContent = content.substring(0, maxChars) + '\n\n[Content truncated due to length limitations]';
      }

      return {
        title,
        url: normalized,
        content: truncatedContent,
        description,
      };
    } else {
      throw new Error('Invalid response structure from Jina Reader API');
    }
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Scraping request timed out after ${timeoutMs / 1000} seconds.`);
    }
    throw error;
  }
}
