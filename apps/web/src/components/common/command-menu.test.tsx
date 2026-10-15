import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { router } from '@/test/navigation';
import { CommandMenu } from './command-menu';

const items = [
  { name: 'Overview', href: '/seller' },
  { name: 'Shipments', href: '/seller/shipments' },
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
    render(<CommandMenu items={items} />);

    await user.keyboard('{Control>}k{/Control}');
    await user.type(screen.getByRole('combobox'), 'ship');
    await user.click(screen.getByRole('option', { name: 'Shipments' }));

    expect(router.push).toHaveBeenCalledWith('/seller/shipments');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('offers public tracking only for a full tracking code', async () => {
    const user = userEvent.setup();
    render(<CommandMenu items={items} />);

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
    render(<CommandMenu items={items} />);

    await user.keyboard('{Control>}k{/Control}');
    await user.click(screen.getByRole('combobox'));
    await user.paste('TMS-DE0000000027');

    expect(screen.queryByText(/No matching page/)).toBeNull();
    await user.keyboard('{Enter}');

    expect(router.push).toHaveBeenCalledWith('/track/TMS-DE0000000027');
  });

  it('closes on the shortcut and starts empty next time', async () => {
    const user = userEvent.setup();
    render(<CommandMenu items={items} />);

    await user.keyboard('{Control>}k{/Control}');
    await user.type(screen.getByRole('combobox'), 'ship');
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('combobox')).toHaveValue('');
  });
});
