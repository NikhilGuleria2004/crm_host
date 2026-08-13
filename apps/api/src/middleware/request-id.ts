export function requestId() {
  return async (c: any, next: any) => {
    const id = crypto.randomUUID();
    c.set('requestId', id);
    c.header('X-Request-Id', id);
    await next();
  };
}
