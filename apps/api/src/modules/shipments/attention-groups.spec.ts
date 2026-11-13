import { attentionGroups } from './attention-groups';
import type { ShipmentResponseDto } from './dto/shipment-response.dto';

const item = (id: string) => ({
  shipment: { id } as ShipmentResponseDto,
  since: new Date('2026-01-01T00:00:00Z'),
  reason: null,
});
const none = { count: 0, items: [] };

describe('attentionGroups', () => {
  it('orders late, failed and waiting, and drops an empty group', () => {
    const groups = attentionGroups({
      waiting: { count: 1, items: [item('w')] },
      failed: none,
      late: { count: 7, items: [item('l')] },
    });

    expect(groups).toEqual([
      {
        type: 'late',
        label: 'Late',
        owner: 'carrier',
        count: 7,
        href: '?view=late',
        items: [item('l')],
      },
      {
        type: 'waiting',
        label: 'Waiting for a carrier',
        owner: 'carrier',
        count: 1,
        href: '?view=waiting',
        items: [item('w')],
      },
    ]);
  });

  it('links each group to its list in the same window', () => {
    const [failed] = attentionGroups(
      { late: none, failed: { count: 2, items: [item('f')] }, waiting: none },
      '30d',
    );

    expect(failed.href).toBe('?status=FAILED_DELIVERY&window=30d');
  });
});
