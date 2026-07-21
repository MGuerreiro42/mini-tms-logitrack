import { ApiProperty } from '@nestjs/swagger';

// Shipment.ownerId -> CarrierUser, ranked by total shipments owned within
// the authenticated carrier. Operator invites aren't built yet (DESIGN.md
// § 7), so today a carrier only ever has one CarrierUser (the manager) —
// this returns a single row until that feature ships, by design.
export class OperatorRankingItemResponseDto {
  @ApiProperty()
  carrierUserId: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  totalOwned: number;

  @ApiProperty()
  delivered: number;
}
