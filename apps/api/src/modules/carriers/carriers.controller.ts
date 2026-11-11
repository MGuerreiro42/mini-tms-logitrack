import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GlobalRole } from '../../../generated/prisma/client';
import { ApiPaginatedResponse } from '../../shared/pagination/api-paginated-response.decorator';
import { windowSince } from '../../shared/stats/stats';
import { StatsWindowQueryDto } from '../../shared/stats/stats-window-query.dto';
import { RateLimit } from '../../shared/throttling/rate-limit.decorator';
import { SIGNUP_RATE_LIMIT } from '../../shared/throttling/rate-limits';
import { CARRIER_ROLES } from '../auth/carrier-roles';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ModalityToggleResponseDto } from '../modalities/dto/modality-toggle-response.dto';
import { CarriersService } from './carriers.service';
import { CarrierPerformanceResponseDto } from './dto/carrier-performance-response.dto';
import { CarrierResponseDto } from './dto/carrier-response.dto';
import { CoverageAreaResponseDto } from './dto/coverage-area-response.dto';
import { CreateCarrierDto } from './dto/create-carrier.dto';
import { ListCarriersQueryDto } from './dto/list-carriers-query.dto';
import { OperatorRankingItemResponseDto } from './dto/operator-ranking-response.dto';
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
  @RateLimit(SIGNUP_RATE_LIMIT)
  @Post()
  signup(@Body() dto: CreateCarrierDto) {
    return this.carriersService.signup(dto);
  }

  @ApiOperation({
    summary:
      "Get the authenticated carrier user's own company (manager or operator)",
  })
  @ApiResponse({ status: 200, type: CarrierResponseDto })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @Auth(...CARRIER_ROLES)
  @Get('me')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.carriersService.findByUserId(user.id);
  }

  @ApiOperation({
    summary:
      'List the full modality catalog with an enabled flag for the authenticated carrier',
  })
  @ApiResponse({ status: 200, type: [ModalityToggleResponseDto] })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @Auth(...CARRIER_ROLES)
  @Get('me/modalities')
  getModalities(@CurrentUser() user: AuthenticatedUser) {
    return this.carriersService.getModalities(user.id);
  }

  @ApiOperation({
    summary:
      "Replace the authenticated carrier's operated modality set — manager only (full replace, not incremental)",
  })
  @ApiResponse({ status: 200, type: [ModalityToggleResponseDto] })
  @ApiResponse({ status: 400, description: 'Unknown modalityId' })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @Auth(GlobalRole.CARRIER_MANAGER)
  @Put('me/modalities')
  setModalities(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetCarrierModalitiesDto,
  ) {
    return this.carriersService.setModalities(user.id, dto.modalityIds);
  }

  @ApiOperation({
    summary: "List the authenticated carrier's coverage areas",
  })
  @ApiResponse({ status: 200, type: [CoverageAreaResponseDto] })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @Auth(...CARRIER_ROLES)
  @Get('me/coverage-areas')
  getCoverageAreas(@CurrentUser() user: AuthenticatedUser) {
    return this.carriersService.getCoverageAreas(user.id);
  }

  @ApiOperation({
    summary:
      "Replace the authenticated carrier's coverage areas — manager only (full replace, not incremental)",
  })
  @ApiResponse({ status: 200, type: [CoverageAreaResponseDto] })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @Auth(GlobalRole.CARRIER_MANAGER)
  @Put('me/coverage-areas')
  setCoverageAreas(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetCoverageAreasDto,
  ) {
    return this.carriersService.setCoverageAreas(user.id, dto.areas);
  }

  @ApiOperation({
    summary:
      "Delivery metrics of the authenticated carrier's shipments created in the window (spec 07 FR-008): on time with trend, median delivery, first attempt, claim time and per-stage p50/p90 against a budget — read-only for both manager and operator",
  })
  @ApiResponse({ status: 200, type: CarrierPerformanceResponseDto })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @Auth(...CARRIER_ROLES)
  @Get('me/performance')
  async performance(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: StatsWindowQueryDto,
  ) {
    const carrierId = await this.carriersService.findCarrierIdForUserOrThrow(
      user.id,
    );
    return this.carriersService.performance(carrierId, windowSince(query));
  }

  @ApiOperation({
    summary:
      'Every CarrierUser of the carrier with active (owned, open now), claimed, delivered and on time over the shipments they own in the window — operators first, then by active; read-only for both manager and operator',
  })
  @ApiResponse({ status: 200, type: [OperatorRankingItemResponseDto] })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @Auth(...CARRIER_ROLES)
  @Get('me/operator-ranking')
  async operatorRanking(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: StatsWindowQueryDto,
  ) {
    const carrierId = await this.carriersService.findCarrierIdForUserOrThrow(
      user.id,
    );
    return this.carriersService.operatorRanking(carrierId, windowSince(query));
  }

  @ApiOperation({
    summary:
      'List carriers, optionally filtered by status — paginated (default 20/page, max 100)',
  })
  @ApiPaginatedResponse(CarrierResponseDto)
  @Auth(GlobalRole.ADMIN)
  @Get()
  findAll(@Query() query: ListCarriersQueryDto) {
    return this.carriersService.findAll(query.status, query.page, query.limit);
  }

  @ApiOperation({
    summary:
      'Count carriers by ApprovalStatus, platform-wide — admin dashboard',
  })
  @ApiResponse({ status: 200, type: CarrierStatusCountsResponseDto })
  @Auth(GlobalRole.ADMIN)
  @Get('status-counts')
  countsByStatus() {
    return this.carriersService.countsByStatus();
  }

  @ApiOperation({ summary: 'Get a single carrier by id' })
  @ApiResponse({ status: 200, type: CarrierResponseDto })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @Auth(GlobalRole.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.carriersService.findOne(id);
  }

  @ApiOperation({
    summary:
      "One carrier's delivery metrics for the window, as its manager sees them — admin only",
  })
  @ApiResponse({ status: 200, type: CarrierPerformanceResponseDto })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @Auth(GlobalRole.ADMIN)
  @Get(':id/performance')
  async performanceById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: StatsWindowQueryDto,
  ) {
    await this.carriersService.assertExists(id);
    return this.carriersService.performance(id, windowSince(query));
  }

  @ApiOperation({
    summary:
      "One carrier's team for the window, as its manager sees it — admin only",
  })
  @ApiResponse({ status: 200, type: [OperatorRankingItemResponseDto] })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @Auth(GlobalRole.ADMIN)
  @Get(':id/operator-ranking')
  async operatorRankingById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: StatsWindowQueryDto,
  ) {
    await this.carriersService.assertExists(id);
    return this.carriersService.operatorRanking(id, windowSince(query));
  }

  @ApiOperation({ summary: "One carrier's coverage areas — admin only" })
  @ApiResponse({ status: 200, type: [CoverageAreaResponseDto] })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @Auth(GlobalRole.ADMIN)
  @Get(':id/coverage-areas')
  async coverageAreasById(@Param('id', ParseUUIDPipe) id: string) {
    await this.carriersService.assertExists(id);
    return this.carriersService.listCoverageAreas(id);
  }

  @ApiOperation({
    summary:
      'List the modality catalog with an enabled flag for one carrier — admin only',
  })
  @ApiResponse({ status: 200, type: [ModalityToggleResponseDto] })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @Auth(GlobalRole.ADMIN)
  @Get(':id/modalities')
  async modalitiesById(@Param('id', ParseUUIDPipe) id: string) {
    await this.carriersService.assertExists(id);
    return this.carriersService.buildModalityToggles(id);
  }

  @ApiOperation({ summary: 'Approve a pending carrier' })
  @ApiResponse({ status: 200, type: CarrierResponseDto })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @ApiResponse({ status: 409, description: 'Carrier is not pending' })
  @Auth(GlobalRole.ADMIN)
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.carriersService.approve(id);
  }

  @ApiOperation({ summary: 'Reject a pending carrier' })
  @ApiResponse({ status: 200, type: CarrierResponseDto })
  @ApiResponse({ status: 404, description: 'Carrier not found' })
  @ApiResponse({ status: 409, description: 'Carrier is not pending' })
  @Auth(GlobalRole.ADMIN)
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.carriersService.reject(id);
  }
}
