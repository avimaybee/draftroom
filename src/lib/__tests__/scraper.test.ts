import { test } from 'node:test';
import assert from 'node:assert';
import { normalizeUrl, fetchSiteContent } from '../scraper';

test('Web Scraper Utility', async (t) => {
  await t.test('normalizeUrl should prepend http protocols when missing', () => {
    assert.strictEqual(normalizeUrl('example.com'), 'https://example.com');
    assert.strictEqual(normalizeUrl('http://example.com'), 'http://example.com');
    assert.strictEqual(normalizeUrl('https://example.com'), 'https://example.com');
  });

  await t.test('fetchSiteContent should parse JSON response from Jina Reader', async () => {
    const originalFetch = globalThis.fetch;
    
    // Mock global fetch
    globalThis.fetch = async (url: any, init?: RequestInit) => {
      assert.strictEqual(url.toString(), 'https://r.jina.ai/https://example.com');
      assert.strictEqual(init?.headers && (init.headers as any)['Accept'], 'application/json');
      
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          code: 200,
          status: 20000,
          data: {
            title: 'Example Domain',
            url: 'https://example.com',
            content: 'This is the main markdown content of the scraped site.',
            description: 'A mock site description'
          }
        })
      } as any;
    };

    try {
      const result = await fetchSiteContent('example.com');
      assert.strictEqual(result.title, 'Example Domain');
      assert.strictEqual(result.url, 'https://example.com');
      assert.strictEqual(result.content, 'This is the main markdown content of the scraped site.');
      assert.strictEqual(result.description, 'A mock site description');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('fetchSiteContent should truncate content if it exceeds 15,000 characters', async () => {
    const originalFetch = globalThis.fetch;
    const longContent = 'A'.repeat(20000);

    globalThis.fetch = async () => {
      return {
        ok: true,
        json: async () => ({
          data: {
            title: 'Long Site',
            content: longContent,
            description: ''
          }
        })
      } as any;
    };

    try {
      const result = await fetchSiteContent('example.com');
      assert.strictEqual(result.content.length, 15000 + '\n\n[Content truncated due to length limitations]'.length);
      assert.ok(result.content.endsWith('[Content truncated due to length limitations]'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('fetchSiteContent should throw error on request timeout', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async (url: any, init?: RequestInit) => {
      // Simulate timeout abort
      return new Promise((_, reject) => {
        const error = new Error('The user aborted a request.');
        error.name = 'AbortError';
        reject(error);
      });
    };

    try {
      await assert.rejects(
        fetchSiteContent('example.com', 10),
        /Scraping request timed out after/
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
