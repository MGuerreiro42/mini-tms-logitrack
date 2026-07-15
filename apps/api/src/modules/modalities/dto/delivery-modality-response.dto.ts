import { ApiProperty } from '@nestjs/swagger';

export class DeliveryModalityResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  slaHours: number | null;
}
