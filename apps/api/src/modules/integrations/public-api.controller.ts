import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../shared/pagination/api-paginated-response.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateShipmentDto } from '../shipments/dto/create-shipment.dto';
import { ListShipmentsQueryDto } from '../shipments/dto/list-shipments-query.dto';
import { ShipmentResponseDto } from '../shipments/dto/shipment-response.dto';
import { ShipmentsService } from '../shipments/shipments.service';
import { ApiKeyAuth } from './api-key-auth.decorator';
import {
  IDEMPOTENCY_HEADER,
  IDEMPOTENCY_KEY_MAX_LENGTH,
  IdempotencyInterceptor,
} from './idempotency.interceptor';

@ApiTags('public-api')
@ApiKeyAuth()
@Controller('v1/shipments')
export class PublicApiController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @ApiOperation({
    summary:
      "Create a shipment for the key's seller — same validation and carrier matching as the seller app",
  })
  @ApiHeader({
    name: IDEMPOTENCY_HEADER,
    required: false,
    description: `Up to ${IDEMPOTENCY_KEY_MAX_LENGTH} characters. Repeating it within 24 h returns the first response instead of creating another shipment`,
  })
  @ApiResponse({ status: 201, type: ShipmentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid DTO or failed validation' })
  @ApiResponse({
    status: 409,
    description: `A request with the same ${IDEMPOTENCY_HEADER} is still in progress`,
  })
  @ApiResponse({
    status: 422,
    description: `${IDEMPOTENCY_HEADER} already used with a different body`,
  })
  @UseInterceptors(IdempotencyInterceptor)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateShipmentDto,
  ) {
    return this.shipmentsService.create(user.id, dto);
  }

  @ApiOperation({
    summary:
      "List the key's seller shipments, optionally filtered by status — paginated (default 20/page, max 100)",
  })
  @ApiPaginatedResponse(ShipmentResponseDto)
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListShipmentsQueryDto,
  ) {
    return this.shipmentsService.findAllForSeller(
      user.id,
      query.status,
      query.page,
      query.limit,
    );
  }

  @ApiOperation({
    summary:
      "Get one of the key's seller shipments — another seller's shipment returns 404",
  })
  @ApiResponse({ status: 200, type: ShipmentResponseDto })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.shipmentsService.findOneForSeller(user.id, id);
  }
}
