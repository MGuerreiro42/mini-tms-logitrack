import { render, screen } from '@testing-library/react';
import type { LiveStatus } from '@/lib/live-status';
import { NavCountsContext } from './nav-counts';
import {
  ConnectionStatusRow,
  SidebarFooter,
  SidebarStatusRow,
} from './sidebar-status-row';

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

describe('SidebarFooter', () => {
  it('puts the connection line before the feature lines', () => {
    render(
      <NavCountsContext value={{ status: 'live' }}>
        <SidebarFooter>
          <p>Chaos · off</p>
        </SidebarFooter>
      </NavCountsContext>,
    );
    const lines = screen.getAllByText(/Live|Chaos/).map((el) => el.textContent);
    expect(lines).toEqual(['Live', 'Chaos · off']);
  });
});
