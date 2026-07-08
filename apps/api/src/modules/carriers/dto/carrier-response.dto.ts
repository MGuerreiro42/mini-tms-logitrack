import { ApiProperty } from '@nestjs/swagger';

export class CarrierResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({
    description: "The manager's email (User.email via CarrierUser)",
  })
  email: string;

  @ApiProperty()
  companyName: string;

  @ApiProperty()
  document: string;

  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  status: string;

  @ApiProperty({
    description: 'Number of CarrierUser accounts (manager + operators)',
  })
  userCount: number;

  @ApiProperty()
  createdAt: Date;
}
