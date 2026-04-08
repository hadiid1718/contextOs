import { isIP } from 'node:net';

const IPV6_BITS = 128;

const parseIPv4ToInt = ip => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => Number.isNaN(part))) {
    return null;
  }

  let value = 0;
  for (const part of parts) {
    value = (value << 8) + part;
  }

  return value >>> 0;
};

const expandIPv6 = ip => {
  if (!ip.includes('::')) {
    return ip.split(':');
  }

  const [left, right] = ip.split('::');
  const leftParts = left ? left.split(':') : [];
  const rightParts = right ? right.split(':') : [];
  const missing = 8 - (leftParts.length + rightParts.length);

  return [...leftParts, ...Array(missing).fill('0'), ...rightParts];
};

const parseIPv6ToBigInt = ip => {
  const normalized = ip.includes('.')
    ? ip.replace(/::ffff:/i, '').split('.')
    : null;

  if (normalized) {
    const ipv4Int = parseIPv4ToInt(normalized.join('.'));
    if (ipv4Int === null) {
      return null;
    }
    return BigInt(ipv4Int);
  }

  const parts = expandIPv6(ip);
  if (parts.length !== 8) {
    return null;
  }

  return parts.reduce((acc, part) => {
    const value = parseInt(part || '0', 16);
    if (Number.isNaN(value)) {
      return null;
    }
    return (acc << 16n) + BigInt(value);
  }, 0n);
};

const ipv4Mask = prefix => (prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0));

const matchesIPv4Cidr = (ip, cidr) => {
  const [range, prefixText] = cidr.split('/');
  const prefix = Number(prefixText);

  const ipValue = parseIPv4ToInt(ip);
  const rangeValue = parseIPv4ToInt(range);

  if (ipValue === null || rangeValue === null || Number.isNaN(prefix)) {
    return false;
  }

  const mask = ipv4Mask(prefix);
  return (ipValue & mask) === (rangeValue & mask);
};

const ipv6Mask = prefix => {
  if (prefix === 0) {
    return 0n;
  }
  return ((1n << BigInt(prefix)) - 1n) << BigInt(IPV6_BITS - prefix);
};

const matchesIPv6Cidr = (ip, cidr) => {
  const [range, prefixText] = cidr.split('/');
  const prefix = Number(prefixText);

  const ipValue = parseIPv6ToBigInt(ip);
  const rangeValue = parseIPv6ToBigInt(range);

  if (ipValue === null || rangeValue === null || Number.isNaN(prefix)) {
    return false;
  }

  const mask = ipv6Mask(prefix);
  return (ipValue & mask) === (rangeValue & mask);
};

export const isIpInAllowlist = (ip, allowlist) => {
  if (!allowlist || allowlist.length === 0) {
    return false;
  }

  const ipVersion = isIP(ip);
  if (!ipVersion) {
    return false;
  }

  return allowlist.some(entry => {
    const trimmed = entry.trim();
    if (!trimmed) {
      return false;
    }

    if (!trimmed.includes('/')) {
      return trimmed === ip;
    }

    if (ipVersion === 4) {
      return matchesIPv4Cidr(ip, trimmed);
    }

    return matchesIPv6Cidr(ip, trimmed);
  });
};

export const extractClientIp = req => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  return req.socket?.remoteAddress || '';
};

