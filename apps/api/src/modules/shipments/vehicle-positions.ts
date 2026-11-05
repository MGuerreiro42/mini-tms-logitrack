import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../shared/redis/redis.module';

export interface VehiclePosition {
  lat: number;
  lng: number;
  heading: number | null;
  recordedAt: Date;
}

const POSITION_TTL_MS = 10 * 60 * 1000;

const positionKey = (shipmentId: string) => `vehicle-position:${shipmentId}`;

// Compare and write in one step: devices resend after reconnecting, so pings arrive out of order.
const SET_IF_NEWER = `
local cur = tonumber(redis.call('HGET', KEYS[1], 'recordedAt'))
if cur and cur >= tonumber(ARGV[1]) then return 0 end
redis.call('HSET', KEYS[1], 'recordedAt', ARGV[1], 'lat', ARGV[2], 'lng', ARGV[3], 'heading', ARGV[4])
redis.call('PEXPIRE', KEYS[1], ARGV[5])
return 1`;

@Injectable()
export class VehiclePositions {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // True when this ping became the latest position.
  async saveIfNewer(
    shipmentId: string,
    position: VehiclePosition,
  ): Promise<boolean> {
    const applied = await this.redis.eval(
      SET_IF_NEWER,
      1,
      positionKey(shipmentId),
      position.recordedAt.getTime(),
      position.lat,
      position.lng,
      position.heading ?? '',
      POSITION_TTL_MS,
    );
    return applied === 1;
  }

  async latest(shipmentId: string): Promise<VehiclePosition | null> {
    const stored = await this.redis.hgetall(positionKey(shipmentId));
    if (!stored.recordedAt) return null;
    return {
      lat: Number(stored.lat),
      lng: Number(stored.lng),
      heading: stored.heading ? Number(stored.heading) : null,
      recordedAt: new Date(Number(stored.recordedAt)),
    };
  }
}
