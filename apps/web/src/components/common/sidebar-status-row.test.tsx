import { render, screen } from '@testing-library/react';
import type { LiveStatus } from '@/lib/live-status';
import { NavCountsContext } from './nav-counts';
import { ConnectionStatusRow, SidebarStatusRow } from './sidebar-status-row';

describe('ConnectionStatusRow', () => {
  it.each<[LiveStatus, string]>([
    ['live', 'Live'],
    ['connecting', 'Connecting…'],
    ['offline', 'Reconnecting · counts may be stale'],
  ])('reads %s as "%s"', (status, label) => {
    render(
      <NavCountsContext value={{ status }}>
        <ConnectionStatusRow />
      </NavCountsContext>,
    );
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe('SidebarStatusRow', () => {
  it('links when given an href', () => {
    render(
      <SidebarStatusRow tone="neutral" label="Chaos · off" href="/admin" />,
    );
    expect(screen.getByRole('link', { name: 'Chaos · off' })).toHaveAttribute(
      'href',
      '/admin',
    );
  });
});
