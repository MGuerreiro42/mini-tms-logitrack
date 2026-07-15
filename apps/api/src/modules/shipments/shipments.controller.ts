import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GlobalRole } from '../../../generated/prisma/client';
import { ApiPaginatedResponse } from '../../shared/pagination/api-paginated-response.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  CarrierShipmentDetailResponseDto,
  CarrierShipmentResponseDto,
} from './dto/carrier-shipment-response.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { EligibleCarrierResponseDto } from './dto/eligible-carrier-response.dto';
import { EligibleCarriersQueryDto } from './dto/eligible-carriers-query.dto';
import { ListQueueQueryDto } from './dto/list-queue-query.dto';
import { ListShipmentsQueryDto } from './dto/list-shipments-query.dto';
import { ShipmentResponseDto } from './dto/shipment-response.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { ShipmentsService } from './shipments.service';

@ApiTags('shipments')
@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Preview eligible carriers for an address+modality — cross-references CarrierCoverageArea, CarrierModality and Carrier.status=APPROVED',
  })
  @ApiResponse({ status: 200, type: [EligibleCarrierResponseDto] })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not a seller' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.SELLER)
  @Get('eligible-carriers')
  eligibleCarriers(@Query() query: EligibleCarriersQueryDto) {
    return this.shipmentsService.findEligibleCarriers(
      query.state,
      query.city,
      query.modalityId,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Create a shipment — every constraint from the eligible-carriers preview is re-validated server-side',
  })
  @ApiResponse({ status: 201, type: ShipmentResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid DTO or failed re-validation',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not a seller' })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.SELLER)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateShipmentDto,
  ) {
    return this.shipmentsService.create(user.id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "List the authenticated seller's own shipments, optionally filtered by status — paginated (default 20/page, max 100)",
  })
  @ApiPaginatedResponse(ShipmentResponseDto)
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not a seller' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.SELLER)
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

  // Carrier-facing routes below are declared before `:id` — `queue` and
  // `queue/:id` are two-segment paths so they can't collide with the
  // single-segment `:id` route regardless of order, but they're grouped and
  // placed early anyway, matching this codebase's own convention
  // (carriers.controller.ts already puts `me`/`me/modalities` before
  // `:id`/`:id/approve`). PATCH routes are the only PATCHs on this
  // controller today — kept grouped together so a future `PATCH :id/...`
  // addition knows to stay near this block, not scattered.

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "List the authenticated carrier's shared shipment queue, optionally filtered by status — paginated (default 20/page, max 100)",
  })
  @ApiPaginatedResponse(CarrierShipmentResponseDto)
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not a carrier user' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.CARRIER_MANAGER, GlobalRole.CARRIER_OPERATOR)
  @Get('queue')
  findQueue(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListQueueQueryDto,
  ) {
    return this.shipmentsService.findAllForCarrier(
      user.id,
      query.status,
      query.page,
      query.limit,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get a single shipment in the queue of the authenticated carrier, including its full tracking timeline — a shipment belonging to another carrier returns 404, not 403',
  })
  @ApiResponse({ status: 200, type: CarrierShipmentDetailResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not a carrier user' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.CARRIER_MANAGER, GlobalRole.CARRIER_OPERATOR)
  @Get('queue/:id')
  findQueueOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.shipmentsService.findOneForCarrier(user.id, id);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Claim an unowned shipment (self-assign) — any manager or operator of the carrier may claim, first to do so wins',
  })
  @ApiResponse({ status: 200, type: CarrierShipmentResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not a carrier user' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  @ApiResponse({ status: 409, description: 'Shipment already claimed' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.CARRIER_MANAGER, GlobalRole.CARRIER_OPERATOR)
  @Patch(':id/claim')
  claim(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.shipmentsService.claim(user.id, id);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Advance a shipment to its next status — only the owning operator or the carrier manager may do so',
  })
  @ApiResponse({ status: 200, type: CarrierShipmentResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid transition, or the shipment is still unclaimed',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({
    status: 403,
    description: 'Not the owner nor the carrier manager',
  })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.CARRIER_MANAGER, GlobalRole.CARRIER_OPERATOR)
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateShipmentStatusDto,
  ) {
    return this.shipmentsService.updateStatus(user.id, id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get a single shipment owned by the authenticated seller — a shipment belonging to another seller returns 404, not 403',
  })
  @ApiResponse({ status: 200, type: ShipmentResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not a seller' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.SELLER)
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.shipmentsService.findOneForSeller(user.id, id);
  }
}
