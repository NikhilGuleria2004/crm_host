import { promises as dnsPromises } from 'node:dns';

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '169.254.169.254',
  '100.100.100.200',
]);

const PRIVATE_RANGES: Array<{ start: number; end: number }> = [
  ipRangeToNumber('0.0.0.0', '0.255.255.255'),
  ipRangeToNumber('10.0.0.0', '10.255.255.255'),
  ipRangeToNumber('127.0.0.0', '127.255.255.255'),
  ipRangeToNumber('169.254.0.0', '169.254.255.255'),
  ipRangeToNumber('172.16.0.0', '172.31.255.255'),
  ipRangeToNumber('192.168.0.0', '192.168.255.255'),
];

function ipRangeToNumber(start: string, end: string): { start: number; end: number } {
  const s = start.split('.').map(Number);
  const e = end.split('.').map(Number);
  const toNum = (parts: number[]) => (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
  return { start: toNum(s), end: toNum(e) };
}

export function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const numeric = (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
  return PRIVATE_RANGES.some((range) => numeric >= range.start && numeric <= range.end);
}

export function isPrivateIpv6(ip: string): boolean {
  return ip.startsWith('::') || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe');
}

export async function validateWebhookUrl(urlString: string): Promise<void> {
  const url = new URL(urlString);

  if (url.protocol !== 'https:') {
    throw new Error('Webhook URL must use HTTPS');
  }

  const hostname = url.hostname;
  if (BLOCKED_HOSTS.has(hostname)) {
    throw new Error(`Webhook URL points to blocked host: ${hostname}`);
  }

  const addresses = await dnsPromises.resolve4(hostname);
  for (const addr of addresses) {
    if (isPrivateIpv4(addr)) {
      throw new Error(`Webhook URL resolves to private IPv4 address: ${addr}`);
    }
  }

  try {
    const addresses6 = await dnsPromises.resolve6(hostname);
    for (const addr of addresses6) {
      if (isPrivateIpv6(addr)) {
        throw new Error(`Webhook URL resolves to private IPv6 address: ${addr}`);
      }
    }
  } catch {
    // IPv6 not available; continue.
  }
}
