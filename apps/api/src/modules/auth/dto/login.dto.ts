import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { toLowerTrimmed } from '../../../shared/transforms/normalize';

export class LoginDto {
  @ApiProperty({ example: 'admin@minitms.dev' })
  // Normalized at login too, or differently cased emails would miss the exact-match lookup.
  @Transform(toLowerTrimmed)
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin12345', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
