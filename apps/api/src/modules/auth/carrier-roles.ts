import { GlobalRole } from '../../../generated/prisma/client';

export const CARRIER_ROLES = [
  GlobalRole.CARRIER_MANAGER,
  GlobalRole.CARRIER_OPERATOR,
] as const;

export const isCarrierRole = (role: GlobalRole): boolean =>
  (CARRIER_ROLES as readonly GlobalRole[]).includes(role);
