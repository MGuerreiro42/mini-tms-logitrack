import { ApiProperty } from '@nestjs/swagger';
import {
  WebhookDeliveryStatus,
  WebhookEvent,
} from '../../../../generated/prisma/client';

export class WebhookDeliveryResponseDto {
  @ApiProperty({ description: 'Also sent as the webhook-id header' })
  id: string;

  @ApiProperty({ enum: WebhookEvent })
  event: WebhookEvent;

  @ApiProperty({ enum: WebhookDeliveryStatus })
  status: WebhookDeliveryStatus;

  @ApiProperty()
  attempts: number;

  @ApiProperty({ type: Number, nullable: true })
  responseCode: number | null;

  @ApiProperty({ type: Number, nullable: true })
  durationMs: number | null;

  @ApiProperty({ type: String, nullable: true })
  error: string | null;

  @ApiProperty({ type: Date, nullable: true })
  nextAttemptAt: Date | null;

  @ApiProperty({ description: 'The JSON body sent to the endpoint' })
  payload: unknown;

  @ApiProperty()
  createdAt: Date;
}
