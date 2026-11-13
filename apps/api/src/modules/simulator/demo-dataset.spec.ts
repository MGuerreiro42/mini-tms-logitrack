import { ShipmentStatus } from '../../../generated/prisma/client';
import { MS_PER_HOUR } from '../../shared/stats/stats';
import { deliveryMetrics } from '../shipments/metrics/delivery-metrics';
import { toMetricRows } from '../shipments/metrics/metric-rows';
import { OPEN_STATUSES } from '../shipments/shipment-views';
import {
  buildDemoShipments,
  DEMO_ADDRESSES,
  DEMO_EXTRA_CARRIERS,
  type DemoTenant,
} from './demo-dataset';
import { STAGE_DURATION_MS } from './simulator.constants';

const tenant: DemoTenant = {
  sellerIds: ['seller-1', 'seller-2'],
  sellerUserIds: ['seller-user-1', 'seller-user-2'],
  carrierId: 'carrier-1',
  carrierUserIds: {
    'carrier@demo.minitms.dev': 'manager',
    'operator1@demo.minitms.dev': 'operator-1',
    'operator2@demo.minitms.dev': 'operator-2',
  },
  memberUserIds: {
    'carrier@demo.minitms.dev': 'manager-user',
    'operator1@demo.minitms.dev': 'operator-user-1',
    'operator2@demo.minitms.dev': 'operator-user-2',
  },
  extraCarriers: {
    'Rápido Paulista': {
      carrierId: 'rapido',
      ownerId: 'rapido-manager',
      ownerUserId: 'rapido-user',
    },
    EconoLog: {
      carrierId: 'econolog',
      ownerId: 'econolog-manager',
      ownerUserId: 'econolog-user',
    },
  },
  modalities: {
    STANDARD: { id: 'standard', slaHours: 72 },
    FULL: { id: 'full', slaHours: 48 },
    EXPRESS: { id: 'express', slaHours: 24 },
  },
};

const NOW = Date.UTC(2026, 10, 3, 12);
const DAY_MS = 24 * MS_PER_HOUR;
const lojaDemo = () =>
  buildDemoShipments(tenant, NOW).filter(
    ({ shipment }) => shipment.sellerId === 'seller-1',
  );
const tally = <T>(items: T[], key: (item: T) => string) => {
  const counts: Record<string, number> = {};
  for (const item of items) counts[key(item)] = (counts[key(item)] ?? 0) + 1;
  return counts;
};

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
      .map(({ shipment }) => [
        shipment.trackingCode,
        shipment.status,
        shipment.modalityId,
        shipment.addressCity,
        shipment.ownerId,
        Math.round((NOW - shipment.createdAt.getTime()) / MS_PER_HOUR),
      ]);

    expect(fingerprint).toMatchInlineSnapshot(`
      [
        [
          "TMS-DE0000000001",
          "DELIVERED",
          "express",
          "São Paulo",
          "rapido-manager",
          2145,
        ],
        [
          "TMS-DE0000000002",
          "DELIVERED",
          "express",
          "Campinas",
          "rapido-manager",
          2133,
        ],
        [
          "TMS-DE0000000003",
          "DELIVERED",
          "full",
          "Campinas",
          "operator-1",
          2126,
        ],
        [
          "TMS-DE0000000004",
          "DELIVERED",
          "full",
          "Ribeirão Preto",
          "operator-2",
          2118,
        ],
        [
          "TMS-DE0000000005",
          "DELIVERED",
          "full",
          "Santos",
          "operator-2",
          2106,
        ],
        [
          "TMS-DE0000000006",
          "DELIVERED",
          "standard",
          "São Paulo",
          "manager",
          2104,
        ],
      ]
    `);
  });

  it('builds 180 shipments for Loja Demo and 30 for Casa & Cia, with unique tracking codes', () => {
    const shipments = buildDemoShipments(tenant, NOW).map((d) => d.shipment);

    expect(shipments).toHaveLength(210);
    expect(new Set(shipments.map((s) => s.trackingCode)).size).toBe(210);
    expect(tally(shipments, (s) => s.sellerId)).toEqual({
      'seller-1': 180,
      'seller-2': 30,
    });
  });

  it('gives Loja Demo the status mix of spec 10 FR-001', () => {
    const shipments = lojaDemo().map((d) => d.shipment);
    const dueIn = (s: (typeof shipments)[number]) =>
      ((s.dueAt as Date).getTime() - NOW) / MS_PER_HOUR;
    const open = shipments.filter((s) =>
      OPEN_STATUSES.includes(s.status as ShipmentStatus),
    );
    const late = open.filter((s) => dueIn(s) < 0);
    const dueSoon = open.filter((s) => {
      const slaHours = dueIn(s) + (NOW - s.createdAt.getTime()) / MS_PER_HOUR;
      return dueIn(s) >= 0 && dueIn(s) <= Math.max(slaHours / 4, 6);
    });

    expect(tally(shipments, (s) => s.status as string)).toEqual({
      DELIVERED: 150,
      FAILED_DELIVERY: 3,
      RETURNED: 6,
      CANCELLED: 5,
      PENDING: 3,
      ACCEPTED: 3,
      COLLECTED: 2,
      IN_TRANSIT: 5,
      OUT_FOR_DELIVERY: 3,
    });
    expect(late.map((s) => Math.round(-dueIn(s))).sort()).toEqual([2, 7]);
    expect(dueSoon).toHaveLength(3);
  });

  it('delivers 137 of 150 on time, split by modality and UF as in spec 10 FR-001', () => {
    const delivered = lojaDemo()
      .map((d) => d.shipment)
      .filter((s) => s.status === ShipmentStatus.DELIVERED);
    const onTime = delivered.filter(
      (s) => (s.deliveredAt as Date) <= (s.dueAt as Date),
    );

    expect(onTime).toHaveLength(137);
    expect(tally(delivered, (s) => s.modalityId)).toEqual({
      standard: 80,
      full: 40,
      express: 30,
    });
    expect(tally(onTime, (s) => s.modalityId)).toEqual({
      standard: 74,
      full: 36,
      express: 27,
    });
    expect(tally(delivered, (s) => s.addressState)).toEqual({
      SP: 96,
      RJ: 27,
      MG: 18,
      PR: 9,
    });
    expect(tally(onTime, (s) => s.addressState)).toEqual({
      SP: 90,
      RJ: 24,
      MG: 16,
      PR: 7,
    });
  });

  it('creates the non-cancelled shipments at the planned weekly counts', () => {
    const since = NOW - 90 * DAY_MS;
    const weekly = Array.from({ length: 13 }, () => 0);
    for (const { shipment } of lojaDemo()) {
      if (shipment.status === ShipmentStatus.CANCELLED) continue;
      weekly[
        Math.floor((shipment.createdAt.getTime() - since) / (7 * DAY_MS))
      ]++;
    }

    expect(weekly).toEqual([
      11, 12, 12, 13, 12, 13, 13, 14, 14, 14, 16, 15, 16,
    ]);
  });

  it('lands the stage medians within 15 % of spec 10 FR-004', () => {
    const demo = lojaDemo();
    // Stage times come from the events alone; the rest of a metric row is irrelevant here.
    const rows = toMetricRows(
      demo.map(({ shipment }) => ({
        ...shipment,
        id: shipment.trackingCode,
        modality: { slaHours: null },
      })) as never,
      demo.flatMap(({ shipment, events }) =>
        events.map((event) => ({
          ...event,
          shipmentId: shipment.trackingCode,
        })),
      ),
    );
    const { stages } = deliveryMetrics(rows, {
      since: new Date(NOW - 90 * DAY_MS),
      now: new Date(NOW),
    });
    const expected = [1.5, 9, 3, 22, 5];

    stages.forEach((stage, i) => {
      expect(stage.p50Hours).toBeGreaterThanOrEqual(expected[i] * 0.85);
      expect(stage.p50Hours).toBeLessThanOrEqual(expected[i] * 1.15);
    });
  });

  it('sends far UFs to EconoLog, SP Express to Rápido Paulista and open shipments to the live-map addresses', () => {
    const [rapido] = DEMO_EXTRA_CARRIERS;
    const routed = new Set<string>(DEMO_ADDRESSES.map((a) => a.zipCode));
    for (const { shipment } of buildDemoShipments(tenant, NOW)) {
      if (shipment.addressState !== 'SP') {
        expect(shipment.carrierId).toBe('econolog');
        expect(shipment.modalityId).not.toBe('express');
      } else if (shipment.modalityId === 'express') {
        expect(shipment.carrierId).toBe('rapido');
        expect(rapido.cities).toContain(shipment.addressCity);
      } else {
        expect(shipment.carrierId).toBe('carrier-1');
      }
      if (shipment.deliveredAt === null && shipment.status !== 'CANCELLED') {
        expect(routed.has(shipment.addressZipCode)).toBe(
          shipment.addressState === 'SP',
        );
      }
    }
  });

  it('notes every failed attempt with one of the failure reasons', () => {
    const notes = buildDemoShipments(tenant, NOW).flatMap(({ events }) =>
      events
        .filter((e) => e.status === ShipmentStatus.FAILED_DELIVERY)
        .map((e) => e.note),
    );

    expect(notes).toHaveLength(9 + 2);
    expect(new Set(notes)).toEqual(
      new Set([
        'Recipient not at home',
        'Address not found',
        'Business closed',
      ]),
    );
  });

  it('places every event in order and before now, ending on the shipment status', () => {
    for (const { shipment, events } of buildDemoShipments(tenant, NOW)) {
      const times = events.map((e) => e.createdAt.getTime());

      expect(times).toEqual([...times].sort((a, b) => a - b));
      expect(Math.max(...times)).toBeLessThanOrEqual(NOW);
      expect(events.at(-1)?.status).toBe(shipment.status);
    }
  });

  it('starts each seeded vehicle somewhere along its road stage', () => {
    const onTheRoad = buildDemoShipments(tenant, NOW).flatMap(
      ({ shipment, events }) => {
        const stageMs = shipment.status && STAGE_DURATION_MS[shipment.status];
        return stageMs ? [{ stageMs, events }] : [];
      },
    );

    expect(onTheRoad).not.toHaveLength(0);
    for (const { stageMs, events } of onTheRoad) {
      const stageStart = events.at(-1)?.createdAt.getTime() ?? 0;
      expect(NOW - stageStart).toBeLessThanOrEqual(stageMs);
    }
  });

  it('assigns an owner only once a shipment has been accepted', () => {
    for (const { shipment, events } of buildDemoShipments(tenant, NOW)) {
      const accepted = events.some((e) => e.status === ShipmentStatus.ACCEPTED);
      expect(shipment.ownerId !== null).toBe(accepted);
    }
  });

  it('stores the due date and the delivery moment as live creation does', () => {
    const slaHours = { standard: 72, full: 48, express: 24 };
    for (const { shipment, events } of buildDemoShipments(tenant, NOW)) {
      const sla = slaHours[shipment.modalityId as keyof typeof slaHours];
      expect(shipment.dueAt).toEqual(
        new Date(shipment.createdAt.getTime() + sla * MS_PER_HOUR),
      );
      expect(shipment.deliveredAt ?? null).toEqual(
        events.find((e) => e.status === ShipmentStatus.DELIVERED)?.createdAt ??
          null,
      );
    }
  });

  it('records the seller as the actor of opening and cancelling, the owner of the rest', () => {
    const memberUser = Object.fromEntries([
      ...Object.entries(tenant.carrierUserIds).map(([email, id]) => [
        id,
        tenant.memberUserIds[email as keyof typeof tenant.memberUserIds],
      ]),
      ...Object.values(tenant.extraCarriers).map((extra) => [
        extra.ownerId,
        extra.ownerUserId,
      ]),
    ]);
    for (const { shipment, events } of buildDemoShipments(tenant, NOW)) {
      const sellerUser =
        tenant.sellerUserIds[tenant.sellerIds.indexOf(shipment.sellerId)];
      for (const event of events) {
        const bySeller =
          event.status === ShipmentStatus.PENDING ||
          event.status === ShipmentStatus.CANCELLED;
        expect(event.actorId).toBe(
          bySeller ? sellerUser : memberUser[shipment.ownerId ?? ''],
        );
      }
    }
  });

  it('shifts the whole dataset with the moment it is built for', () => {
    const later = NOW + 24 * MS_PER_HOUR;
    const [first] = buildDemoShipments(tenant, NOW);
    const [shifted] = buildDemoShipments(tenant, later);

    expect(
      shifted.shipment.createdAt.getTime() - first.shipment.createdAt.getTime(),
    ).toBe(later - NOW);
  });
});
