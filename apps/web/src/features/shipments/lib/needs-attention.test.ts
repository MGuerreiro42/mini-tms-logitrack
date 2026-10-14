import type { Shipment, ShipmentStatus } from '../types';
import { needsAttention } from './needs-attention';

const now = new Date('2026-10-14T12:00:00.000Z');

function shipment(
  id: string,
  status: ShipmentStatus,
  dueAt: string | null,
): Shipment {
  return {
    id,
    trackingCode: `TMS-${id}`,
    status,
    dueAt,
    carrierId: 'carrier-1',
    carrierName: 'Fast Carrier',
    modalityId: 'modality-1',
    modalityName: 'Standard',
    addressStreet: 'Av. Paulista',
    addressNumber: '1000',
    addressComplement: null,
    addressNeighborhood: 'Bela Vista',
    addressCity: 'São Paulo',
    addressState: 'SP',
    addressZipCode: '01310-100',
    createdAt: '2026-10-10T12:00:00.000Z',
  };
}

describe('needsAttention', () => {
  it('lists failed deliveries first, then late shipments most overdue first', () => {
    const items = needsAttention(
      [
        shipment('on-time', 'IN_TRANSIT', '2026-10-15T12:00:00.000Z'),
        shipment('late-2h', 'ACCEPTED', '2026-10-14T10:00:00.000Z'),
        shipment('failed', 'FAILED_DELIVERY', '2026-10-13T12:00:00.000Z'),
        shipment('late-1d', 'PENDING', '2026-10-13T12:00:00.000Z'),
        shipment('no-sla', 'PENDING', null),
      ],
      now,
    );

    expect(items.map(({ shipment, reason }) => [shipment.id, reason])).toEqual([
      ['failed', 'failed'],
      ['late-1d', 'late'],
      ['late-2h', 'late'],
    ]);
    expect(items[2].sla.label).toBe('2 h late');
  });
});
