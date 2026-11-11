import { ApiProperty } from '@nestjs/swagger';

export class ModalityToggleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'The SLA in hours; null for a modality without one',
  })
  slaHours: number | null;

  @ApiProperty()
  enabled: boolean;
}
