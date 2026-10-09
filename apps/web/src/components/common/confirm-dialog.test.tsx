import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './confirm-dialog';

function renderDialog(onConfirm: () => Promise<unknown>) {
  render(
    <ConfirmDialog
      trigger={<button type="button">Open</button>}
      title="Reject this application?"
      description="This can't be undone."
      confirmLabel="Reject"
      dismissLabel="Keep"
      onConfirm={onConfirm}
    />,
  );
}

describe('ConfirmDialog', () => {
  it('opens the dialog when the trigger is clicked', async () => {
    const user = userEvent.setup();
    renderDialog(vi.fn().mockResolvedValue(undefined));

    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Reject this application?')).toBeInTheDocument();
  });

  it('closes without confirming from the dismiss button', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    renderDialog(onConfirm);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Keep' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows a working state while confirming, then closes', async () => {
    const user = userEvent.setup();
    let resolve: () => void = () => {};
    renderDialog(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    expect(screen.getByRole('button', { name: 'Working…' })).toBeDisabled();

    resolve();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('closes and resets when the confirmation fails', async () => {
    const user = userEvent.setup();
    renderDialog(vi.fn().mockRejectedValue(new Error('409')));

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('button', { name: 'Reject' })).toBeEnabled();
  });
});
