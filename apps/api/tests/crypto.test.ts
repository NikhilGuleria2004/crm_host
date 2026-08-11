import { describe, it, expect } from 'vitest';
import { hashPassword, comparePasswords, generateSessionToken, hashToken } from '../src/utils/crypto';
import bcrypt from 'bcrypt';

describe('P7 Crypto Utils', () => {
  it('should hash and verify a password with Argon2', async () => {
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    expect(hash.startsWith('$argon2')).toBe(true);
    expect(await comparePasswords(password, hash)).toBe(true);
    expect(await comparePasswords('wrong', hash)).toBe(false);
  });

  it('should verify a bcrypt hash', async () => {
    const password = 'TestPassword123!';
    const bcryptHash = await bcrypt.hash(password, 10);
    expect(bcryptHash.startsWith('$2b$')).toBe(true);
    expect(await comparePasswords(password, bcryptHash)).toBe(true);
    expect(await comparePasswords('wrong', bcryptHash)).toBe(false);
  });

  it('should generate a unique session token', () => {
    const token1 = generateSessionToken();
    const token2 = generateSessionToken();
    expect(token1).toHaveLength(64);
    expect(token2).toHaveLength(64);
    expect(token1).not.toBe(token2);
  });

  it('should hash a token consistently', () => {
    const token = 'my-secret-token';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(token);
  });
});
