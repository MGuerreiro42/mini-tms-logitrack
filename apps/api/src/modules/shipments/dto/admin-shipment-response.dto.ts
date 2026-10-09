import { ApiProperty } from '@nestjs/swagger';
import { CarrierShipmentResponseDto } from './carrier-shipment-response.dto';

export class AdminShipmentResponseDto extends CarrierShipmentResponseDto {
  @ApiProperty({ description: "The assigned carrier's company name" })
  carrierCompanyName: string;
}
