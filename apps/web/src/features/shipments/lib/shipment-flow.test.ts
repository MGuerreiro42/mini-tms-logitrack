import { shipment } from '../components/overview/overview.fixtures';
import { flowStages } from './shipment-flow';

const counts = {
  PENDING: 1,
  ACCEPTED: 0,
  COLLECTED: 0,
  IN_TRANSIT: 3,
  OUT_FOR_DELIVERY: 0,
};

describe('flowStages', () => {
  it('groups the drawn marks by stage, with the rest counted as hidden', () => {
    const now = new Date();
    const { stages, totals } = flowStages(
      [
        shipment('late', 'IN_TRANSIT', -7),
        shipment('soon', 'IN_TRANSIT', 2),
        shipment('pending', 'PENDING', 48),
      ],
      counts,
      now,
    );

    const inTransit = stages.find((stage) => stage.status === 'IN_TRANSIT');
    expect(inTransit?.marks.map(({ state }) => state.kind)).toEqual([
      'late',
      'dueSoon',
    ]);
    expect(inTransit?.hidden).toBe(1);
    expect(inTransit?.summary).toBe('In transit 3: 1 due soon, 1 late');
    expect(totals).toEqual({ onTrack: 1, dueSoon: 1, late: 1, none: 0 });
  });

  it('counts a shipment without an SLA apart', () => {
    const { totals, stages } = flowStages(
      [{ ...shipment('free', 'PENDING', 5), dueAt: null }],
      counts,
      new Date(),
    );

    expect(totals.none).toBe(1);
    expect(stages[0].summary).toBe('Pending 1: 1 no SLA');
  });
});
