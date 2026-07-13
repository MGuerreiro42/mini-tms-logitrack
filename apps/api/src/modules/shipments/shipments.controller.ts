import {
  Body,
  Controller,
  Get,
  Param,
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
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { EligibleCarrierResponseDto } from './dto/eligible-carrier-response.dto';
import { EligibleCarriersQueryDto } from './dto/eligible-carriers-query.dto';
import { ListShipmentsQueryDto } from './dto/list-shipments-query.dto';
import { ShipmentResponseDto } from './dto/shipment-response.dto';
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
