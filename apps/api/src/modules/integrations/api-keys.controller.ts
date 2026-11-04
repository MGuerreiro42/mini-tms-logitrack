import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GlobalRole } from '../../../generated/prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ApiKeysService } from './api-keys.service';
import {
  ApiKeyResponseDto,
  CreatedApiKeyResponseDto,
} from './dto/api-key-response.dto';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@ApiTags('api-keys')
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @ApiOperation({
    summary:
      'Create an API key for the public API — the full key is returned only in this response',
  })
  @ApiResponse({ status: 201, type: CreatedApiKeyResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid DTO or seller not approved',
  })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  @Auth(GlobalRole.SELLER)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateApiKeyDto) {
    return this.apiKeysService.create(user.id, dto);
  }

  @ApiOperation({
    summary: "List the authenticated seller's active API keys, newest first",
  })
  @ApiResponse({ status: 200, type: [ApiKeyResponseDto] })
  @Auth(GlobalRole.SELLER)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.apiKeysService.findAll(user.id);
  }

  @ApiOperation({ summary: 'Revoke an API key — it stops working at once' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'API key not found' })
  @Auth(GlobalRole.SELLER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  revoke(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.apiKeysService.revoke(user.id, id);
  }
}
