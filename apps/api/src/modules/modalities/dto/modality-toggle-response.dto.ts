import { ApiProperty } from '@nestjs/swagger';

export class ModalityToggleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  enabled: boolean;
}
