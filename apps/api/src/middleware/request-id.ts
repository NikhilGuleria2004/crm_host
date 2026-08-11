export function requestId() {
  return async (c: any, next: any) => {
    c.set('requestId', crypto.randomUUID());
    await next();
  };
}
