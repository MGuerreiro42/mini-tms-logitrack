import type { ShipmentStatus } from '@/types/status';
import type { MapStage } from '../types';

const STAGES: Partial<Record<ShipmentStatus, MapStage>> = {
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DONE',
};

const CAPTIONS: Record<MapStage, (city: string) => string> = {
  IN_TRANSIT: (city) => `On the way to ${city}`,
  OUT_FOR_DELIVERY: (city) => `Out for delivery in ${city}`,
  DONE: (city) => `Delivered in ${city}`,
};

// Only the road stages and the delivered route have anything to draw.
export function mapStage(status: ShipmentStatus): MapStage | null {
  return STAGES[status] ?? null;
}

export function mapCaption(stage: MapStage, city: string): string {
  return CAPTIONS[stage](city);
}
