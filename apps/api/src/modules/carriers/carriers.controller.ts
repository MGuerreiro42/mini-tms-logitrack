import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import { ModalityToggleResponseDto } from '../modalities/dto/modality-toggle-response.dto';
import { CarriersService } from './carriers.service';
import { CarrierPerformanceResponseDto } from './dto/carrier-performance-response.dto';
import { CarrierResponseDto } from './dto/carrier-response.dto';
import { CoverageAreaResponseDto } from './dto/coverage-area-response.dto';
import { CreateCarrierDto } from './dto/create-carrier.dto';
import { ListCarriersQueryDto } from './dto/list-carriers-query.dto';
import { SetCarrierModalitiesDto } from './dto/set-carrier-modalities.dto';
import { SetCoverageAreasDto } from './dto/set-coverage-areas.dto';
import { CarrierStatusCountsResponseDto } from './dto/status-counts-response.dto';

@ApiTags('carriers')
@Controller('carriers')
export class CarriersController {
  constructor(private readonly carriersService: CarriersService) {}

  @ApiOperation({
    summary:
      'Public carrier company registration — creates the manager account and the company with PENDING status',
  })
  @ApiResponse({ status: 201, type: CarrierResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid DTO' })
  @ApiResponse({
    status: 409,
    description: 'Email or document already registered',
  })
  @Post()
  signup(@Body() dto: CreateCarrierDto) {
    return this.carriersService.signup(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Get the authenticated carrier user's own company (manager or operator)",
  })
  @ApiResponse({ status: 200, type: CarrierResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not a carrier user' })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.CARRIER_MANAGER, GlobalRole.CARRIER_OPERATOR)
  @Get('me')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.carriersService.findByUserId(user.id);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'List the full modality catalog with an enabled flag for the authenticated carrier',
  })
  @ApiResponse({ status: 200, type: [ModalityToggleResponseDto] })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not a carrier user' })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.CARRIER_MANAGER, GlobalRole.CARRIER_OPERATOR)
  @Get('me/modalities')
  getModalities(@CurrentUser() user: AuthenticatedUser) {
    return this.carriersService.getModalities(user.id);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Replace the authenticated carrier's operated modality set — manager only (full replace, not incremental)",
  })
  @ApiResponse({ status: 200, type: [ModalityToggleResponseDto] })
  @ApiResponse({ status: 400, description: 'Unknown modalityId' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not a carrier manager' })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.CARRIER_MANAGER)
  @Put('me/modalities')
  setModalities(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetCarrierModalitiesDto,
  ) {
    return this.carriersService.setModalities(user.id, dto.modalityIds);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "List the authenticated carrier's coverage areas",
  })
  @ApiResponse({ status: 200, type: [CoverageAreaResponseDto] })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not a carrier user' })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.CARRIER_MANAGER, GlobalRole.CARRIER_OPERATOR)
  @Get('me/coverage-areas')
  getCoverageAreas(@CurrentUser() user: AuthenticatedUser) {
    return this.carriersService.getCoverageAreas(user.id);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Replace the authenticated carrier's coverage areas — manager only (full replace, not incremental)",
  })
  @ApiResponse({ status: 200, type: [CoverageAreaResponseDto] })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not a carrier manager' })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.CARRIER_MANAGER)
  @Put('me/coverage-areas')
  setCoverageAreas(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetCoverageAreasDto,
  ) {
    return this.carriersService.setCoverageAreas(user.id, dto.areas);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Aggregated metrics scoped to the authenticated carrier's own shipments — read-only for both manager and operator",
  })
  @ApiResponse({ status: 200, type: CarrierPerformanceResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not a carrier user' })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.CARRIER_MANAGER, GlobalRole.CARRIER_OPERATOR)
  @Get('me/performance')
  performance(@CurrentUser() user: AuthenticatedUser) {
    return this.carriersService.performance(user.id);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'List carriers, optionally filtered by status — paginated (default 20/page, max 100)',
  })
  @ApiPaginatedResponse(CarrierResponseDto)
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not an admin' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.ADMIN)
  @Get()
  findAll(@Query() query: ListCarriersQueryDto) {
    return this.carriersService.findAll(query.status, query.page, query.limit);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Count carriers by ApprovalStatus, platform-wide — admin dashboard',
  })
  @ApiResponse({ status: 200, type: CarrierStatusCountsResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not an admin' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.ADMIN)
  @Get('status-counts')
  countsByStatus() {
    return this.carriersService.countsByStatus();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single carrier by id' })
  @ApiResponse({ status: 200, type: CarrierResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not an admin' })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.carriersService.findOne(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a pending carrier' })
  @ApiResponse({ status: 200, type: CarrierResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not an admin' })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @ApiResponse({ status: 409, description: 'Carrier is not pending' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.ADMIN)
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.carriersService.approve(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a pending carrier' })
  @ApiResponse({ status: 200, type: CarrierResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not an admin' })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @ApiResponse({ status: 409, description: 'Carrier is not pending' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.ADMIN)
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.carriersService.reject(id);
  }
}
