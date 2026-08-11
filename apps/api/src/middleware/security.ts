import { env } from '../config/env';

export function requestId() {
  return async (c: any, next: any) => {
    c.set('requestId', crypto.randomUUID());
    await next();
  };
}

export function securityHeaders() {
  return async (c: any, next: any) => {
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (env.NODE_ENV === 'production') {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    await next();
  };
}
