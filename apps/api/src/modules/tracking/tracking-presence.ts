import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PublicTrackingGateway } from './public-tracking.gateway';
import { TrackingGateway } from './tracking.gateway';
import { VIEWER_CONNECTED } from './tracking-events';

// The drive job asks every 2 s and fetchSockets crosses every instance, so an answer is reused briefly.
const PRESENCE_CACHE_MS = 5_000;

export interface SocketCounts {
  internal: number;
  public: number;
}

@Injectable()
export class TrackingPresence {
  private checkedAt = 0;
  private counts: SocketCounts = { internal: 0, public: 0 };
  private inFlight?: Promise<SocketCounts>;

  constructor(
    private readonly gateway: TrackingGateway,
    private readonly publicGateway: PublicTrackingGateway,
  ) {}

  // fetchSockets() goes through the Redis adapter, so it counts every API instance.
  // Concurrent callers (the drive job, the admin pulse) share one round trip.
  socketCounts(): Promise<SocketCounts> {
    if (Date.now() - this.checkedAt < PRESENCE_CACHE_MS) {
      return Promise.resolve(this.counts);
    }
    this.inFlight ??= this.fetchCounts().finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }

  // shortcut: fetchSockets lists every socket of every instance just to count them; upgrade to
  // a Redis counter kept on connect and disconnect once sockets reach the thousands.
  private async fetchCounts(): Promise<SocketCounts> {
    const [sockets, publicSockets] = await Promise.all([
      this.gateway.server.fetchSockets(),
      this.publicGateway.server.fetchSockets(),
    ]);
    this.counts = { internal: sockets.length, public: publicSockets.length };
    this.checkedAt = Date.now();
    return this.counts;
  }

  async hasViewers(): Promise<boolean> {
    const counts = await this.socketCounts();
    return counts.internal + counts.public > 0;
  }

  // A cached "nobody" must not hold back the tick queued for a viewer who just arrived.
  @OnEvent(VIEWER_CONNECTED)
  forget(): void {
    this.checkedAt = 0;
  }
}
