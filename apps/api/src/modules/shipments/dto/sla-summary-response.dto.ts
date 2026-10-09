import { ApiProperty } from '@nestjs/swagger';

export class SlaSummaryItemResponseDto {
  @ApiProperty()
  modalityCode: string;

  @ApiProperty()
  modalityName: string;

  @ApiProperty()
  deliveredCount: number;

  @ApiProperty()
  onTimeCount: number;

  @ApiProperty()
  onTimeRate: number;
}
