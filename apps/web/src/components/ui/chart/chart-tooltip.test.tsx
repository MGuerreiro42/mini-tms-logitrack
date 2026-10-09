import { render, screen } from '@testing-library/react';
import { ChartContext } from './chart-context';
import { ChartTooltipContent } from './chart-tooltip';

const config = { onTime: { label: 'On time', color: '#111' } };

function renderTooltip(props: Parameters<typeof ChartTooltipContent>[0]) {
  return render(
    <ChartContext.Provider value={{ config }}>
      <ChartTooltipContent {...props} />
    </ChartContext.Provider>,
  );
}

const payload = [
  { name: 'onTime', dataKey: 'onTime', value: 1234, payload: {} },
] as never;

describe('ChartTooltipContent', () => {
  it('renders nothing while inactive', () => {
    const { container } = renderTooltip({ active: false, payload });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the configured label and the formatted value', () => {
    renderTooltip({ active: true, payload, label: 'Standard' });
    expect(screen.getByText('Standard')).toBeInTheDocument();
    expect(screen.getByText('On time')).toBeInTheDocument();
    expect(screen.getByText((1234).toLocaleString())).toBeInTheDocument();
  });

  it('delegates the row to a custom formatter', () => {
    renderTooltip({
      active: true,
      payload,
      hideLabel: true,
      formatter: (value) => <span>{`${value}%`}</span>,
    });
    expect(screen.getByText('1234%')).toBeInTheDocument();
  });
});
