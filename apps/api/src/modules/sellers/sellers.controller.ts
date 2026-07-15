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
import { CreateSellerDto } from './dto/create-seller.dto';
import { ListSellersQueryDto } from './dto/list-sellers-query.dto';
import { SellerResponseDto } from './dto/seller-response.dto';
import { SetModalitiesDto } from './dto/set-modalities.dto';
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

  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the authenticated seller's own record" })
  @ApiResponse({ status: 200, type: SellerResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not a seller' })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.SELLER)
  @Get('me')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.sellersService.findByUserId(user.id);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'List the full modality catalog with an enabled flag for the authenticated seller',
  })
  @ApiResponse({ status: 200, type: [ModalityToggleResponseDto] })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not a seller' })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.SELLER)
  @Get('me/modalities')
  getModalities(@CurrentUser() user: AuthenticatedUser) {
    return this.sellersService.getModalities(user.id);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Replace the authenticated seller's enabled modality set (full replace, not incremental)",
  })
  @ApiResponse({ status: 200, type: [ModalityToggleResponseDto] })
  @ApiResponse({ status: 400, description: 'Unknown modalityId' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not a seller' })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.SELLER)
  @Put('me/modalities')
  setModalities(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetModalitiesDto,
  ) {
    return this.sellersService.setModalities(user.id, dto.modalityIds);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'List sellers, optionally filtered by status — paginated (default 20/page, max 100)',
  })
  @ApiPaginatedResponse(SellerResponseDto)
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not an admin' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.ADMIN)
  @Get()
  findAll(@Query() query: ListSellersQueryDto) {
    return this.sellersService.findAll(query.status, query.page, query.limit);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single seller by id' })
  @ApiResponse({ status: 200, type: SellerResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not an admin' })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sellersService.findOne(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a pending seller' })
  @ApiResponse({ status: 200, type: SellerResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not an admin' })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  @ApiResponse({ status: 409, description: 'Seller is not pending' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.ADMIN)
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.sellersService.approve(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a pending seller' })
  @ApiResponse({ status: 200, type: SellerResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not an admin' })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  @ApiResponse({ status: 409, description: 'Seller is not pending' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.ADMIN)
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.sellersService.reject(id);
  }
}
