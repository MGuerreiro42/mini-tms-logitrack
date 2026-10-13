import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './confirm-dialog';

function renderDialog(onConfirm: () => Promise<unknown>) {
  const onOpenChange = vi.fn();
  render(
    <ConfirmDialog
      trigger={<button type="button">Open</button>}
      title="Reject this application?"
      description="This can't be undone."
      confirmLabel="Reject"
      dismissLabel="Keep"
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
    >
      <input aria-label="Reason" />
    </ConfirmDialog>,
  );
  return { onOpenChange };
}

function deferred() {
  let settle: { resolve: () => void; reject: (error: Error) => void } = {
    resolve: () => {},
    reject: () => {},
  };
  const promise = new Promise<void>((resolve, reject) => {
    settle = { resolve, reject };
  });
  return { promise, ...settle };
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
    const { promise, resolve } = deferred();
    const { onOpenChange } = renderDialog(() => promise);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    expect(screen.getByRole('button', { name: 'Working…' })).toBeDisabled();

    resolve();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('stays open with the typed input when the confirmation fails', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockRejectedValue(new Error('409'));
    const { onOpenChange } = renderDialog(onConfirm);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.type(screen.getByLabelText('Reason'), 'Wrong address');
    await user.click(screen.getByRole('button', { name: 'Reject' }));

    expect(await screen.findByRole('button', { name: 'Reject' })).toBeEnabled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Reason')).toHaveValue('Wrong address');
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    await user.click(screen.getByRole('button', { name: 'Reject' }));
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it('ignores Escape and the close button while confirming', async () => {
    const user = userEvent.setup();
    const { promise, resolve } = deferred();
    const { onOpenChange } = renderDialog(() => promise);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    resolve();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
