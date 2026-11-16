import { ApiProperty } from '@nestjs/swagger';

export class SellerViewCountsResponseDto {
  @ApiProperty()
  active: number;

  @ApiProperty()
  exceptions: number;

  @ApiProperty()
  done: number;
}

export class AdminViewCountsResponseDto extends SellerViewCountsResponseDto {}

export class CarrierViewCountsResponseDto {
  @ApiProperty()
  mine: number;

  @ApiProperty()
  unclaimed: number;

  @ApiProperty()
  to_pick_up: number;

  @ApiProperty()
  on_the_road: number;

  @ApiProperty()
  exceptions: number;

  @ApiProperty()
  done: number;
}
