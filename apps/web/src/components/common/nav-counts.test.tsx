import { act, render, screen } from '@testing-library/react';
import type { LiveStatus } from '@/lib/live-status';
import {
  CountPill,
  ExceptionsAnnouncer,
  type NavCounts,
  NavCountsContext,
} from './nav-counts';

function Row({ countKey, ...value }: NavCounts & { countKey: string }) {
  return (
    <NavCountsContext value={value}>
      <a href="/x">
        Late
        <CountPill countKey={countKey} />
      </a>
    </NavCountsContext>
  );
}

const live: LiveStatus = 'live';

describe('CountPill', () => {
  it('shows nothing at zero or without counts', () => {
    const { rerender } = render(
      <Row countKey="late" counts={{ late: 0 }} status={live} />,
    );
    expect(screen.getByRole('link')).toHaveAccessibleName('Late');
    rerender(<Row countKey="late" status="connecting" />);
    expect(screen.getByRole('link')).toHaveAccessibleName('Late');
  });

  it('caps the pill at 99+ and keeps the exact number in the link name', () => {
    const { rerender } = render(
      <Row countKey="late" counts={{ late: 99 }} status={live} />,
    );
    expect(screen.getByText('99')).toBeInTheDocument();
    rerender(<Row countKey="late" counts={{ late: 124 }} status={live} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAccessibleName(
      'Late, 124 shipments',
    );
    rerender(<Row countKey="late" counts={{ late: 1 }} status={live} />);
    expect(screen.getByRole('link')).toHaveAccessibleName('Late, 1 shipment');
  });

  it('outlines a toned pill while the counts are not live', () => {
    const { container, rerender } = render(
      <Row countKey="exceptions" counts={{ exceptions: 3 }} status={live} />,
    );
    const pill = () => container.querySelector('[data-tone]');
    expect(pill()).not.toHaveClass('border-current');
    rerender(
      <Row countKey="exceptions" counts={{ exceptions: 3 }} status="offline" />,
    );
    expect(pill()).toHaveClass('border-current', 'bg-transparent');
  });

  it('leaves neutral counts plain', () => {
    const { container } = render(
      <Row countKey="mine" counts={{ mine: 4 }} status={live} />,
    );
    expect(container.querySelector('[data-tone]')).toBeNull();
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});

describe('ExceptionsAnnouncer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const renderWith = (exceptions?: number) => (
    <NavCountsContext
      value={{
        counts: exceptions === undefined ? undefined : { exceptions },
        status: live,
      }}
    >
      <ExceptionsAnnouncer />
    </NavCountsContext>
  );

  it('announces rises only, rolling those within 10 s into one', () => {
    const { rerender } = render(renderWith());
    const region = screen.getByRole('status');

    rerender(renderWith(2));
    expect(region).toBeEmptyDOMElement();
    rerender(renderWith(1));
    expect(region).toBeEmptyDOMElement();

    rerender(renderWith(3));
    expect(region).toHaveTextContent('Exceptions: 3 open');
    rerender(renderWith(4));
    rerender(renderWith(5));
    expect(region).toHaveTextContent('Exceptions: 3 open');

    act(() => vi.advanceTimersByTime(10_000));
    expect(region).toHaveTextContent('Exceptions: 5 open');
  });
});
