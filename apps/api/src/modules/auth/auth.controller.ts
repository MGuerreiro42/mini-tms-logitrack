import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Auth } from './decorators/auth.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  AuthenticatedUserDto,
  LoginResponseDto,
} from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Authenticates with email/password and returns a JWT',
  })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid DTO' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @ApiOperation({ summary: 'Returns the currently authenticated user' })
  @ApiResponse({ status: 200, type: AuthenticatedUserDto })
  @Auth()
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
