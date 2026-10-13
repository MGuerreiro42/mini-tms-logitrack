import { headers } from 'next/headers';

const FORWARDED_FOR = 'x-forwarded-for';

// Rightmost entry only: it is the one appended by our own edge, the rest is whatever the client claimed.
export async function visitorAddressHeaders(): Promise<Record<string, string>> {
  const address = (await headers())
    .get(FORWARDED_FOR)
    ?.split(',')
    .at(-1)
    ?.trim();

  return address ? { [FORWARDED_FOR]: address } : {};
}
