import net from 'node:net';

const normalizeIp = value => {
  if (!value) {
    return null;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.startsWith('::ffff:') ? trimmed.slice(7) : trimmed;
};

const ipv4ToInt = ip =>
  normalizeIp(ip)
    .split('.')
    .reduce((acc, octet) => (acc << 8n) + BigInt(Number(octet)), 0n);

const expandIpv6 = ip => {
  const normalized = normalizeIp(ip).toLowerCase();
  const [left = '', right = ''] = normalized.split('::');
  const leftParts = left ? left.split(':').filter(Boolean) : [];
  const rightParts = right ? right.split(':').filter(Boolean) : [];
  const missing = 8 - (leftParts.length + rightParts.length);
  const parts = [
    ...leftParts,
    ...Array.from({ length: Math.max(0, missing) }, () => '0'),
    ...rightParts,
  ].map(part => part || '0');

  return parts
    .map(part => part.padStart(4, '0'))
    .join('')
    .match(/.{1,4}/g)
    .map(segment => segment.padStart(4, '0'));
};

const ipv6ToBigInt = ip =>
  expandIpv6(ip).reduce((acc, segment) => (acc << 16n) + BigInt(`0x${segment}`), 0n);

const getIpVersion = ip => net.isIP(normalizeIp(ip) || '') || 0;

const parseCidr = cidr => {
  const [ip, prefixRaw] = String(cidr).trim().split('/');
  const version = getIpVersion(ip);
  const prefix = Number(prefixRaw);

  if (version === 4) {
    const resolvedPrefix = Number.isFinite(prefix) ? prefix : 32;
    const mask = resolvedPrefix === 0 ? 0n : ((1n << 32n) - 1n) << (32n - BigInt(resolvedPrefix));
    const base = ipv4ToInt(ip) & mask;
    return { version, base, mask, prefix: resolvedPrefix };
  }

  if (version === 6) {
    const resolvedPrefix = Number.isFinite(prefix) ? prefix : 128;
    const mask =
      resolvedPrefix === 0
        ? 0n
        : ((1n << 128n) - 1n) << (128n - BigInt(resolvedPrefix));
    const base = ipv6ToBigInt(ip) & mask;
    return { version, base, mask, prefix: resolvedPrefix };
  }

  return null;
};

export const isIpAllowed = (ip, allowlist = []) => {
  const normalizedIp = normalizeIp(ip);
  if (!normalizedIp) {
    return false;
  }

  if (!Array.isArray(allowlist) || allowlist.length === 0) {
    return true;
  }

  const ipVersion = getIpVersion(normalizedIp);
  if (ipVersion === 4) {
    const target = ipv4ToInt(normalizedIp);
    return allowlist.some(entry => {
      const value = String(entry).trim();
      if (!value) {
        return false;
      }

      if (!value.includes('/')) {
        return normalizeIp(value) === normalizedIp;
      }

      const cidr = parseCidr(value);
      if (!cidr || cidr.version !== 4) {
        return false;
      }

      return (target & cidr.mask) === cidr.base;
    });
  }

  if (ipVersion === 6) {
    const target = ipv6ToBigInt(normalizedIp);
    return allowlist.some(entry => {
      const value = String(entry).trim();
      if (!value) {
        return false;
      }

      if (!value.includes('/')) {
        return normalizeIp(value) === normalizedIp;
      }

      const cidr = parseCidr(value);
      if (!cidr || cidr.version !== 6) {
        return false;
      }

      return (target & cidr.mask) === cidr.base;
    });
  }

  return false;
};

