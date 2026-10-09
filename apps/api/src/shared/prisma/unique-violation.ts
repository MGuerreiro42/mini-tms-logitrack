import { Prisma } from '../../../generated/prisma/client';

interface UniqueViolationMeta {
  target?: string[];
  driverAdapterError?: { cause?: { constraint?: { fields?: string[] } } };
}

// Returns the violated field(s) of a P2002, or null for any other error. Prisma 7 adapters report them under driverAdapterError.
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
