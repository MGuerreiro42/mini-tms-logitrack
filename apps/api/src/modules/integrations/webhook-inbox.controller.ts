import {
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RateLimit } from '../../shared/throttling/rate-limit.decorator';
import { WEBHOOK_INBOX_RATE_LIMIT } from '../../shared/throttling/rate-limits';
import {
  WEBHOOK_INBOX_PATH,
  WebhookInboxService,
} from './webhook-inbox.service';

// Express's own types are not installed; these are the fields this route reads and writes.
interface InboxRequest {
  headers: Record<string, string | string[] | undefined>;
  rawBody?: Buffer;
}
interface InboxResponse {
  status(code: number): unknown;
}

@ApiTags('webhook-inbox')
@Controller(WEBHOOK_INBOX_PATH)
export class WebhookInboxController {
  constructor(private readonly inbox: WebhookInboxService) {}

  @ApiOperation({
    summary:
      "A seller's test receiver: records the request with its Standard Webhooks signature check — public, addressed by an unguessable id",
  })
  @ApiResponse({ status: 200, description: 'Recorded' })
  @ApiResponse({
    status: 500,
    description: 'Recorded, with "fail requests" on',
  })
  @ApiResponse({ status: 404, description: 'Inbox not found' })
  @RateLimit(WEBHOOK_INBOX_RATE_LIMIT)
  @Post(':inboxId')
  async receive(
    @Param('inboxId', ParseUUIDPipe) inboxId: string,
    @Req() request: InboxRequest,
    @Res({ passthrough: true }) response: InboxResponse,
  ): Promise<void> {
    const body = request.rawBody ?? Buffer.alloc(0);
    response.status(await this.inbox.receive(inboxId, request.headers, body));
  }
}
