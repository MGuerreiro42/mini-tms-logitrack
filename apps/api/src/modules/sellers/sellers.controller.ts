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
    summary: 'Self-signup público de seller — cria conta com status PENDING',
  })
  @ApiResponse({ status: 201, type: SellerResponseDto })
  @ApiResponse({ status: 400, description: 'DTO inválido' })
  @ApiResponse({ status: 409, description: 'Email ou documento já cadastrado' })
  @Post()
  signup(@Body() dto: CreateSellerDto) {
    return this.sellersService.signup(dto);
  }
}
