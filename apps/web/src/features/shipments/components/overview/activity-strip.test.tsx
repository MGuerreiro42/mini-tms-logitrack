import { render, screen } from '@testing-library/react';
import type { ShipmentActivity } from '@/features/shipments/types';
import { ActivityStrip } from './activity-strip';
import { HOUR_MS } from './overview.fixtures';

const now = new Date('2026-11-16T12:00:00.000Z');

const at = (hoursAgo: number): ShipmentActivity => ({
  id: `e${hoursAgo}`,
  shipmentId: 's',
  trackingCode: 'TMS-A',
  status: 'IN_TRANSIT',
  city: 'Bauru',
  dueAt: null,
  createdAt: new Date(now.getTime() - hoursAgo * HOUR_MS).toISOString(),
});

describe('ActivityStrip', () => {
  it('keeps every tick inside the strip, whatever the clock skew', () => {
    render(<ActivityStrip events={[at(-1), at(2), at(5)]} now={now} />);

    const lefts = [
      ...screen.getByRole('img').querySelectorAll<HTMLElement>('[style]'),
    ].map((tick) => tick.style.left);
    expect(lefts).toEqual(['100%', '50%', '0%']);
  });
});
