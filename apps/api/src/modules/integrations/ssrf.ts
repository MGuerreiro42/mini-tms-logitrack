import { lookup as dnsLookup } from 'node:dns';
import { lookup } from 'node:dns/promises';
import { BlockList, isIP, type LookupFunction } from 'node:net';

// Loopback, private, link-local (cloud metadata), CGNAT, multicast and reserved ranges, plus the IPv6
// prefixes that embed an IPv4 address (IPv4-compatible and -translated, NAT64, Teredo, 6to4).
// IPv4 rules also match IPv4-mapped IPv6 addresses such as ::ffff:127.0.0.1.
const NON_PUBLIC: [string, number, 'ipv4' | 'ipv6'][] = [
  ['0.0.0.0', 8, 'ipv4'],
  ['10.0.0.0', 8, 'ipv4'],
  ['100.64.0.0', 10, 'ipv4'],
  ['127.0.0.0', 8, 'ipv4'],
  ['169.254.0.0', 16, 'ipv4'],
  ['172.16.0.0', 12, 'ipv4'],
  ['192.0.0.0', 24, 'ipv4'],
  ['192.168.0.0', 16, 'ipv4'],
  ['198.18.0.0', 15, 'ipv4'],
  ['224.0.0.0', 3, 'ipv4'],
  ['::', 96, 'ipv6'],
  ['::ffff:0:0:0', 96, 'ipv6'],
  ['64:ff9b::', 96, 'ipv6'],
  ['64:ff9b:1::', 48, 'ipv6'],
  ['2001::', 32, 'ipv6'],
  ['2002::', 16, 'ipv6'],
  ['fc00::', 7, 'ipv6'],
  ['fe80::', 10, 'ipv6'],
  ['fec0::', 10, 'ipv6'],
  ['ff00::', 8, 'ipv6'],
];

const nonPublic = new BlockList();
for (const [network, prefix, family] of NON_PUBLIC) {
  nonPublic.addSubnet(network, prefix, family);
}

export class UnsafeWebhookUrlError extends Error {}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  return (
    family !== 0 && !nonPublic.check(address, family === 6 ? 'ipv6' : 'ipv4')
  );
}

// Connection-time check, for http.request's lookup option: the address connected to is the one checked,
// so a name that resolves to a public address first and a private one later (DNS rebinding) is refused.
export const publicOnlyLookup: LookupFunction = (
  hostname,
  options,
  callback,
) => {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (!error && addresses.some(({ address }) => !isPublicAddress(address))) {
      error = new UnsafeWebhookUrlError(
        `${hostname} must resolve to a public address`,
      );
    }
    if (error) return callback(error, '', 0);
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
};

// Run on save and before every attempt: IP literals never reach a lookup, so publicOnlyLookup alone misses them.
export async function assertPublicHttpsUrl(raw: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeWebhookUrlError('The URL is not valid');
  }
  if (url.protocol !== 'https:') {
    throw new UnsafeWebhookUrlError('The URL must use https');
  }

  const host = url.hostname.replace(/^\[(.*)\]$/, '$1');
  const addresses = await lookup(host, { all: true, verbatim: true }).catch(
    () => {
      throw new UnsafeWebhookUrlError(`${host} could not be resolved`);
    },
  );
  if (addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new UnsafeWebhookUrlError(`${host} must resolve to a public address`);
  }
}
