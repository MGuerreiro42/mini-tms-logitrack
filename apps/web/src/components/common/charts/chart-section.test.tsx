import { render, screen } from '@testing-library/react';
import { ChartSection } from './chart-section';

describe('ChartSection', () => {
  it('renders the title and the chart when there is data', () => {
    render(
      <ChartSection title="Ranking" isEmpty={false} emptyMessage="Nothing yet">
        <div>chart</div>
      </ChartSection>,
    );
    expect(
      screen.getByRole('heading', { name: 'Ranking' }),
    ).toBeInTheDocument();
    expect(screen.getByText('chart')).toBeInTheDocument();
  });

  it('renders only the empty message when there is no data', () => {
    render(
      <ChartSection title="Ranking" isEmpty emptyMessage="Nothing yet">
        <div>chart</div>
      </ChartSection>,
    );
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
    expect(screen.queryByText('chart')).not.toBeInTheDocument();
  });
});
