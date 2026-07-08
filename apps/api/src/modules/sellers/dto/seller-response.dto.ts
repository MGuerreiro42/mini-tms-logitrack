import { ApiProperty } from '@nestjs/swagger';

export class SellerResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  companyName: string;

  @ApiProperty()
  document: string;

  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  status: string;

  @ApiProperty()
  createdAt: Date;
}
