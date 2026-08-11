import { z } from 'zod';
import { AuthService } from './auth.service';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from './auth.schema';
import type { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput, ChangePasswordInput } from './auth.types';
import { SESSION } from '@crm/shared';
import { env } from '../../config/env';
import { auditLog } from '../../middleware/audit';

const toRegisterInput = (body: unknown): RegisterInput => {
  return registerSchema.parse(body);
};

const toLoginInput = (body: unknown): LoginInput => {
  return loginSchema.parse(body);
};

const toForgotPasswordInput = (body: unknown): ForgotPasswordInput => {
  return forgotPasswordSchema.parse(body);
};

const toResetPasswordInput = (body: unknown): ResetPasswordInput => {
  return resetPasswordSchema.parse(body);
};

const toChangePasswordInput = (body: unknown): ChangePasswordInput => {
  return changePasswordSchema.parse(body);
};

function serializeCookie(name: string, value: string, options: Record<string, unknown>): string {
  let cookie = `${name}=${encodeURIComponent(value)}`;
  if (options.path) cookie += `; Path=${options.path}`;
  if (options.maxAge !== undefined) cookie += `; Max-Age=${options.maxAge}`;
  if (options.httpOnly) cookie += '; HttpOnly';
  if (options.secure) cookie += '; Secure';
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  return cookie;
}

function getCookieOptions() {
  const isProduction = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  };
}

function setSessionCookie(c: any, sessionId: string) {
  const cookie = serializeCookie(SESSION.COOKIE_NAME, sessionId, getCookieOptions());
  c.res.headers.set('Set-Cookie', cookie);
}

function clearSessionCookie(c: any) {
  const cookie = serializeCookie(SESSION.COOKIE_NAME, '', { ...getCookieOptions(), maxAge: 0 });
  c.res.headers.set('Set-Cookie', cookie);
}

export function createAuthController(service: AuthService) {
  return {
    async register(c: any) {
      try {
        const input = toRegisterInput(await c.req.json());
        const result = await service.register(input);
        setSessionCookie(c, result.sessionId);
        return c.json({ data: result.authResponse }, 201);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && error.message === 'User with this email already exists') {
          return c.json(
            { error: { code: 'DUPLICATE_RESOURCE', message: error.message } },
            409
          );
        }
        throw error;
      }
    },

    async login(c: any) {
      try {
        const input = toLoginInput(await c.req.json());
        const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || undefined;
        const userAgent = c.req.header('user-agent') || undefined;
        const result = await service.login(input, ipAddress, userAgent);
        setSessionCookie(c, result.sessionId);
        await auditLog(c, {
          action: 'user.login',
          entityType: 'user',
          entityId: result.authResponse.user.id,
          metadata: { email: result.authResponse.user.email },
        });
        return c.json({ data: result.authResponse });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && (error.message === 'Invalid credentials' || error.message === 'Account is not active')) {
          await auditLog(c, {
            action: 'user.login.failed',
            metadata: { reason: error.message },
          });
          return c.json(
            { error: { code: 'INVALID_CREDENTIALS', message: error.message } },
            401
          );
        }
        throw error;
      }
    },

    async logout(c: any) {
      const cookieHeader = c.req.header('Cookie') || '';
      const cookies: Record<string, string> = {};
      for (const pair of cookieHeader.split(';')) {
        const [name, value] = pair.trim().split('=');
        if (name && value !== undefined) {
          cookies[name] = decodeURIComponent(value);
        }
      }
      const sessionId = cookies[SESSION.COOKIE_NAME];
      if (sessionId) {
        await service.logout(sessionId);
      }
      clearSessionCookie(c);
      await auditLog(c, {
        action: 'user.logout',
      });
      return c.json(null, 204);
    },

    async me(c: any) {
      const userId = c.get('user')?.id;
      const organizationId = c.get('organizationId');
      if (!userId || !organizationId) {
        return c.json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' } }, 401);
      }
      const authResponse = await service.me(userId, organizationId);
      return c.json({ data: authResponse });
    },

    async forgotPassword(c: any) {
      try {
        const input = toForgotPasswordInput(await c.req.json());
        await service.forgotPassword(input);
        return c.json({ data: { success: true } });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        throw error;
      }
    },

    async resetPassword(c: any) {
      try {
        const input = toResetPasswordInput(await c.req.json());
        await service.resetPassword(input);
        return c.json({ data: { success: true } });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && error.message === 'Invalid or expired reset token') {
          return c.json(
            { error: { code: 'INVALID_CREDENTIALS', message: error.message } },
            400
          );
        }
        throw error;
      }
    },

    async changePassword(c: any) {
      try {
        const userId = c.get('user')?.id;
        if (!userId) {
          return c.json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' } }, 401);
        }
        const input = toChangePasswordInput(await c.req.json());
        await service.changePassword(userId, input);
        await auditLog(c, {
          action: 'auth.password_changed',
          entityType: 'user',
          entityId: userId,
        });
        return c.json({ data: { success: true } });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && error.message === 'Current password is incorrect') {
          return c.json(
            { error: { code: 'INVALID_CREDENTIALS', message: error.message } },
            400
          );
        }
        throw error;
      }
    },
  };
}
