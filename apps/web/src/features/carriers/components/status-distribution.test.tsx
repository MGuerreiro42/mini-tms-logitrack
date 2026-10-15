import { render, screen } from '@testing-library/react';
import { StatusDistribution } from './status-distribution';

const counts = {
  PENDING: 2,
  ACCEPTED: 0,
  COLLECTED: 0,
  IN_TRANSIT: 3,
  OUT_FOR_DELIVERY: 0,
  DELIVERED: 22,
  FAILED_DELIVERY: 0,
  CANCELLED: 0,
  RETURNED: 0,
};

describe('StatusDistribution', () => {
  it('lists non-empty statuses by count, largest first', () => {
    render(<StatusDistribution counts={counts} total={27} />);

    expect(
      screen.getByRole('img', {
        name: 'Delivered 22, In transit 3, Pending 2',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('listitem').map((item) => item.textContent),
    ).toEqual(['Delivered22', 'In transit3', 'Pending2']);
    expect(screen.getByText('27 shipments')).toBeInTheDocument();
  });
});
