import { ApiProperty } from '@nestjs/swagger';

// One property per ApprovalStatus value — a single groupBy query on the
// backend, replacing what the frontend dashboard used to do with 2 separate
// `findAll(status, limit: 1)` calls per entity (see DESIGN.md's dashboard
// slice: those calls ran a full joined `findMany` just to read `meta.total`).
export class SellerStatusCountsResponseDto {
  @ApiProperty()
  PENDING: number;

  @ApiProperty()
  APPROVED: number;

  @ApiProperty()
  REJECTED: number;
}
