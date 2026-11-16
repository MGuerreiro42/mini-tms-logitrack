import { render } from '@testing-library/react';
import type { SlaState } from '@/lib/sla';
import { RiskBadge } from './risk-badge';

const states: SlaState[] = [
  { kind: 'onTrack', label: 'Due Thu 14:00', tone: 'neutral' },
  { kind: 'dueSoon', label: 'Due in 4 h', tone: 'caution' },
  { kind: 'late', label: 'Late 13 h', tone: 'critical' },
  { kind: 'onTime', label: 'On time', tone: 'positive' },
  { kind: 'deliveredLate', label: 'Late by 8 h', tone: 'mutedCritical' },
  { kind: 'failed', label: 'Failed', tone: 'critical' },
  { kind: 'none', label: '—', tone: 'neutral' },
];

describe('RiskBadge', () => {
  it.each(states)(
    'marks $kind with a hidden icon only when it is not neutral',
    (state) => {
      const { container, getByText } = render(<RiskBadge state={state} />);

      const icon = container.querySelector('svg');
      expect(getByText(state.label)).toBeInTheDocument();
      if (state.tone === 'neutral') expect(icon).toBeNull();
      else expect(icon).toHaveAttribute('aria-hidden', 'true');
    },
  );

  it('puts the remaining span in the title', () => {
    const { getByTitle } = render(
      <RiskBadge state={{ ...states[0], title: 'in 2 d' }} />,
    );

    expect(getByTitle('in 2 d')).toHaveTextContent('Due Thu 14:00');
  });
});
