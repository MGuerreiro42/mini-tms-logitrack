import { Injectable, Logger } from '@nestjs/common';
import { CarrierRole, type Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  DEMO_CARRIER_MEMBERS,
  DEMO_EMAILS,
  DEMO_EXTRA_CARRIERS,
  DEMO_MODALITY_CODES,
  DEMO_SELLERS,
  type DemoTenant,
} from './demo-dataset';

export interface LoadedDemoTenant extends DemoTenant {
  // Every demo carrier, with the users the simulator claims its shipments as.
  claimUserIds: Record<string, string[]>;
}

const isComplete = <T>(items: (T | null | undefined)[]): items is T[] =>
  items.every((item) => item != null);

export const demoShipmentsWhere = (
  tenant: LoadedDemoTenant,
): Prisma.ShipmentWhereInput => ({
  sellerId: { in: [...tenant.sellerIds] },
  carrierId: { in: Object.keys(tenant.claimUserIds) },
});

const byMemberEmail = (ids: string[]) =>
  Object.fromEntries(
    DEMO_CARRIER_MEMBERS.map(({ email }, index) => [email, ids[index]]),
  ) as DemoTenant['carrierUserIds'];

@Injectable()
export class DemoTenantService {
  private readonly logger = new Logger(DemoTenantService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Null when the seed ran without SEED_DEMO: the simulator never creates demo accounts itself.
  async load(): Promise<LoadedDemoTenant | null> {
    const [users, modalities] = await Promise.all([
      this.prisma.user.findMany({
        where: { email: { in: DEMO_EMAILS } },
        include: { seller: true, carrierUser: true },
      }),
      this.prisma.deliveryModality.findMany({
        where: { code: { in: [...DEMO_MODALITY_CODES] } },
      }),
    ]);
    const userByEmail = new Map(users.map((user) => [user.email, user]));
    const modalityByCode = new Map(modalities.map((m) => [m.code, m]));

    const sellerUsers = DEMO_SELLERS.map(({ email }) => userByEmail.get(email));
    const memberUsers = DEMO_CARRIER_MEMBERS.map(({ email }) =>
      userByEmail.get(email),
    );
    const sellers = sellerUsers.map((user) => user?.seller);
    const carrierUsers = memberUsers.map((user) => user?.carrierUser);
    // A missing extra carrier only drops out of the simulation; the core tenant and the reset go on.
    const extraManagers = DEMO_EXTRA_CARRIERS.flatMap(
      ({ companyName, manager }) => {
        const carrierUser = userByEmail.get(manager.email)?.carrierUser;
        if (!carrierUser) {
          this.logger.error(
            `Demo carrier ${companyName} not found; run the seed with SEED_DEMO=true`,
          );
        }
        return carrierUser ? [carrierUser] : [];
      },
    );
    const demoModalities = DEMO_MODALITY_CODES.map((code) =>
      modalityByCode.get(code),
    );
    if (
      !isComplete(sellerUsers) ||
      !isComplete(sellers) ||
      !isComplete(carrierUsers) ||
      !isComplete(demoModalities)
    ) {
      return null;
    }

    const [standard, full, express] = demoModalities;
    const carrierId = carrierUsers[0].carrierId;
    return {
      sellerIds: sellers.map((seller) => seller.id),
      sellerUserIds: sellerUsers.map((user) => user.id),
      carrierId,
      carrierUserIds: byMemberEmail(carrierUsers.map(({ id }) => id)),
      memberUserIds: byMemberEmail(carrierUsers.map(({ userId }) => userId)),
      claimUserIds: {
        [carrierId]: carrierUsers
          .filter((carrierUser) => carrierUser.role === CarrierRole.OPERATOR)
          .map((carrierUser) => carrierUser.userId),
        ...Object.fromEntries(
          extraManagers.map((manager) => [manager.carrierId, [manager.userId]]),
        ),
      },
      modalities: { STANDARD: standard, FULL: full, EXPRESS: express },
    };
  }
}
