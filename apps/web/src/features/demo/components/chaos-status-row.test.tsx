import { render, screen } from '@testing-library/react';
import { useDemoStatus } from '../hooks/use-demo-status';
import { ChaosStatusRow } from './chaos-status-row';

vi.mock('../hooks/use-demo-status', () => ({ useDemoStatus: vi.fn() }));

const withData = (data: unknown) =>
  vi.mocked(useDemoStatus).mockReturnValue({ data } as never);

describe('ChaosStatusRow', () => {
  it('reads off without a scenario', () => {
    withData({ chaos: null });
    render(<ChaosStatusRow />);
    expect(screen.getByText('Chaos · off')).toBeInTheDocument();
  });

  it('shows the running scenario as a link when given one', () => {
    withData({ chaos: { label: 'Storm: failed deliveries' } });
    render(<ChaosStatusRow href="/admin" />);
    expect(
      screen.getByRole('link', { name: 'Chaos · Storm: failed deliveries' }),
    ).toHaveAttribute('href', '/admin');
  });

  it('renders nothing without data (404 or demo off)', () => {
    withData(undefined);
    const { container } = render(<ChaosStatusRow />);
    expect(container).toBeEmptyDOMElement();
  });
});
