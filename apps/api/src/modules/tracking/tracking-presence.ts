import { Injectable } from '@nestjs/common';
import { PublicTrackingGateway } from './public-tracking.gateway';
import { TrackingGateway } from './tracking.gateway';

@Injectable()
export class TrackingPresence {
  constructor(
    private readonly gateway: TrackingGateway,
    private readonly publicGateway: PublicTrackingGateway,
  ) {}

  // fetchSockets() goes through the Redis adapter, so it counts every API instance.
  async hasViewers(): Promise<boolean> {
    const [sockets, publicSockets] = await Promise.all([
      this.gateway.server.fetchSockets(),
      this.publicGateway.server.fetchSockets(),
    ]);
    return sockets.length + publicSockets.length > 0;
  }
}
