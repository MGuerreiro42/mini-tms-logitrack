import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PublicTrackingGateway } from './public-tracking.gateway';
import { TrackingGateway } from './tracking.gateway';
import { VIEWER_CONNECTED } from './tracking-events';

// The drive job asks every 2 s and fetchSockets crosses every instance, so an answer is reused briefly.
const PRESENCE_CACHE_MS = 5_000;

@Injectable()
export class TrackingPresence {
  private checkedAt = 0;
  private viewers = false;

  constructor(
    private readonly gateway: TrackingGateway,
    private readonly publicGateway: PublicTrackingGateway,
  ) {}

  // fetchSockets() goes through the Redis adapter, so it counts every API instance.
  async hasViewers(): Promise<boolean> {
    if (Date.now() - this.checkedAt < PRESENCE_CACHE_MS) return this.viewers;

    const [sockets, publicSockets] = await Promise.all([
      this.gateway.server.fetchSockets(),
      this.publicGateway.server.fetchSockets(),
    ]);
    this.viewers = sockets.length + publicSockets.length > 0;
    this.checkedAt = Date.now();
    return this.viewers;
  }

  // A cached "nobody" must not hold back the tick queued for a viewer who just arrived.
  @OnEvent(VIEWER_CONNECTED)
  forget(): void {
    this.checkedAt = 0;
  }
}
