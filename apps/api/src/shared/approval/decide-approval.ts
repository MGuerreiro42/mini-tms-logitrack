import { ConflictException } from '@nestjs/common';
import type { ApprovalStatus } from '../../../generated/prisma/client';

// `decide` must be an updateMany conditional on PENDING: of two concurrent decisions only one matches.
export async function decideApproval<T extends { status: ApprovalStatus }>(
  label: string,
  decide: () => Promise<{ count: number }>,
  reload: () => Promise<T>,
): Promise<T> {
  const { count } = await decide();
  const entity = await reload();
  if (count === 0) {
    throw new ConflictException(
      `${label} is already ${entity.status.toLowerCase()}`,
    );
  }
  return entity;
}
