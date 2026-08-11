import { rateLimitStore } from './rate-limit.store';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix?: string;
};

export function rateLimiter(options: RateLimitOptions) {
  const { windowMs, max, keyPrefix = 'rl' } = options;

  return async (c: any, next: any) => {
    const ip = c.req.header('x-real-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
    const key = `${keyPrefix}:${ip}`;

    const result = await rateLimitStore.hit(key, windowMs, max);

    if (!result.allowed) {
      c.header('Retry-After', String(Math.ceil((result.resetAt - Date.now()) / 1000)));
      return c.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
        429
      );
    }

    c.header('X-RateLimit-Limit', String(max));
    c.header('X-RateLimit-Remaining', String(result.remaining));
    c.header('X-RateLimit-Reset', String(result.resetAt));

    await next();
  };
}
