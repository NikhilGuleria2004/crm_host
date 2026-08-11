import { env } from '../config/env';

export function cors() {
  const allowedOrigin = env.CORS_ORIGIN;

  return async (c: any, next: any) => {
    const origin = c.req.header('Origin');

    if (origin) {
      c.header('Access-Control-Allow-Origin', origin === allowedOrigin ? origin : allowedOrigin);
      c.header('Access-Control-Allow-Credentials', 'true');
      c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
      c.header('Access-Control-Max-Age', '86400');
    }

    if (c.req.method === 'OPTIONS') {
      return c.json(null, 204);
    }

    await next();
  };
}
