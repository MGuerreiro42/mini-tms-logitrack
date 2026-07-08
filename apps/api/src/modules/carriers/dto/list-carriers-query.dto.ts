import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ApprovalStatus } from '../../../../generated/prisma/client';
import { PaginationQueryDto } from '../../../shared/pagination/pagination-query.dto';

export class ListCarriersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ApprovalStatus })
  @IsOptional()
  @IsEnum(ApprovalStatus)
  status?: ApprovalStatus;
}
