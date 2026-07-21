import { ApiProperty } from '@nestjs/swagger';

// Same shape/reasoning as sellers/dto/status-counts-response.dto.ts — kept as
// a separate class (not a shared import) since each module owns its own DTOs
// in this codebase, even where two modules' status enum happens to match.
export class CarrierStatusCountsResponseDto {
  @ApiProperty()
  PENDING: number;

  @ApiProperty()
  APPROVED: number;

  @ApiProperty()
  REJECTED: number;
}
