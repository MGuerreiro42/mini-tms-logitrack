import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateSellerDto } from './dto/create-seller.dto';
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
}
