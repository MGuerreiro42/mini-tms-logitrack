import { headers } from 'next/headers';
import { visitorAddressHeaders } from './visitor-address';

vi.mock('next/headers', () => ({ headers: vi.fn() }));

function incoming(forwardedFor?: string) {
  vi.mocked(headers).mockResolvedValue(
    new Headers(
      forwardedFor === undefined ? {} : { 'x-forwarded-for': forwardedFor },
    ) as never,
  );
}

describe('visitorAddressHeaders', () => {
  it('forwards a single address as is', async () => {
    incoming('203.0.113.7');

    expect(await visitorAddressHeaders()).toEqual({
      'x-forwarded-for': '203.0.113.7',
    });
  });

  it('forwards only the rightmost entry of a chain', async () => {
    incoming('10.0.0.1, 198.51.100.4 , 203.0.113.7');

    expect(await visitorAddressHeaders()).toEqual({
      'x-forwarded-for': '203.0.113.7',
    });
  });

  it.each([
    undefined,
    '',
    ' , ',
  ])('sends nothing when the request carries %j', async (value) => {
    incoming(value);

    expect(await visitorAddressHeaders()).toEqual({});
  });
});
