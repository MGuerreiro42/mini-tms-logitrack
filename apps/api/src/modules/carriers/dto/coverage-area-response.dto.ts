import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CoverageAreaResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  state: string;

  @ApiPropertyOptional({ nullable: true })
  city: string | null;
}
