import { ApiProperty } from '@nestjs/swagger';

export class EligibleCarrierResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyName: string;
}
