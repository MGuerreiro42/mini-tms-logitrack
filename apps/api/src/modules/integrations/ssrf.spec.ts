import type { LookupAddress } from 'node:dns';
import {
  assertPublicHttpsUrl,
  isPublicAddress,
  publicOnlyLookup,
  UnsafeWebhookUrlError,
} from './ssrf';

describe('isPublicAddress', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '192.168.0.10',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '::1',
    '::',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '::ffff:169.254.169.254',
    '::127.0.0.1',
    '::ffff:0:7f00:1',
    '64:ff9b:1::7f00:1',
    '2002:7f00:1::',
    'fec0::1',
  ])('rejects %s', (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '::ffff:8.8.8.8'])(
    'accepts %s',
    (address) => {
      expect(isPublicAddress(address)).toBe(true);
    },
  );

  it('rejects what is not an address', () => {
    expect(isPublicAddress('example.com')).toBe(false);
  });
});

describe('assertPublicHttpsUrl', () => {
  it.each([
    ['plain http', 'http://8.8.8.8/hook'],
    ['a malformed URL', 'not a url'],
    ['a loopback literal', 'https://127.0.0.1/hook'],
    ['an IPv6 loopback literal', 'https://[::1]/hook'],
    ['cloud metadata', 'https://169.254.169.254/latest/meta-data'],
    ['a name resolving to loopback', 'https://localhost:3333/hook'],
    ['an unresolvable name', 'https://does-not-exist.invalid/hook'],
  ])('rejects %s', async (_, url) => {
    await expect(assertPublicHttpsUrl(url)).rejects.toBeInstanceOf(
      UnsafeWebhookUrlError,
    );
  });

  it('accepts a public https address', async () => {
    await expect(
      assertPublicHttpsUrl('https://8.8.8.8/hook'),
    ).resolves.toBeUndefined();
  });
});

describe('publicOnlyLookup', () => {
  const lookupOf = (hostname: string) =>
    new Promise<LookupAddress[]>((resolve, reject) => {
      publicOnlyLookup(hostname, { all: true }, (error, addresses) =>
        error ? reject(error) : resolve(addresses as LookupAddress[]),
      );
    });

  it('refuses a name resolving to a non-public address at connect time', async () => {
    await expect(lookupOf('localhost')).rejects.toBeInstanceOf(
      UnsafeWebhookUrlError,
    );
  });

  it('passes the resolved public addresses through', async () => {
    await expect(lookupOf('8.8.8.8')).resolves.toEqual([
      { address: '8.8.8.8', family: 4 },
    ]);
  });
});
