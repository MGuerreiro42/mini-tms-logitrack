import { Inject, Injectable } from '@nestjs/common';
import type { Redis, Result } from 'ioredis';
import { REDIS_CLIENT } from '../../shared/redis/redis.module';

export interface VehiclePosition {
  lat: number;
  lng: number;
  heading: number | null;
  recordedAt: Date;
}

// A reading older than this no longer describes the vehicle: refused on ingestion, expired in storage.
export const POSITION_MAX_AGE_MS = 10 * 60 * 1000;

const positionKey = (shipmentId: string) => `vehicle-position:${shipmentId}`;

// Compare and write in one step: devices resend after reconnecting, so pings arrive out of order.
const SET_IF_NEWER = `
local cur = tonumber(redis.call('HGET', KEYS[1], 'recordedAt'))
if cur and cur >= tonumber(ARGV[1]) then return 0 end
redis.call('HSET', KEYS[1], 'recordedAt', ARGV[1], 'lat', ARGV[2], 'lng', ARGV[3], 'heading', ARGV[4])
redis.call('PEXPIREAT', KEYS[1], ARGV[5])
return 1`;

declare module 'ioredis' {
  interface RedisCommander<Context> {
    setVehiclePositionIfNewer(
      key: string,
      ...args: (string | number)[]
    ): Result<number, Context>;
  }
}

@Injectable()
export class VehiclePositions {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    // Sent once and then run by its SHA (EVALSHA), not resent with every ping.
    redis.defineCommand('setVehiclePositionIfNewer', {
      numberOfKeys: 1,
      lua: SET_IF_NEWER,
    });
  }

  // True when this ping became the latest position.
  async saveIfNewer(
    shipmentId: string,
    position: VehiclePosition,
  ): Promise<boolean> {
    const recordedAt = position.recordedAt.getTime();
    const applied = await this.redis.setVehiclePositionIfNewer(
      positionKey(shipmentId),
      recordedAt,
      position.lat,
      position.lng,
      position.heading ?? '',
      // Expires with the reading's age, not the write's, so a stored position is never older than this.
      recordedAt + POSITION_MAX_AGE_MS,
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
