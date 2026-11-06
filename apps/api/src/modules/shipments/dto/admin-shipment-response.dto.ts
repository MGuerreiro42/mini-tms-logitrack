import { ApiProperty } from '@nestjs/swagger';
import { CarrierShipmentResponseDto } from './carrier-shipment-response.dto';
import { TrackingEventDto } from './tracking-event.dto';

export class AdminShipmentResponseDto extends CarrierShipmentResponseDto {
  @ApiProperty({ description: "The assigned carrier's company name" })
  carrierCompanyName: string;
}

export class AdminShipmentDetailResponseDto extends AdminShipmentResponseDto {
  @ApiProperty({ type: [TrackingEventDto] })
  trackingEvents: TrackingEventDto[];
}
