import { ApiProperty } from '@nestjs/swagger';

export class WebhookInboxRequestDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  receivedAt: Date;

  @ApiProperty({ type: String, nullable: true })
  webhookId: string | null;

  @ApiProperty({ description: 'Request body, cut at 2 KB' })
  body: string;

  @ApiProperty({ description: 'Standard Webhooks signature check result' })
  signatureValid: boolean;

  @ApiProperty({ example: 200 })
  responseStatus: number;
}

export class WebhookInboxResponseDto {
  @ApiProperty({ description: 'When on, the inbox answers 500' })
  failRequests: boolean;

  @ApiProperty({ type: [WebhookInboxRequestDto], description: 'Newest first' })
  requests: WebhookInboxRequestDto[];
}
