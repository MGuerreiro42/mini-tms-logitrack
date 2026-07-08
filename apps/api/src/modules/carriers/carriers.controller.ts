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
import { CarriersService } from './carriers.service';
import { CarrierResponseDto } from './dto/carrier-response.dto';
import { CreateCarrierDto } from './dto/create-carrier.dto';
import { ListCarriersQueryDto } from './dto/list-carriers-query.dto';

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
  @ApiOperation({ summary: 'List carriers, optionally filtered by status' })
  @ApiResponse({ status: 200, type: [CarrierResponseDto] })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Not an admin' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(GlobalRole.ADMIN)
  @Get()
  findAll(@Query() query: ListCarriersQueryDto) {
    return this.carriersService.findAll(query.status);
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
