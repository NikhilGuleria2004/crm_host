type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix?: string;
};

export function rateLimiter(options: RateLimitOptions) {
  const { windowMs, max, keyPrefix = 'rl' } = options;
  const limits = new Map<string, { count: number; resetAt: number }>();

  return async (c: any, next: any) => {
    const key = `${keyPrefix}:${c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'anonymous'}`;
    const now = Date.now();

    const entry = limits.get(key);
    if (!entry || now > entry.resetAt) {
      limits.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count += 1;
      if (entry.count > max) {
        c.header('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
        return c.json(
          { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
          429
        );
      }
    }

    await next();
  };
}
