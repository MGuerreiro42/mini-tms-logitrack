import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShipmentAddressDto {
  @ApiProperty()
  addressStreet: string;

  @ApiProperty()
  addressNumber: string;

  @ApiPropertyOptional({ nullable: true })
  addressComplement: string | null;

  @ApiProperty()
  addressNeighborhood: string;

  @ApiProperty()
  addressCity: string;

  @ApiProperty()
  addressState: string;

  @ApiProperty()
  addressZipCode: string;
}
