import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetNavigation, router } from '@/test/navigation';
import { setViewportWidth } from '@/test/viewport';
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

  it('shows no tooltip while expanded', async () => {
    const user = userEvent.setup();
    renderFrame();

    await user.tab();
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveFocus();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('leaves Esc to an open dialog or menu', async () => {
    setViewportWidth(1100);
    const user = userEvent.setup();
    const toggle = renderFrame();
    await user.click(toggle);
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.append(dialog);
    const reached = vi.fn();
    document.addEventListener('keydown', reached);

    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(reached).toHaveBeenCalled();
    document.removeEventListener('keydown', reached);
    dialog.remove();
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
