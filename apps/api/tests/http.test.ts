import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeFetch } from '../src/utils/http';

describe('P34 Safe Fetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch successfully within timeout and size limits', async () => {
    const mockResponse = new Response('hello', { status: 200 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any);

    const response = await safeFetch('https://example.com/api');

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('hello');
  });

  it('should return 408 when request is aborted', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    const response = await safeFetch('https://example.com/api', undefined, { timeoutMs: 100 });

    expect(response.status).toBe(408);
    const body = await response.json();
    expect(body.error.code).toBe('REQUEST_TIMEOUT');
  });

  it('should reject response exceeding max bytes', async () => {
    const largeBody = new Uint8Array(2 * 1024 * 1024);
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(largeBody);
        controller.close();
      },
    });

    const mockResponse = new Response(mockStream, { status: 200 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any);

    const response = await safeFetch('https://example.com/api', undefined, { maxBytes: 1024 });

    expect(response.status).toBe(413);
    const body = await response.json();
    expect(body.error.code).toBe('RESPONSE_TOO_LARGE');
  });

  it('should pass through non-ok responses', async () => {
    const mockResponse = new Response('not found', { status: 404 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any);

    const response = await safeFetch('https://example.com/api');

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('not found');
  });

  it('should handle network errors gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    await expect(safeFetch('https://example.com/api')).rejects.toThrow('Network error');
  });
});
