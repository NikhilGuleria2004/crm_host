import pino from 'pino';
import { env } from '../config/env';

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
  'user.password',
];

export const logger = pino({
  level: env.APP_ENV === 'production' ? 'info' : 'debug',
  redact: REDACTED_FIELDS,
  transport: env.APP_ENV === 'local'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
    : undefined,
});
