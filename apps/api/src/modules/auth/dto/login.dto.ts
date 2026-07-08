import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@minitms.dev' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin12345', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
