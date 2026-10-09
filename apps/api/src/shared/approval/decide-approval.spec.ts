import { ConflictException } from '@nestjs/common';
import { decideApproval } from './decide-approval';

describe('decideApproval', () => {
  it('returns the reloaded entity when the conditional write matched', async () => {
    const result = await decideApproval(
      'Seller',
      async () => ({ count: 1 }),
      async () => ({ id: 's1', status: 'APPROVED' as const }),
    );

    expect(result).toEqual({ id: 's1', status: 'APPROVED' });
  });

  it('throws a 409 naming the current status when nothing matched', async () => {
    await expect(
      decideApproval(
        'Carrier',
        async () => ({ count: 0 }),
        async () => ({ status: 'REJECTED' as const }),
      ),
    ).rejects.toThrow(new ConflictException('Carrier is already rejected'));
  });

  it('lets the reload not-found error win over the conflict', async () => {
    const notFound = new Error('not found');

    await expect(
      decideApproval(
        'Seller',
        async () => ({ count: 0 }),
        async () => {
          throw notFound;
        },
      ),
    ).rejects.toBe(notFound);
  });
});
