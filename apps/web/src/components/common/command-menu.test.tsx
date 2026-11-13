import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rememberRecent } from '@/hooks/use-recents';
import { setSession } from '@/lib/session';
import { router } from '@/test/navigation';
import { CommandMenu } from './command-menu';
import type { NavSection } from './nav-tree';

const nav: NavSection[] = [
  {
    items: [
      { name: 'Overview', href: '/seller', icon: null, shortcut: 'o' },
      {
        name: 'Shipments',
        href: '/seller/shipments',
        icon: null,
        views: [{ name: 'Late', param: 'view', value: 'late' }],
      },
    ],
  },
];

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView ??= () => {};
});

describe('CommandMenu', () => {
  it('opens on Ctrl+K and jumps to a page', async () => {
    const user = userEvent.setup();
    render(<CommandMenu nav={nav} />);

    await user.keyboard('{Control>}k{/Control}');
    await user.type(screen.getByRole('combobox'), 'ship');
    await user.click(screen.getByRole('option', { name: 'Shipments' }));

    expect(router.push).toHaveBeenCalledWith('/seller/shipments');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('offers public tracking only for a full tracking code', async () => {
    const user = userEvent.setup();
    render(<CommandMenu nav={nav} />);

    await user.click(
      screen.getByRole('button', { name: /search or jump to/i }),
    );
    await user.type(screen.getByRole('combobox'), 'tms-de00');
    expect(screen.queryByRole('option', { name: /^Track/ })).toBeNull();

    await user.type(screen.getByRole('combobox'), '00000027');
    await user.click(
      screen.getByRole('option', { name: 'Track TMS-DE0000000027' }),
    );

    expect(router.push).toHaveBeenCalledWith('/track/TMS-DE0000000027');
  });

  it('opens a pasted tracking code on Enter, with no empty message', async () => {
    const user = userEvent.setup();
    render(<CommandMenu nav={nav} />);

    await user.keyboard('{Control>}k{/Control}');
    await user.click(screen.getByRole('combobox'));
    await user.paste('TMS-DE0000000027');

    expect(screen.queryByText(/No matching page/)).toBeNull();
    await user.keyboard('{Enter}');

    expect(router.push).toHaveBeenCalledWith('/track/TMS-DE0000000027');
  });

  it('closes on the shortcut and starts empty next time', async () => {
    const user = userEvent.setup();
    render(<CommandMenu nav={nav} />);

    await user.keyboard('{Control>}k{/Control}');
    await user.type(screen.getByRole('combobox'), 'ship');
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('combobox')).toHaveValue('');
  });

  it('lists the views with their parent and the shortcut hints', async () => {
    const user = userEvent.setup();
    render(<CommandMenu nav={nav} />);

    await user.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('option', { name: /^Overview/ })).toHaveTextContent(
      'G O',
    );
    await user.type(screen.getByRole('combobox'), 'late');
    await user.click(screen.getByRole('option', { name: 'Shipments · Late' }));

    expect(router.push).toHaveBeenCalledWith('/seller/shipments?view=late');
  });

  it('lists the recent shipments by code', async () => {
    setSession({ token: 't', role: 'SELLER', userId: 'u1', email: 'e' });
    rememberRecent({ href: '/seller/shipments/1', code: 'TMS-1' });
    const user = userEvent.setup();
    render(<CommandMenu nav={nav} />);

    await user.keyboard('{Control>}k{/Control}');
    await user.click(screen.getByRole('option', { name: 'TMS-1' }));

    expect(router.push).toHaveBeenCalledWith('/seller/shipments/1');
  });
});
