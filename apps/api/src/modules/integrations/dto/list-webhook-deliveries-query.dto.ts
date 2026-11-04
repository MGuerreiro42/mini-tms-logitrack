import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { WebhookDeliveryStatus } from '../../../../generated/prisma/client';
import { PaginationQueryDto } from '../../../shared/pagination/pagination-query.dto';

export class ListWebhookDeliveriesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: WebhookDeliveryStatus })
  @IsOptional()
  @IsEnum(WebhookDeliveryStatus)
  status?: WebhookDeliveryStatus;
}
