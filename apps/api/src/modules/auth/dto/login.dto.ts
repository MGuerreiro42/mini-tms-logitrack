import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { toLowerTrimmed } from '../../../shared/transforms/normalize';

export class LoginDto {
  @ApiProperty({ example: 'admin@minitms.dev' })
  // Normalized here, not just at signup — email is a case-insensitive
  // identifier by convention, and the unique constraint/lookup treat it as
  // an exact string match, so "User@Example.com" and "user@example.com"
  // would otherwise be two different accounts.
  @Transform(toLowerTrimmed)
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin12345', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
