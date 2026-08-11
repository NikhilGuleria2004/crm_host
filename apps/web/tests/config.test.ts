import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('P15 Frontend API Configuration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should use relative API base when VITE_API_URL is not set', async () => {
    const { getApiBase } = await import('../src/lib/request');
    expect(getApiBase()).toBe('/api/v1');
  });

  it('should construct API base from VITE_API_URL', async () => {
    const { getApiBase } = await import('../src/lib/request');
    const base = getApiBase();
    expect(base).toContain('/api/v1');
  });
});
