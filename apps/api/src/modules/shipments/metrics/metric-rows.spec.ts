import { ShipmentStatus } from '../../../../generated/prisma/client';
import { toMetricRows } from './metric-rows';

const at = (hours: number) =>
  new Date(Date.UTC(2026, 0, 1) + hours * 3_600_000);
const event = (status: ShipmentStatus, hours: number, shipmentId = 'a') => ({
  shipmentId,
  status,
  createdAt: at(hours),
});
const shipment = (id: string) => ({
  id,
  createdAt: at(0),
  status: ShipmentStatus.RETURNED,
  dueAt: null,
  deliveredAt: null,
  modality: { code: 'EXPRESS', name: 'Express', slaHours: 48 },
});

describe('toMetricRows', () => {
  it('reads the claim time, the failure and the happy-path stages from history', () => {
    const [row, empty] = toMetricRows(
      [shipment('a'), shipment('b')],
      [
        event(ShipmentStatus.PENDING, 0),
        event(ShipmentStatus.ACCEPTED, 1),
        event(ShipmentStatus.COLLECTED, 3),
        event(ShipmentStatus.IN_TRANSIT, 4),
        event(ShipmentStatus.OUT_FOR_DELIVERY, 8),
        event(ShipmentStatus.FAILED_DELIVERY, 9),
        event(ShipmentStatus.RETURNED, 12),
      ],
    );

    expect(row.acceptedAt).toEqual(at(1));
    expect(row.everFailed).toBe(true);
    // OUT_FOR_DELIVERY → FAILED_DELIVERY is not a happy-path pair.
    expect(row.stages).toEqual([
      { status: ShipmentStatus.PENDING, hours: 1 },
      { status: ShipmentStatus.ACCEPTED, hours: 2 },
      { status: ShipmentStatus.COLLECTED, hours: 1 },
      { status: ShipmentStatus.IN_TRANSIT, hours: 4 },
    ]);
    expect(empty).toMatchObject({
      acceptedAt: null,
      everFailed: false,
      stages: [],
    });
    expect(row).not.toHaveProperty('id');
  });
});
