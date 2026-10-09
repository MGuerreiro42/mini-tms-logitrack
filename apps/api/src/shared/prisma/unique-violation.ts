import { Prisma } from '../../../generated/prisma/client';

interface UniqueViolationMeta {
  target?: string[];
  driverAdapterError?: { cause?: { constraint?: { fields?: string[] } } };
}

// Prisma 7 driver adapters report P2002 fields under driverAdapterError, not meta.target.
export function uniqueViolationTarget(error: unknown): string | null {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002'
  ) {
    return null;
  }
  const meta = error.meta as UniqueViolationMeta | undefined;
  return (
    meta?.target?.join(', ') ??
    meta?.driverAdapterError?.cause?.constraint?.fields?.join(', ') ??
    'unknown'
  );
}
