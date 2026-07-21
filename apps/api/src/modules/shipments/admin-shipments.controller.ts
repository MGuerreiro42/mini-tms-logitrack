import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GlobalRole } from '../../../generated/prisma/client';
import { ApiPaginatedResponse } from '../../shared/pagination/api-paginated-response.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminShipmentResponseDto } from './dto/admin-shipment-response.dto';
import { ListAdminShipmentsQueryDto } from './dto/list-admin-shipments-query.dto';
import { ShipmentsService } from './shipments.service';

// Distinct `admin` prefix, not nested under `shipments` — the one route
// deliberately unscoped by ownership (SCREENS.md's Global Monitoring), so it
// gets its own namespace rather than living among ShipmentsController's
// seller/carrier-scoped routes with a role check as the only thing telling
// them apart.
@ApiTags('admin')
@Controller('admin')
export class AdminShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'List every shipment platform-wide, filterable by status/carrierId/sellerId — no ownership scoping, admin only',
  })
  @ApiPaginatedResponse(AdminShipmentResponseDto)
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not an admin' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.ADMIN)
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
}
