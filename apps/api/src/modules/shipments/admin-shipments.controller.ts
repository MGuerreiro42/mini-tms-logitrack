import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GlobalRole } from '../../../generated/prisma/client';
import { ApiPaginatedResponse } from '../../shared/pagination/api-paginated-response.decorator';
import { Auth } from '../auth/decorators/auth.decorator';
import { AdminShipmentResponseDto } from './dto/admin-shipment-response.dto';
import { AdminStatusCountsQueryDto } from './dto/admin-status-counts-query.dto';
import { ListAdminShipmentsQueryDto } from './dto/list-admin-shipments-query.dto';
import { ShipmentStatusCountsResponseDto } from './dto/shipment-status-counts-response.dto';
import { ShipmentsService } from './shipments.service';

@ApiTags('admin')
@Controller('admin')
export class AdminShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @ApiOperation({
    summary:
      'List every shipment platform-wide, filterable by status/carrierId/sellerId — no ownership scoping, admin only',
  })
  @ApiPaginatedResponse(AdminShipmentResponseDto)
  @Auth(GlobalRole.ADMIN)
  @Get('shipments')
  findAll(@Query() query: ListAdminShipmentsQueryDto) {
    return this.shipmentsService.findAllForAdmin(
      query.status,
      query.carrierId,
      query.sellerId,
      query.page,
      query.limit,
    );
  }

  @ApiOperation({
    summary:
      'Count every shipment platform-wide by ShipmentStatus, optionally for one carrierId/sellerId — admin only',
  })
  @ApiResponse({ status: 200, type: ShipmentStatusCountsResponseDto })
  @Auth(GlobalRole.ADMIN)
  @Get('shipments/status-counts')
  countsByStatus(@Query() query: AdminStatusCountsQueryDto) {
    return this.shipmentsService.countsByStatusForAdmin(
      query.carrierId,
      query.sellerId,
    );
  }
}
