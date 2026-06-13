/**
 * Web Scraping utility using Fetch-First or Cloudflare Browser Run Quick Actions.
 * Optimised for fetching and extracting website content for LLMs.
 */

export interface ScrapedContent {
  title: string;
  url: string;
  content: string;
  description: string;
  screenshot?: string;
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

// Helpers for Fetch-First
async function fetchDirectly(url: string, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    clearTimeout(id);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return null;
    }
    return await res.text();
  } catch {
    clearTimeout(id);
    return null;
  }
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : '';
}

function extractDescription(html: string): string {
  const match = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i) ||
                html.match(/<meta[^>]*content="([^"]*)"[^>]*name="description"/i);
  return match ? match[1].trim() : '';
}

function cleanHtml(html: string): string {
  let text = html;
  text = text.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '');
  text = text.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '');
  text = text.replace(/<svg[^>]*>([\s\S]*?)<\/svg>/gi, '');
  text = text.replace(/<noscript[^>]*>([\s\S]*?)<\/noscript>/gi, '');
  text = text.replace(/<\/?[^>]+(>|$)/g, ' ');
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function isLikelySPAOrEmpty(html: string, cleanedText: string): boolean {
  if (cleanedText.length < 600) return true;
  const lowerText = cleanedText.toLowerCase();
  const lowerHtml = html.toLowerCase();
  if (lowerText.includes('enable javascript') || lowerText.includes('need javascript to run')) {
    return true;
  }
  if (lowerHtml.includes('<div id="app"></div>') && !lowerHtml.includes('</a>') && !lowerHtml.includes('</p>')) {
    return true;
  }
  if (lowerHtml.includes('<div id="root"></div>') && !lowerHtml.includes('</a>') && !lowerHtml.includes('</p>')) {
    return true;
  }
  return false;
}

/**
 * Fetches website content via Cloudflare Browser Run Quick Action /snapshot.
 */
export async function scrapeWithBrowserRun(url: string, browserBinding: any, timeoutMs: number = 30000): Promise<ScrapedContent> {
  const normalized = normalizeUrl(url);
  try {
    if (!browserBinding || typeof browserBinding.quickAction !== 'function') {
      throw new Error("Browser binding does not support quickAction");
    }

    const snapshot = await browserBinding.quickAction("snapshot", {
      url: normalized,
      formats: ["markdown", "screenshot", "content"],
    }) as { markdown?: string; screenshot?: string; content?: string };

    if (!snapshot) {
      throw new Error("Failed to capture snapshot from Browser Run");
    }

    const content = snapshot.markdown || "";
    const html = snapshot.content || "";
    const title = html ? extractTitle(html) : "";
    const description = html ? extractDescription(html) : "";
    const screenshot = snapshot.screenshot || undefined;

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
      screenshot,
    };
  } catch (error: any) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`Browser Run quickAction failed for ${normalized}:`, error);

    // Identify 429 / limit exceeded error
    if (
      errMsg.includes("429") ||
      errMsg.toLowerCase().includes("rate limit") ||
      errMsg.toLowerCase().includes("limit exceeded") ||
      errMsg.toLowerCase().includes("time limit exceeded") ||
      (error.status && error.status === 429)
    ) {
      const limitError = new Error(`429: Cloudflare Browser Run limits exceeded: ${errMsg}`);
      (limitError as any).status = 429;
      throw limitError;
    }
    throw error;
  }
}

/**
 * Fetches website content via Jina Reader.
 */
async function fetchSiteContentViaJina(url: string, timeoutMs: number = 15000): Promise<ScrapedContent> {
  const normalized = normalizeUrl(url);
  const targetUrl = `https://r.jina.ai/${normalized}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers: HeadersInit = {
    'Accept': 'application/json',
  };

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

/**
 * Coordinated scraper that tries a direct HTML fetch first (zero Browser Run limit usage),
 * and if that fails or returns dynamic/SPA indicators, falls back to Browser Run / Jina.
 */
export async function fetchSiteContent(url: string, timeoutMs: number = 20000): Promise<ScrapedContent> {
  const normalized = normalizeUrl(url);

  // 1. Try Fetch-First (Direct static fetch)
  try {
    console.log(`Attempting Fetch-First direct fetch for ${normalized}`);
    const html = await fetchDirectly(normalized, timeoutMs);
    if (html) {
      const title = extractTitle(html);
      const description = extractDescription(html);
      const cleaned = cleanHtml(html);
      
      if (!isLikelySPAOrEmpty(html, cleaned)) {
        console.log(`Fetch-First successful for ${normalized} (${cleaned.length} chars)`);
        const maxChars = 15000;
        let truncatedContent = cleaned;
        if (cleaned.length > maxChars) {
          truncatedContent = cleaned.substring(0, maxChars) + '\n\n[Content truncated due to length limitations]';
        }
        return {
          title,
          url: normalized,
          content: truncatedContent,
          description,
        };
      } else {
        console.log(`Fetch-First returned sparse content or SPA indicator. Falling back to browser/Jina.`);
      }
    }
  } catch (err) {
    console.warn(`Fetch-First direct fetch failed for ${normalized}:`, err);
  }

  // 2. Fallback to Browser Run (if present) or Jina
  const browserBinding = (process as any).env?.BROWSER;
  
  if (browserBinding) {
    console.log(`Attempting Browser Run edge scraping for ${normalized}`);
    try {
      return await scrapeWithBrowserRun(normalized, browserBinding, timeoutMs + 10000);
    } catch (error: unknown) {
      if (error instanceof Error && (error as any).status === 429) {
        throw error; // Propagate limits to workflow
      }
      console.warn(`Browser Run scraping failed for ${normalized}, falling back to Jina Reader:`, error);
      return await fetchSiteContentViaJina(normalized, timeoutMs);
    }
  } else {
    console.log(`Browser Run binding not found. Using Jina Reader for ${normalized}`);
    return await fetchSiteContentViaJina(normalized, timeoutMs);
  }
}
