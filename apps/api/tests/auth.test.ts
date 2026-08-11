import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../src/modules/auth/auth.schema';

describe('P8 Auth Schemas', () => {
  it('should validate register input', () => {
    const valid = registerSchema.parse({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    });
    expect(valid.email).toBe('test@example.com');
    expect(valid.password).toBe('password123');
  });

  it('should reject short password in register', () => {
    expect(() => registerSchema.parse({
      email: 'test@example.com',
      password: 'short',
      firstName: 'Test',
      lastName: 'User',
    })).toThrow();
  });

  it('should validate login input', () => {
    const valid = loginSchema.parse({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(valid.email).toBe('test@example.com');
  });

  it('should validate forgot-password input', () => {
    const valid = forgotPasswordSchema.parse({
      email: 'test@example.com',
    });
    expect(valid.email).toBe('test@example.com');
  });

  it('should validate reset-password input', () => {
    const valid = resetPasswordSchema.parse({
      token: 'abc123',
      password: 'newpassword123',
    });
    expect(valid.token).toBe('abc123');
    expect(valid.password).toBe('newpassword123');
  });
});
