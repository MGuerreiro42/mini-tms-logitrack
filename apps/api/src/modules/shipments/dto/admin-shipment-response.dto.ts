import { ApiProperty } from '@nestjs/swagger';
import { CarrierShipmentResponseDto } from './carrier-shipment-response.dto';

// The admin-facing counterpart to CarrierShipmentResponseDto — same shape
// (seller info already included there) plus the carrier's own name, since an
// admin viewing platform-wide traffic has no "my own carrier" context to
// already know it from, unlike the carrier queue this shape was built for.
export class AdminShipmentResponseDto extends CarrierShipmentResponseDto {
  @ApiProperty({ description: "The assigned carrier's company name" })
  carrierCompanyName: string;
}
