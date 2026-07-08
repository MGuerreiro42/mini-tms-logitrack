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
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateSellerDto } from './dto/create-seller.dto';
import { ListSellersQueryDto } from './dto/list-sellers-query.dto';
import { SellerResponseDto } from './dto/seller-response.dto';
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
  @ApiOperation({ summary: 'List sellers, optionally filtered by status' })
  @ApiResponse({ status: 200, type: [SellerResponseDto] })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not an admin' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.ADMIN)
  @Get()
  findAll(@Query() query: ListSellersQueryDto) {
    return this.sellersService.findAll(query.status);
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
