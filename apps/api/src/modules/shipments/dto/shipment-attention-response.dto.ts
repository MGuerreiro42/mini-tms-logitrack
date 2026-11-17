import { ApiProperty } from '@nestjs/swagger';
import { ShipmentResponseDto } from './shipment-response.dto';

export class ShipmentAttentionCountsDto {
  @ApiProperty({ description: 'Shipments in FAILED_DELIVERY' })
  failed: number;

  @ApiProperty({
    description: 'Open shipments past createdAt + modality.slaHours',
  })
  late: number;

  @ApiProperty({
    description: 'PENDING with no owner, created more than 2 h ago',
  })
  waiting: number;
}

export class AttentionReasonDto {
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'A reason code; null until reason codes exist',
  })
  code: string | null;

  @ApiProperty({ description: 'The note of the last FAILED_DELIVERY event' })
  text: string;
}

export class AttentionItemDto {
  @ApiProperty({ type: ShipmentResponseDto })
  shipment: ShipmentResponseDto;

  @ApiProperty({
    description:
      'dueAt (late), the last failure (failed) or createdAt (waiting)',
  })
  since: Date;

  @ApiProperty({ type: AttentionReasonDto, nullable: true })
  reason: AttentionReasonDto | null;
}

export class AttentionGroupDto {
  @ApiProperty({
    description: 'late, failed or waiting today; an open set, more may come',
  })
  type: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ enum: ['carrier', 'seller', 'recipient', 'unknown'] })
  owner: 'carrier' | 'seller' | 'recipient' | 'unknown';

  @ApiProperty({ description: 'Exact; equals the list href opens' })
  count: number;

  @ApiProperty({
    example: '?view=late&window=30d',
    description: 'The shipment list query whose total equals count',
  })
  href: string;

  @ApiProperty({
    type: [AttentionItemDto],
    description: 'At most 5, most urgent first',
  })
  items: AttentionItemDto[];
}

export class ShipmentAttentionResponseDto {
  @ApiProperty({
    type: [ShipmentResponseDto],
    description: 'Failed deliveries first, then late shipments, at most 5',
  })
  shipments: ShipmentResponseDto[];

  @ApiProperty({ type: ShipmentAttentionCountsDto })
  counts: ShipmentAttentionCountsDto;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'dueAt of the most overdue late shipment; null when none',
  })
  oldestLateDueAt: Date | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'createdAt of the oldest PENDING shipment; null when none',
  })
  oldestPendingAt: Date | null;

  @ApiProperty({
    type: [AttentionGroupDto],
    description: 'Late, then failed, then waiting; empty groups left out',
  })
  groups: AttentionGroupDto[];
}
