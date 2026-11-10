import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ApprovalStatus } from '../../../../generated/prisma/client';
import { PaginationQueryDto } from '../../../shared/pagination/pagination-query.dto';
import { IncludeStatsQueryDto } from '../../shipments/metrics/list-stats.dto';

export class ListCarriersQueryDto extends IntersectionType(
  PaginationQueryDto,
  IncludeStatsQueryDto,
) {
  @ApiPropertyOptional({ enum: ApprovalStatus })
  @IsOptional()
  @IsEnum(ApprovalStatus)
  status?: ApprovalStatus;
}
