import type { ShipmentUpdatedEvent } from '../shipments/shipment-events';
import type { PublicTrackingGateway } from './public-tracking.gateway';
import type { TrackingGateway } from './tracking.gateway';
import { TrackingListener } from './tracking.listener';

describe('TrackingListener', () => {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  const publicEmit = vi.fn();
  const publicTo = vi.fn(() => ({ emit: publicEmit }));

  const event: ShipmentUpdatedEvent = {
    shipmentId: 'shipment-1',
    carrierId: 'carrier-1',
    sellerId: 'seller-1',
    status: 'ACCEPTED',
    trackingCode: 'TMS-ABC123',
  };

  let listener: TrackingListener;

  beforeEach(() => {
    emit.mockReset();
    to.mockClear();
    publicEmit.mockReset();
    publicTo.mockClear();
    listener = new TrackingListener(
      { server: { to } } as unknown as TrackingGateway,
      { server: { to: publicTo } } as unknown as PublicTrackingGateway,
    );
  });

  it('broadcasts shipment:updated once over the shipment, carrier and admin rooms', () => {
    listener.handleShipmentUpdated(event);

    expect(to).toHaveBeenCalledTimes(1);
    expect(to).toHaveBeenCalledWith([
      'shipment:shipment-1',
      'carrier:carrier-1',
      'admin:monitoring',
    ]);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('shipment:updated', event);
  });

  it('emits only trackingCode and status to the public tracking room', () => {
    listener.handleShipmentUpdated(event);

    expect(publicTo).toHaveBeenCalledWith('tracking:TMS-ABC123');
    expect(publicEmit).toHaveBeenCalledWith('tracking:updated', {
      trackingCode: 'TMS-ABC123',
      status: 'ACCEPTED',
    });
    expect(publicEmit).toHaveBeenCalledTimes(1);
  });
});
