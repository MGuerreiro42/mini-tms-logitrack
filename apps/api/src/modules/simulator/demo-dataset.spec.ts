import { ShipmentStatus } from '../../../generated/prisma/client';
import { MS_PER_HOUR } from '../../shared/stats/stats';
import { buildDemoShipments, type DemoTenant } from './demo-dataset';

const tenant: DemoTenant = {
  sellerIds: ['seller-1', 'seller-2'],
  carrierId: 'carrier-1',
  carrierUserIds: {
    'carrier@demo.minitms.dev': 'manager',
    'operator1@demo.minitms.dev': 'operator-1',
    'operator2@demo.minitms.dev': 'operator-2',
  },
  modalities: {
    STANDARD: { id: 'standard', slaHours: 72 },
    FULL: { id: 'full', slaHours: 48 },
    EXPRESS: { id: 'express', slaHours: 24 },
  },
};

const NOW = Date.UTC(2026, 10, 3, 12);

const eventsOf = (shipment: ReturnType<typeof buildDemoShipments>[number]) =>
  shipment.trackingEvents?.create as {
    status: ShipmentStatus;
    createdAt: Date;
  }[];

describe('buildDemoShipments', () => {
  it('rebuilds the exact same dataset for the same moment', () => {
    expect(buildDemoShipments(tenant, NOW)).toEqual(
      buildDemoShipments(tenant, NOW),
    );
  });

  // Golden values: a change in the order of the seeded draws shows up here, not only in production data.
  it('draws the same modality, address, owner and age for each shipment', () => {
    const fingerprint = buildDemoShipments(tenant, NOW)
      .slice(0, 6)
      .map((s) => [
        s.trackingCode,
        s.status,
        s.modalityId,
        s.addressCity,
        s.ownerId,
        Math.round((NOW - (s.createdAt as Date).getTime()) / MS_PER_HOUR),
      ]);

    expect(fingerprint).toMatchInlineSnapshot(`
      [
        [
          "TMS-DE0000000001",
          "DELIVERED",
          "full",
          "Santos",
          "operator-1",
          628,
        ],
        [
          "TMS-DE0000000002",
          "DELIVERED",
          "express",
          "Ribeirão Preto",
          "operator-1",
          288,
        ],
        [
          "TMS-DE0000000003",
          "DELIVERED",
          "full",
          "São Paulo",
          "operator-1",
          263,
        ],
        [
          "TMS-DE0000000004",
          "DELIVERED",
          "express",
          "Campinas",
          "operator-1",
          377,
        ],
        [
          "TMS-DE0000000005",
          "DELIVERED",
          "full",
          "São José dos Campos",
          "manager",
          413,
        ],
        [
          "TMS-DE0000000006",
          "DELIVERED",
          "standard",
          "Guarulhos",
          "manager",
          365,
        ],
      ]
    `);
  });

  it('builds the planned mix of statuses with unique tracking codes', () => {
    const shipments = buildDemoShipments(tenant, NOW);
    const count = (status: ShipmentStatus) =>
      shipments.filter((s) => s.status === status).length;

    expect(shipments).toHaveLength(40);
    expect(new Set(shipments.map((s) => s.trackingCode)).size).toBe(40);
    expect(count(ShipmentStatus.DELIVERED)).toBe(20);
    expect(count(ShipmentStatus.PENDING)).toBe(2);
    expect(count(ShipmentStatus.CANCELLED)).toBe(3);
  });

  it('places every event in order and before now, ending on the shipment status', () => {
    for (const shipment of buildDemoShipments(tenant, NOW)) {
      const events = eventsOf(shipment);
      const times = events.map((e) => e.createdAt.getTime());

      expect(times).toEqual([...times].sort((a, b) => a - b));
      expect(Math.max(...times)).toBeLessThanOrEqual(NOW);
      expect(events.at(-1)?.status).toBe(shipment.status);
    }
  });

  it('assigns an owner only once a shipment has been accepted', () => {
    for (const shipment of buildDemoShipments(tenant, NOW)) {
      const accepted = eventsOf(shipment).some(
        (e) => e.status === ShipmentStatus.ACCEPTED,
      );
      expect(shipment.ownerId !== null).toBe(accepted);
    }
  });

  it('shifts the whole dataset with the moment it is built for', () => {
    const later = NOW + 24 * MS_PER_HOUR;
    const [first] = buildDemoShipments(tenant, NOW);
    const [shifted] = buildDemoShipments(tenant, later);

    expect(
      (shifted.createdAt as Date).getTime() -
        (first.createdAt as Date).getTime(),
    ).toBe(later - NOW);
  });
});
