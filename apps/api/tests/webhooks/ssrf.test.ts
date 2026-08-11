import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isPrivateIpv4, isPrivateIpv6, validateWebhookUrl } from '../../src/utils/ssrf';
import { promises as dnsPromises } from 'node:dns';

describe('P11 SSRF Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isPrivateIpv4', () => {
    it('should block 10.0.0.0/8', () => {
      expect(isPrivateIpv4('10.0.0.1')).toBe(true);
      expect(isPrivateIpv4('10.255.255.254')).toBe(true);
    });

    it('should block 172.16.0.0/12', () => {
      expect(isPrivateIpv4('172.16.0.1')).toBe(true);
      expect(isPrivateIpv4('172.31.255.254')).toBe(true);
    });

    it('should block 192.168.0.0/16', () => {
      expect(isPrivateIpv4('192.168.1.1')).toBe(true);
      expect(isPrivateIpv4('192.168.255.254')).toBe(true);
    });

    it('should block 127.0.0.0/8', () => {
      expect(isPrivateIpv4('127.0.0.1')).toBe(true);
    });

    it('should block 169.254.0.0/16', () => {
      expect(isPrivateIpv4('169.254.169.254')).toBe(true);
    });

    it('should block 0.0.0.0/8', () => {
      expect(isPrivateIpv4('0.0.0.0')).toBe(true);
    });

    it('should allow public IPs', () => {
      expect(isPrivateIpv4('8.8.8.8')).toBe(false);
      expect(isPrivateIpv4('93.184.216.34')).toBe(false);
      expect(isPrivateIpv4('1.1.1.1')).toBe(false);
    });

    it('should reject invalid IPs', () => {
      expect(isPrivateIpv4('not-an-ip')).toBe(false);
      expect(isPrivateIpv4('256.256.256.256')).toBe(false);
    });
  });

  describe('isPrivateIpv6', () => {
    it('should block localhost ::1', () => {
      expect(isPrivateIpv6('::1')).toBe(true);
    });

    it('should block unique local fc00::/7', () => {
      expect(isPrivateIpv6('fc00::1')).toBe(true);
      expect(isPrivateIpv6('fd00::1')).toBe(true);
    });

    it('should block link-local fe80::/10', () => {
      expect(isPrivateIpv6('fe80::1')).toBe(true);
    });

    it('should allow global unicast', () => {
      expect(isPrivateIpv6('2001:db8::1')).toBe(false);
    });
  });

  describe('validateWebhookUrl', () => {
    it('should allow public HTTPS URLs', async () => {
      vi.spyOn(dnsPromises, 'resolve4').mockResolvedValueOnce(['93.184.216.34']);
      vi.spyOn(dnsPromises, 'resolve6').mockResolvedValueOnce([]);

      await expect(validateWebhookUrl('https://example.com/webhook')).resolves.toBeUndefined();
    });

    it('should block localhost by hostname', async () => {
      await expect(validateWebhookUrl('https://localhost/webhook')).rejects.toThrow('blocked host');
    });

    it('should block 127.0.0.1 by hostname', async () => {
      await expect(validateWebhookUrl('https://127.0.0.1/webhook')).rejects.toThrow('blocked host');
    });

    it('should block private IPs when resolved', async () => {
      vi.spyOn(dnsPromises, 'resolve4').mockResolvedValueOnce(['10.0.0.1']);
      await expect(validateWebhookUrl('https://internal.service/webhook')).rejects.toThrow('private IPv4');
    });

    it('should block cloud metadata when resolved', async () => {
      vi.spyOn(dnsPromises, 'resolve4').mockResolvedValueOnce(['169.254.169.254']);
      await expect(validateWebhookUrl('https://metadata.internal/webhook')).rejects.toThrow('private IPv4');
    });

    it('should block non-HTTPS protocols', async () => {
      await expect(validateWebhookUrl('http://example.com/webhook')).rejects.toThrow('HTTPS');
      await expect(validateWebhookUrl('ftp://example.com/webhook')).rejects.toThrow('HTTPS');
    });

    it('should block private IPv6 addresses (unit test)', () => {
      expect(isPrivateIpv6('fe80::1')).toBe(true);
      expect(isPrivateIpv6('::1')).toBe(true);
      expect(isPrivateIpv6('fc00::1')).toBe(true);
    });
  });
});
