import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CoverageAreaInputDto } from './coverage-area-input.dto';

export class SetCoverageAreasDto {
  @ApiProperty({ type: [CoverageAreaInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoverageAreaInputDto)
  areas: CoverageAreaInputDto[];
}
