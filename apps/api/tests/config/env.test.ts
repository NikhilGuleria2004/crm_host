import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['local', 'preview', 'production']).default('local'),
  PORT: z.coerce.number().default(3000),
  MONGODB_URI: z.string().url(),
  MONGODB_DATABASE: z.string().default('crm'),
  SESSION_SECRET: z.string().min(32),
  COOKIE_DOMAIN: z.string().default('localhost'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

describe('P14 Environment Config', () => {
  it('should default APP_ENV to local when not set', () => {
    const result = envSchema.parse({
      NODE_ENV: 'development',
      MONGODB_URI: 'mongodb://localhost:27017/crm',
      SESSION_SECRET: 'a'.repeat(32),
    });
    expect(result.APP_ENV).toBe('local');
  });

  it('should accept local APP_ENV', () => {
    const result = envSchema.parse({
      NODE_ENV: 'development',
      APP_ENV: 'local',
      MONGODB_URI: 'mongodb://localhost:27017/crm',
      SESSION_SECRET: 'a'.repeat(32),
    });
    expect(result.APP_ENV).toBe('local');
  });

  it('should accept preview APP_ENV', () => {
    const result = envSchema.parse({
      NODE_ENV: 'production',
      APP_ENV: 'preview',
      MONGODB_URI: 'mongodb://localhost:27017/crm',
      SESSION_SECRET: 'a'.repeat(32),
      CORS_ORIGIN: 'https://preview.vercel.app',
      COOKIE_DOMAIN: '.vercel.app',
    });
    expect(result.APP_ENV).toBe('preview');
    expect(result.CORS_ORIGIN).toBe('https://preview.vercel.app');
    expect(result.COOKIE_DOMAIN).toBe('.vercel.app');
  });

  it('should accept production APP_ENV', () => {
    const result = envSchema.parse({
      NODE_ENV: 'production',
      APP_ENV: 'production',
      MONGODB_URI: 'mongodb://localhost:27017/crm',
      SESSION_SECRET: 'a'.repeat(32),
      CORS_ORIGIN: 'https://crm.example.com',
      COOKIE_DOMAIN: 'crm.example.com',
    });
    expect(result.APP_ENV).toBe('production');
    expect(result.CORS_ORIGIN).toBe('https://crm.example.com');
    expect(result.COOKIE_DOMAIN).toBe('crm.example.com');
  });

  it('should reject invalid APP_ENV values', () => {
    expect(() => {
      envSchema.parse({
        NODE_ENV: 'development',
        APP_ENV: 'staging',
        MONGODB_URI: 'mongodb://localhost:27017/crm',
        SESSION_SECRET: 'a'.repeat(32),
      });
    }).toThrow();
  });

  it('should reject invalid NODE_ENV values', () => {
    expect(() => {
      envSchema.parse({
        NODE_ENV: 'staging',
        MONGODB_URI: 'mongodb://localhost:27017/crm',
        SESSION_SECRET: 'a'.repeat(32),
      });
    }).toThrow();
  });

  it('should reject invalid MONGODB_URI', () => {
    expect(() => {
      envSchema.parse({
        NODE_ENV: 'development',
        MONGODB_URI: 'not-a-valid-url',
        SESSION_SECRET: 'a'.repeat(32),
      });
    }).toThrow();
  });

  it('should reject SESSION_SECRET shorter than 32 characters', () => {
    expect(() => {
      envSchema.parse({
        NODE_ENV: 'development',
        MONGODB_URI: 'mongodb://localhost:27017/crm',
        SESSION_SECRET: 'short',
      });
    }).toThrow();
  });

  it('should accept SESSION_SECRET with exactly 32 characters', () => {
    const result = envSchema.parse({
      NODE_ENV: 'development',
      MONGODB_URI: 'mongodb://localhost:27017/crm',
      SESSION_SECRET: 'a'.repeat(32),
    });
    expect(result.SESSION_SECRET).toBe('a'.repeat(32));
  });

  it('should default PORT to 3000', () => {
    const result = envSchema.parse({
      NODE_ENV: 'development',
      MONGODB_URI: 'mongodb://localhost:27017/crm',
      SESSION_SECRET: 'a'.repeat(32),
    });
    expect(result.PORT).toBe(3000);
  });

  it('should accept custom PORT', () => {
    const result = envSchema.parse({
      NODE_ENV: 'development',
      PORT: '4000',
      MONGODB_URI: 'mongodb://localhost:27017/crm',
      SESSION_SECRET: 'a'.repeat(32),
    });
    expect(result.PORT).toBe(4000);
  });

  it('should default MONGODB_DATABASE to crm', () => {
    const result = envSchema.parse({
      NODE_ENV: 'development',
      MONGODB_URI: 'mongodb://localhost:27017/crm',
      SESSION_SECRET: 'a'.repeat(32),
    });
    expect(result.MONGODB_DATABASE).toBe('crm');
  });

  it('should accept custom MONGODB_DATABASE', () => {
    const result = envSchema.parse({
      NODE_ENV: 'development',
      MONGODB_URI: 'mongodb://localhost:27017/crm',
      MONGODB_DATABASE: 'myapp',
      SESSION_SECRET: 'a'.repeat(32),
    });
    expect(result.MONGODB_DATABASE).toBe('myapp');
  });
});
