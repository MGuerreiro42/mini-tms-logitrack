import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GlobalRole } from '../../../generated/prisma/client';
import { ApiPaginatedResponse } from '../../shared/pagination/api-paginated-response.decorator';
import { Auth } from '../auth/decorators/auth.decorator';
import { AdminShipmentResponseDto } from './dto/admin-shipment-response.dto';
import { ListAdminShipmentsQueryDto } from './dto/list-admin-shipments-query.dto';
import { ShipmentsService } from './shipments.service';

// Own `admin` prefix: the only route not scoped by ownership.
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
}
