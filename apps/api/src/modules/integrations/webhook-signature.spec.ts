import {
  generateWebhookSecret,
  signWebhook,
  verifyWebhook,
} from './webhook-signature';

// Known-answer vector from the official Standard Webhooks JavaScript library tests.
const VECTOR = {
  secret: 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw', // gitleaks:allow, public test vector
  id: 'msg_p5jXN8AQM9LWM0D4loKWxJek',
  timestamp: 1614265330,
  body: '{"test": 2432232314}',
  signature: 'v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=',
};

describe('webhook signature', () => {
  it('matches the Standard Webhooks reference signature', () => {
    expect(
      signWebhook(VECTOR.secret, VECTOR.id, VECTOR.timestamp, VECTOR.body),
    ).toEqual({
      'webhook-id': VECTOR.id,
      'webhook-timestamp': String(VECTOR.timestamp),
      'webhook-signature': VECTOR.signature,
    });
  });

  it('verifies its own signature and rejects a tampered body', () => {
    const secret = generateWebhookSecret();
    const headers = signWebhook(secret, 'msg_1', 1_000, '{"a":1}');

    expect(verifyWebhook(secret, { ...headers }, '{"a":1}', 1_000)).toBe(true);
    expect(verifyWebhook(secret, { ...headers }, '{"a":2}', 1_000)).toBe(false);
    expect(
      verifyWebhook(generateWebhookSecret(), { ...headers }, '{"a":1}', 1_000),
    ).toBe(false);
  });

  it('rejects a timestamp outside the five-minute tolerance', () => {
    const secret = generateWebhookSecret();
    const headers = signWebhook(secret, 'msg_1', 1_000, '{}');

    expect(verifyWebhook(secret, { ...headers }, '{}', 1_000 + 300)).toBe(true);
    expect(verifyWebhook(secret, { ...headers }, '{}', 1_000 + 301)).toBe(
      false,
    );
  });

  it('accepts any matching signature of a space-delimited list', () => {
    const secret = generateWebhookSecret();
    const headers = signWebhook(secret, 'msg_1', 1_000, '{}');
    const rotated = `v1,${Buffer.alloc(32).toString('base64')} ${headers['webhook-signature']}`;

    expect(
      verifyWebhook(
        secret,
        { ...headers, 'webhook-signature': rotated },
        '{}',
        1_000,
      ),
    ).toBe(true);
  });

  it('rejects a timestamp that is not plain digits, and an empty id', () => {
    const secret = generateWebhookSecret();
    const headers = signWebhook(secret, 'msg_1', 1_000, '{}');

    expect(
      verifyWebhook(
        secret,
        { ...headers, 'webhook-timestamp': '1e3' },
        '{}',
        1_000,
      ),
    ).toBe(false);
    expect(
      verifyWebhook(secret, { ...headers, 'webhook-id': '' }, '{}', 1_000),
    ).toBe(false);
  });

  it('verifies raw bytes exactly as signed', () => {
    const secret = generateWebhookSecret();
    const headers = signWebhook(secret, 'msg_1', 1_000, '{"a":"é"}');

    expect(
      verifyWebhook(secret, { ...headers }, Buffer.from('{"a":"é"}'), 1_000),
    ).toBe(true);
  });

  it('rejects missing headers and unknown versions', () => {
    const secret = generateWebhookSecret();
    const headers = signWebhook(secret, 'msg_1', 1_000, '{}');

    expect(verifyWebhook(secret, {}, '{}', 1_000)).toBe(false);
    expect(
      verifyWebhook(
        secret,
        {
          ...headers,
          'webhook-signature': headers['webhook-signature'].replace(
            'v1,',
            'v2,',
          ),
        },
        '{}',
        1_000,
      ),
    ).toBe(false);
  });
});
