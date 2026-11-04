import { ApiProperty } from '@nestjs/swagger';
import { WebhookEvent } from '../../../../generated/prisma/client';

export class WebhookEndpointResponseDto {
  @ApiProperty({ example: 'https://erp.example.com/webhooks/tms' })
  url: string;

  @ApiProperty({ enum: WebhookEvent, isArray: true })
  events: WebhookEvent[];

  @ApiProperty()
  active: boolean;

  @ApiProperty({
    example: 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw',
    description: 'Standard Webhooks signing secret',
  })
  secret: string;

  @ApiProperty({ description: "The seller's built-in test receiver" })
  inboxUrl: string;
}
