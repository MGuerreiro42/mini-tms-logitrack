import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnTimeRows } from './on-time-rows';
import { PipelineBar } from './pipeline-bar';
import { StageChart } from './stage-chart';

describe('PipelineBar', () => {
  it('links every open stage in lifecycle order, a zero one as a stub', () => {
    render(
      <PipelineBar
        counts={{
          PENDING: 2,
          ACCEPTED: 0,
          COLLECTED: 1,
          IN_TRANSIT: 5,
          OUT_FOR_DELIVERY: 1,
        }}
        hrefFor={(status) => `/seller/shipments?status=${status}`}
      />,
    );

    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
      '2 Pending',
      '0 Accepted',
      '1 Collected',
      '5 In transit',
      '1 Out for delivery',
    ]);
    expect(links[3]).toHaveAttribute(
      'href',
      '/seller/shipments?status=IN_TRANSIT',
    );
    expect(links[1].parentElement).toHaveStyle({ flex: '0 0 4px' });
  });
});

describe('OnTimeRows', () => {
  it('draws a meter only from 5 samples on', () => {
    const { container } = render(
      <OnTimeRows
        rows={[
          { key: 'a', label: 'Express', rate: 92.5, n: 40 },
          { key: 'b', label: 'Economy', rate: 100, n: 3 },
          { key: 'c', label: 'Same day', rate: null, n: 6 },
        ]}
      />,
    );

    expect(screen.getByText('92.5%')).toBeVisible();
    expect(screen.getByText('Not enough deliveries (n=3)')).toBeVisible();
    expect(screen.getByText('n=6')).toBeVisible();
    expect(container.querySelectorAll('.bg-chart-1')).toHaveLength(1);
  });
});

describe('StageChart', () => {
  const rows = [
    {
      key: 'PENDING',
      label: 'Claim wait',
      p50Hours: 2,
      p90Hours: 5,
      budgetHours: 1,
      n: 12,
    },
    {
      key: 'ACCEPTED',
      label: 'Pickup wait',
      p50Hours: 1,
      p90Hours: 1,
      budgetHours: 2,
      n: 3,
    },
  ];

  it('flags a median over budget and holds back a stage with too few samples', () => {
    render(<StageChart rows={rows} />);

    expect(screen.getByText('over budget')).toBeVisible();
    expect(
      screen.getByLabelText(
        'Claim wait: median 2 h, p90 5 h, budget 1 h, n=12, over budget',
      ),
    ).toBeVisible();
    expect(screen.getByText('Not enough data (n=3)')).toBeVisible();
    expect(
      screen.getByText(
        'Bar = median · Whisker = p90 · Tick = stage budget · n=15',
      ),
    ).toBeVisible();
  });

  it('switches to a table view and back', async () => {
    const user = userEvent.setup();
    render(<StageChart rows={rows} />);

    await user.click(screen.getByRole('button', { name: 'View as table' }));

    expect(screen.getByRole('columnheader', { name: 'p90' })).toBeVisible();
    expect(
      screen.getByRole('row', {
        name: /^Pickup wait\s*Not enough data \(n=3\) — — 2 h 3$/,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('row', {
        name: /^Claim wait 2 h\s*over budget 5 h 1 h 12$/,
      }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'View as chart' }));
    expect(screen.queryByRole('table')).toBeNull();
  });
});
