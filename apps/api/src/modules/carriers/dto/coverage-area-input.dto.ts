import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { toTrimmed } from '../../../shared/transforms/normalize';
import { IsUf } from '../../../shared/validation/br-validators';

export class CoverageAreaInputDto {
  @ApiProperty({ example: 'SP', description: 'One of the 27 UFs, any case' })
  @IsUf()
  state: string;

  @ApiPropertyOptional({
    example: 'São Paulo',
    description: 'Omit/null to cover the entire state',
  })
  @IsOptional()
  @Transform(toTrimmed)
  @IsString()
  @IsNotEmpty()
  city?: string;
}
