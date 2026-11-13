import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GlobalRole } from '../../../generated/prisma/client';
import { ApiPaginatedResponse } from '../../shared/pagination/api-paginated-response.decorator';
import { RateLimit } from '../../shared/throttling/rate-limit.decorator';
import { WEBHOOK_ACTION_RATE_LIMIT } from '../../shared/throttling/rate-limits';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ListWebhookDeliveriesQueryDto } from './dto/list-webhook-deliveries-query.dto';
import { UpdateWebhookEndpointDto } from './dto/update-webhook-endpoint.dto';
import { UpdateWebhookInboxDto } from './dto/update-webhook-inbox.dto';
import { WebhookDeliveryResponseDto } from './dto/webhook-delivery-response.dto';
import { WebhookEndpointResponseDto } from './dto/webhook-endpoint-response.dto';
import { WebhookHealthResponseDto } from './dto/webhook-health-response.dto';
import { WebhookInboxResponseDto } from './dto/webhook-inbox-response.dto';
import { WebhooksService } from './webhooks.service';

@ApiTags('webhooks')
@ApiResponse({ status: 404, description: 'Seller not found' })
@Auth(GlobalRole.SELLER)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @ApiOperation({
    summary:
      "The authenticated seller's webhook endpoint — created on first access, active and pointing at their test inbox",
  })
  @ApiResponse({ status: 200, type: WebhookEndpointResponseDto })
  @Get('endpoint')
  getEndpoint(@CurrentUser() user: AuthenticatedUser) {
    return this.webhooksService.getEndpoint(user.id);
  }

  @ApiOperation({
    summary:
      'Change the URL, events or active flag — the URL must be https and resolve to a public address, unless it is the inbox URL. Disabling fails the pending deliveries',
  })
  @ApiResponse({ status: 200, type: WebhookEndpointResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid DTO or unsafe URL' })
  @RateLimit(WEBHOOK_ACTION_RATE_LIMIT)
  @Patch('endpoint')
  updateEndpoint(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateWebhookEndpointDto,
  ) {
    return this.webhooksService.updateEndpoint(user.id, dto);
  }

  @ApiOperation({
    summary:
      'Replace the signing secret — the next attempt is signed with the new one',
  })
  @ApiResponse({ status: 201, type: WebhookEndpointResponseDto })
  @RateLimit(WEBHOOK_ACTION_RATE_LIMIT)
  @Post('endpoint/rotate-secret')
  rotateSecret(@CurrentUser() user: AuthenticatedUser) {
    return this.webhooksService.rotateSecret(user.id);
  }

  @ApiOperation({
    summary:
      'Delivery log, newest first, optionally by status — paginated (default 20/page, max 100)',
  })
  @ApiPaginatedResponse(WebhookDeliveryResponseDto)
  @Get('deliveries')
  findDeliveries(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListWebhookDeliveriesQueryDto,
  ) {
    return this.webhooksService.findDeliveries(
      user.id,
      query.status,
      query.page,
      query.limit,
    );
  }

  @ApiOperation({
    summary:
      'Send a delivery again, as a new delivery with the same payload and a new id',
  })
  @ApiResponse({ status: 201, type: WebhookDeliveryResponseDto })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  @RateLimit(WEBHOOK_ACTION_RATE_LIMIT)
  @Post('deliveries/:id/replay')
  replay(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.webhooksService.replay(user.id, id);
  }

  @ApiOperation({
    summary:
      'Health of the endpoint over the last 24 h: ok, degraded (< 95 % succeeded), down (the last 5 failed), too_few (n < 5) or not_configured',
  })
  @ApiResponse({ status: 200, type: WebhookHealthResponseDto })
  @Get('health')
  health(@CurrentUser() user: AuthenticatedUser) {
    return this.webhooksService.health(user.id);
  }

  @ApiOperation({ summary: 'The latest requests received by the test inbox' })
  @ApiResponse({ status: 200, type: WebhookInboxResponseDto })
  @Get('inbox')
  readInbox(@CurrentUser() user: AuthenticatedUser) {
    return this.webhooksService.readInbox(user.id);
  }

  @ApiOperation({ summary: 'Make the test inbox answer 500, to watch retries' })
  @ApiResponse({ status: 200, type: WebhookInboxResponseDto })
  @Patch('inbox')
  updateInbox(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateWebhookInboxDto,
  ) {
    return this.webhooksService.setInboxFailing(user.id, dto.failRequests);
  }
}
