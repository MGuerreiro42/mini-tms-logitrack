import { render, screen } from '@testing-library/react';
import { LiveIndicator } from './live-indicator';

describe('LiveIndicator', () => {
  it.each([
    ['connecting', 'Connecting…'],
    ['live', 'Live'],
    ['offline', 'Offline · updates refresh every few seconds'],
  ] as const)('labels the %s state', (status, label) => {
    render(<LiveIndicator status={status} />);
    expect(screen.getByRole('status')).toHaveTextContent(label);
  });
});
