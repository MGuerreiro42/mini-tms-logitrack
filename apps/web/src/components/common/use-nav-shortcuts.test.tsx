import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setShortcutsEnabled } from '@/hooks/use-shortcuts-enabled';
import { router } from '@/test/navigation';
import type { NavSection } from './nav-tree';
import { useNavShortcuts } from './use-nav-shortcuts';

const nav: NavSection[] = [
  {
    items: [
      { name: 'Overview', href: '/seller', icon: null, shortcut: 'o' },
      {
        name: 'Shipments',
        href: '/seller/shipments',
        icon: null,
        shortcut: 's',
      },
    ],
  },
];

const toggle = vi.fn();

function Harness() {
  useNavShortcuts(nav, toggle);
  return (
    <>
      <input aria-label="Search" />
      <button type="button">Elsewhere</button>
    </>
  );
}

function setup() {
  render(<Harness />);
  return userEvent.setup();
}

describe('useNavShortcuts', () => {
  beforeEach(() => {
    toggle.mockClear();
    setShortcutsEnabled(true);
  });

  it('opens an item on g then its key, and toggles the sidebar on [', async () => {
    const user = setup();
    await user.keyboard('gs');
    expect(router.push).toHaveBeenCalledWith('/seller/shipments');
    await user.keyboard('[[');
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('ignores a key that comes more than 1 s after g', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = setup();
    await user.keyboard('g');
    vi.advanceTimersByTime(1001);
    await user.keyboard('s');
    expect(router.push).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('ignores keys typed in a field, with a modifier or under a dialog', async () => {
    const user = setup();
    await user.click(screen.getByRole('textbox', { name: 'Search' }));
    await user.keyboard('gs[[');
    await user.click(screen.getByRole('button', { name: 'Elsewhere' }));
    await user.keyboard('{Control>}g{/Control}s');
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.append(dialog);
    await user.keyboard('gs[[');
    dialog.remove();

    expect(router.push).not.toHaveBeenCalled();
    expect(toggle).not.toHaveBeenCalled();
  });

  it('does nothing while shortcuts are off', async () => {
    setShortcutsEnabled(false);
    expect(localStorage.getItem('tms:shortcuts')).toBe('off');
    const user = setup();
    await user.keyboard('gs[[');
    expect(router.push).not.toHaveBeenCalled();
    expect(toggle).not.toHaveBeenCalled();
  });
});
