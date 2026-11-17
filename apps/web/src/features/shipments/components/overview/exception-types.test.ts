import { exceptionTotal, ownerLabel } from './exception-types';
import { attention, shipment } from './overview.fixtures';

describe('ownerLabel', () => {
  it('names who acts for each known type', () => {
    expect(ownerLabel({ type: 'late', owner: 'carrier' })).toBe(
      'Carrier must act',
    );
    expect(ownerLabel({ type: 'failed', owner: 'carrier' })).toBe(
      'Carrier must act',
    );
    expect(ownerLabel({ type: 'waiting', owner: 'unknown' })).toBe(
      'Waiting for carrier',
    );
  });

  it('falls back to the server owner for a type it does not know', () => {
    expect(ownerLabel({ type: 'stalled', owner: 'carrier' })).toBe('Carrier');
    expect(ownerLabel({ type: 'at_risk', owner: 'unknown' })).toBe(
      'Owner unknown',
    );
  });
});

describe('exceptionTotal', () => {
  const groups = attention(
    [shipment('late', 'IN_TRANSIT', -2)],
    [shipment('failed', 'FAILED_DELIVERY', -2)],
  );

  it('sums the groups and adds the webhook row when it is down', () => {
    expect(exceptionTotal(groups, 'ok')).toBe(2);
    expect(exceptionTotal(groups, 'down')).toBe(3);
  });
});
