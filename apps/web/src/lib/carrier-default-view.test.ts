import { carrierDefaultView } from './carrier-default-view';

describe('carrierDefaultView', () => {
  it('opens managers on the unclaimed queue', () => {
    expect(carrierDefaultView('CARRIER_MANAGER')).toBe('unclaimed');
  });

  it('opens operators and unknown roles on their own shipments', () => {
    expect(carrierDefaultView('CARRIER_OPERATOR')).toBe('mine');
    expect(carrierDefaultView(undefined)).toBe('mine');
  });
});
