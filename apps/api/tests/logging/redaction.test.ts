import { describe, it, expect, vi, beforeEach } from 'vitest';
import pino from 'pino';

describe('P12 Logger Redaction', () => {
  const REDACTED_FIELDS = [
    'password',
    'secret',
    'token',
    'cookie',
    'apiKey',
    'api_key',
    'reset_token',
    'MONGODB_URI',
    'authorization',
    'rawKey',
    'sessionToken',
    'ipAddress',
    'userAgent',
    'integrationSecret',
    'webhookSecret',
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should redact top-level sensitive fields', () => {
    const chunks: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: any, ...args: any[]) => {
      chunks.push(typeof chunk === 'string' ? chunk : '');
      return originalWrite(chunk, ...args);
    });

    const logger = pino({
      level: 'info',
      redact: REDACTED_FIELDS,
    });

    logger.info({
      password: 'secret123',
      secret: 'my-secret',
      token: 'abc123',
      email: 'user@example.com',
    });

    const logLine = JSON.parse(chunks[0]);
    expect(logLine.password).toBe('[Redacted]');
    expect(logLine.secret).toBe('[Redacted]');
    expect(logLine.token).toBe('[Redacted]');
    expect(logLine.email).toBe('user@example.com');
  });

  it('should redact nested sensitive fields', () => {
    const chunks: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: any, ...args: any[]) => {
      chunks.push(typeof chunk === 'string' ? chunk : '');
      return originalWrite(chunk, ...args);
    });

    const logger = pino({
      level: 'info',
      redact: [...REDACTED_FIELDS, 'user.password'],
    });

    logger.info({
      user: {
        name: 'John',
        password: 'secret123',
      },
      secret: 'top-secret',
    });

    const logLine = JSON.parse(chunks[0]);
    expect(logLine.user.password).toBe('[Redacted]');
    expect(logLine.secret).toBe('[Redacted]');
    expect(logLine.user.name).toBe('John');
  });
});
