import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { resetNavigation, router } from '@/test/navigation';
import { setRootFontSize, setViewportWidth } from '@/test/viewport';
import type { NavSection } from './nav-tree';
import { SidebarFrame } from './sidebar-frame';

const nav: NavSection[] = [
  {
    items: [
      { name: 'Overview', href: '/seller', icon: null },
      {
        name: 'Profile',
        href: '/seller/profile',
        icon: null,
        shortcut: 'p',
      },
    ],
  },
];

function renderFrame(rail = false) {
  resetNavigation('/seller');
  render(
    <SidebarFrame nav={nav} rail={rail}>
      <main>
        <button type="button">Page</button>
      </main>
    </SidebarFrame>,
  );
  return screen.getByRole('button', { name: 'Sidebar' });
}

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  // biome-ignore lint/suspicious/noDocumentCookie: clearing the test cookie
  document.cookie = 'tms-sidebar=; path=/; max-age=0';
});

describe('SidebarFrame', () => {
  it('docks from 1280 px and stores the rail in a cookie', async () => {
    const user = userEvent.setup();
    const toggle = renderFrame();

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-keyshortcuts', '[');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.cookie).toContain('tms-sidebar=rail');
    await user.click(toggle);
    expect(document.cookie).not.toContain('tms-sidebar=rail');
  });

  it('starts from the cookie', () => {
    expect(renderFrame(true)).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens an overlay at 1024-1279 px that Esc closes, returning focus', async () => {
    setViewportWidth(1100);
    const user = userEvent.setup();
    const toggle = renderFrame();

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    act(() => router.push('/seller/profile'));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    expect(document.cookie).not.toContain('tms-sidebar');
  });

  it('closes the overlay on a click to the current page', async () => {
    setViewportWidth(1100);
    const user = userEvent.setup();
    const toggle = renderFrame();

    await user.click(toggle);
    await user.click(screen.getByRole('link', { name: 'Overview' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the overlay on a pointer down outside it or past 1280 px', async () => {
    setViewportWidth(1100);
    const user = userEvent.setup();
    const toggle = renderFrame();

    await user.click(toggle);
    await user.click(screen.getByRole('button', { name: 'Page' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    act(() => setViewportWidth(1440));
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    act(() => setViewportWidth(1100));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('names a rail icon in a tooltip on focus', async () => {
    const user = userEvent.setup();
    renderFrame(true);

    await user.tab();
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Overview');
  });

  it('follows the rem breakpoints when the default font size is larger', async () => {
    const user = userEvent.setup();
    setRootFontSize(20);
    setViewportWidth(1400);
    const toggle = renderFrame();

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows no tooltip while expanded', async () => {
    const user = userEvent.setup();
    renderFrame();

    await user.tab();
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveFocus();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it.each([
    [
      'dialog',
      <Dialog key="d" defaultOpen>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Confirm</DialogTitle>
        </DialogContent>
      </Dialog>,
    ],
    [
      'menu',
      <DropdownMenu key="m" defaultOpen>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Copy</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    ],
  ])('leaves Esc to an open Radix %s above the overlay', async (_, layer) => {
    setViewportWidth(1100);
    const user = userEvent.setup();
    const toggle = renderFrame();
    await user.click(toggle);
    render(layer);
    expect(
      screen.getByRole(layer.key === 'd' ? 'dialog' : 'menu'),
    ).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('takes Esc before the non-modal peek sheet', async () => {
    setViewportWidth(1100);
    const user = userEvent.setup();
    const toggle = renderFrame();
    await user.click(toggle);
    render(<div role="dialog" aria-modal="false" aria-label="Peek" />);

    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the overlay on any navigation, not only its own links', async () => {
    setViewportWidth(1100);
    const user = userEvent.setup();
    const toggle = renderFrame();

    await user.keyboard('[[');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('gp');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });
});
