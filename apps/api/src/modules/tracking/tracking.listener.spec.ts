import type { ShipmentStatusChangedEvent } from '../shipments/shipment-events';
import type { TrackingGateway } from './tracking.gateway';
import { TrackingListener } from './tracking.listener';

describe('TrackingListener', () => {
  it('fans out shipment:updated to both the shipment room and the carrier room', () => {
    const emit = vi.fn();
    const to = vi.fn(() => ({ emit }));
    const gateway = { server: { to } } as unknown as TrackingGateway;
    const listener = new TrackingListener(gateway);

    const event: ShipmentStatusChangedEvent = {
      shipmentId: 'shipment-1',
      carrierId: 'carrier-1',
      sellerId: 'seller-1',
      status: 'ACCEPTED',
      trackingCode: 'TMS-ABC123',
    };

    listener.handleShipmentStatusChanged(event);

    expect(to).toHaveBeenCalledWith('shipment:shipment-1');
    expect(to).toHaveBeenCalledWith('carrier:carrier-1');
    expect(to).toHaveBeenCalledWith('admin:monitoring');
    expect(emit).toHaveBeenCalledWith('shipment:updated', event);
    expect(emit).toHaveBeenCalledTimes(3);
  });
});
