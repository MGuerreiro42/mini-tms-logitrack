import { render, screen } from '@testing-library/react';
import { Panel } from './panel';

describe('Panel', () => {
  it('renders the title and the chart when there is data', () => {
    render(
      <Panel title="Ranking" isEmpty={false} emptyMessage="Nothing yet">
        <div>chart</div>
      </Panel>,
    );
    expect(
      screen.getByRole('heading', { name: 'Ranking' }),
    ).toBeInTheDocument();
    expect(screen.getByText('chart')).toBeInTheDocument();
  });

  it('keeps the title and swaps the chart for the empty message when there is no data', () => {
    render(
      <Panel title="Ranking" isEmpty emptyMessage="Nothing yet">
        <div>chart</div>
      </Panel>,
    );
    expect(
      screen.getByRole('heading', { name: 'Ranking' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
    expect(screen.queryByText('chart')).not.toBeInTheDocument();
  });
});
