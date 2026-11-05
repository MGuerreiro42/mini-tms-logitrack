import { ApiProperty } from '@nestjs/swagger';
import type { LngLat } from '../route-geometry';

const LNG_LAT = {
  type: 'array',
  items: { type: 'number' },
  minItems: 2,
  maxItems: 2,
} as const;

const ROUTE = {
  type: 'array',
  items: LNG_LAT,
  description: 'Street route from the demo hub as [lng, lat] points',
} as const;

export class LastPositionDto {
  @ApiProperty()
  lat: number;

  @ApiProperty()
  lng: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Compass heading in degrees, when the device reported one',
  })
  heading: number | null;

  @ApiProperty()
  recordedAt: Date;
}

export class ShipmentMapDto {
  @ApiProperty(ROUTE)
  route: LngLat[];

  @ApiProperty({
    description:
      'Index of the first point inside the destination city: IN_TRANSIT ends there, OUT_FOR_DELIVERY starts',
  })
  splitIndex: number;

  @ApiProperty({ ...LNG_LAT, description: 'Geocoded address as [lng, lat]' })
  destination: LngLat;
}

// No address coordinates: the route stops where the destination city starts.
export class PublicShipmentMapDto {
  @ApiProperty({
    ...ROUTE,
    description: `${ROUTE.description}, up to the destination city`,
  })
  route: LngLat[];

  @ApiProperty()
  city: string;

  @ApiProperty({
    ...LNG_LAT,
    description: 'City center as [lng, lat], rounded to 2 decimal places',
  })
  cityCenter: LngLat;
}

export class LiveMapDto {
  @ApiProperty({
    type: ShipmentMapDto,
    nullable: true,
    description: 'Null when the address has no stored route',
  })
  map: ShipmentMapDto | null;

  @ApiProperty({
    type: LastPositionDto,
    nullable: true,
    description:
      'Latest reported position; only while IN_TRANSIT or OUT_FOR_DELIVERY, gone 10 minutes after the last ping',
  })
  lastPosition: LastPositionDto | null;
}

export class PublicLiveMapDto {
  @ApiProperty({
    type: PublicShipmentMapDto,
    nullable: true,
    description: 'Null when the address has no stored route',
  })
  map: PublicShipmentMapDto | null;

  @ApiProperty({
    type: LastPositionDto,
    nullable: true,
    description:
      'Latest reported position; only while IN_TRANSIT and at least 1.5 km from the destination',
  })
  lastPosition: LastPositionDto | null;
}
