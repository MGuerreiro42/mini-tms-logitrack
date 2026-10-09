import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GlobalRole } from '../../../generated/prisma/client';
import { ApiPaginatedResponse } from '../../shared/pagination/api-paginated-response.decorator';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ModalityToggleResponseDto } from '../modalities/dto/modality-toggle-response.dto';
import { CreateSellerDto } from './dto/create-seller.dto';
import { ListSellersQueryDto } from './dto/list-sellers-query.dto';
import { SellerResponseDto } from './dto/seller-response.dto';
import { SetModalitiesDto } from './dto/set-modalities.dto';
import { SellerStatusCountsResponseDto } from './dto/status-counts-response.dto';
import { SellersService } from './sellers.service';

@ApiTags('sellers')
@Controller('sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @ApiOperation({
    summary:
      'Public seller self-signup — creates an account with PENDING status',
  })
  @ApiResponse({ status: 201, type: SellerResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid DTO' })
  @ApiResponse({
    status: 409,
    description: 'Email or document already registered',
  })
  @Post()
  signup(@Body() dto: CreateSellerDto) {
    return this.sellersService.signup(dto);
  }

  @ApiOperation({ summary: "Get the authenticated seller's own record" })
  @ApiResponse({ status: 200, type: SellerResponseDto })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  @Auth(GlobalRole.SELLER)
  @Get('me')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.sellersService.findByUserId(user.id);
  }

  @ApiOperation({
    summary:
      'List the full modality catalog with an enabled flag for the authenticated seller',
  })
  @ApiResponse({ status: 200, type: [ModalityToggleResponseDto] })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  @Auth(GlobalRole.SELLER)
  @Get('me/modalities')
  getModalities(@CurrentUser() user: AuthenticatedUser) {
    return this.sellersService.getModalities(user.id);
  }

  @ApiOperation({
    summary:
      "Replace the authenticated seller's enabled modality set (full replace, not incremental)",
  })
  @ApiResponse({ status: 200, type: [ModalityToggleResponseDto] })
  @ApiResponse({ status: 400, description: 'Unknown modalityId' })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  @Auth(GlobalRole.SELLER)
  @Put('me/modalities')
  setModalities(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetModalitiesDto,
  ) {
    return this.sellersService.setModalities(user.id, dto.modalityIds);
  }

  @ApiOperation({
    summary:
      'List sellers, optionally filtered by status — paginated (default 20/page, max 100)',
  })
  @ApiPaginatedResponse(SellerResponseDto)
  @Auth(GlobalRole.ADMIN)
  @Get()
  findAll(@Query() query: ListSellersQueryDto) {
    return this.sellersService.findAll(query.status, query.page, query.limit);
  }

  @ApiOperation({
    summary: 'Count sellers by ApprovalStatus, platform-wide — admin dashboard',
  })
  @ApiResponse({ status: 200, type: SellerStatusCountsResponseDto })
  @Auth(GlobalRole.ADMIN)
  @Get('status-counts')
  countsByStatus() {
    return this.sellersService.countsByStatus();
  }

  @ApiOperation({ summary: 'Get a single seller by id' })
  @ApiResponse({ status: 200, type: SellerResponseDto })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  @Auth(GlobalRole.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sellersService.findOne(id);
  }

  @ApiOperation({ summary: 'Approve a pending seller' })
  @ApiResponse({ status: 200, type: SellerResponseDto })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  @ApiResponse({ status: 409, description: 'Seller is not pending' })
  @Auth(GlobalRole.ADMIN)
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.sellersService.approve(id);
  }

  @ApiOperation({ summary: 'Reject a pending seller' })
  @ApiResponse({ status: 200, type: SellerResponseDto })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  @ApiResponse({ status: 409, description: 'Seller is not pending' })
  @Auth(GlobalRole.ADMIN)
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.sellersService.reject(id);
  }
}
