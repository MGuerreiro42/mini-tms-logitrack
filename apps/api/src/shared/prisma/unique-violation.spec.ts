import { Prisma } from '../../../generated/prisma/client';
import { uniqueViolationTarget } from './unique-violation';

const knownError = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError('boom', {
    code,
    clientVersion: 'test',
    meta,
  });

describe('uniqueViolationTarget', () => {
  it('reads the fields from the driver adapter error shape', () => {
    const error = knownError('P2002', {
      driverAdapterError: { cause: { constraint: { fields: ['email'] } } },
    });

    expect(uniqueViolationTarget(error)).toBe('email');
  });

  it('falls back to meta.target, then to "unknown"', () => {
    expect(
      uniqueViolationTarget(knownError('P2002', { target: ['document'] })),
    ).toBe('document');
    expect(uniqueViolationTarget(knownError('P2002'))).toBe('unknown');
  });

  it('returns null for anything that is not a unique violation', () => {
    expect(uniqueViolationTarget(knownError('P2025'))).toBeNull();
    expect(uniqueViolationTarget(new Error('boom'))).toBeNull();
  });
});
