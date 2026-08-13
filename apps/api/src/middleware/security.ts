import { env } from '../config/env';

export function requestId() {
  return async (c: any, next: any) => {
    const id = crypto.randomUUID();
    c.set('requestId', id);
    c.header('X-Request-Id', id);
    await next();
  };
}

export function securityHeaders() {
  return async (c: any, next: any) => {
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
    if (env.APP_ENV === 'production') {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    await next();
  };
}
