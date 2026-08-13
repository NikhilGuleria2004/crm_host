const limits: Record<string, number> = {
  'application/json': 1 * 1024 * 1024,
  'application/x-www-form-urlencoded': 1 * 1024 * 1024,
  'multipart/form-data': 10 * 1024 * 1024,
};

export function requestSizeLimit() {
  return async (c: any, next: any) => {
    const contentLength = c.req.header('content-length');
    const contentType = c.req.header('content-type') || '';

    if (contentLength) {
      const size = parseInt(contentLength, 10);
      const limit = limits[contentType.split(';')[0]] || 1 * 1024 * 1024;

      if (size > limit) {
        return c.json(
          { error: { code: 'PAYLOAD_TOO_LARGE', message: `Request body exceeds maximum allowed size of ${limit / 1024 / 1024} MB` } },
          413
        );
      }
    }

    await next();
  };
}
