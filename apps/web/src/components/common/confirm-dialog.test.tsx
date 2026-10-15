import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/services/api-client';
import { ConfirmDialog } from './confirm-dialog';

function dialog(
  onConfirm: () => Promise<unknown>,
  onOpenChange: (open: boolean) => void,
  available = true,
) {
  return (
    <ConfirmDialog
      trigger={<button type="button">Open</button>}
      title="Reject this application?"
      description="This can't be undone."
      confirmLabel="Reject"
      dismissLabel="Keep"
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
      available={available}
      unavailableMessage="Already reviewed."
    >
      <input aria-label="Reason" />
    </ConfirmDialog>
  );
}

function renderDialog(onConfirm: () => Promise<unknown>) {
  const onOpenChange = vi.fn();
  const view = render(dialog(onConfirm, onOpenChange));
  const withdraw = () => view.rerender(dialog(onConfirm, onOpenChange, false));
  return { onOpenChange, withdraw };
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

  it('shows the API message of a failed confirmation and clears it on reopening', async () => {
    const user = userEvent.setup();
    renderDialog(
      vi.fn().mockRejectedValue(new ApiError(400, 'Reason is too long')),
    );

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Reason is too long',
    );

    await user.click(screen.getByRole('button', { name: 'Keep' }));
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('settles a conflict into a single acknowledgement, keeping the input', async () => {
    const user = userEvent.setup();
    renderDialog(
      vi.fn().mockRejectedValue(new ApiError(409, 'Already rejected')),
    );

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.type(screen.getByLabelText('Reason'), 'Wrong address');
    await user.click(screen.getByRole('button', { name: 'Reject' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Already reviewed.',
    );
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
    expect(screen.getByLabelText('Reason')).toHaveValue('Wrong address');
    expect(screen.getByLabelText('Reason')).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('explains itself instead of vanishing when the action is withdrawn while open', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const { withdraw } = renderDialog(onConfirm);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    withdraw();

    expect(screen.getByRole('alert')).toHaveTextContent('Already reviewed.');
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
    expect(screen.getByLabelText('Reason')).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open' })).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('explains a conflict with its own message, not the API one', async () => {
    const user = userEvent.setup();
    const { withdraw } = renderDialog(
      vi.fn().mockRejectedValue(new ApiError(409, 'Already rejected')),
    );

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    await screen.findByRole('alert');
    withdraw();

    expect(screen.getByRole('alert')).toHaveTextContent('Already reviewed.');
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
  });

  it('renders nothing for an action that is not available', () => {
    const { withdraw } = renderDialog(vi.fn());
    withdraw();

    expect(screen.queryByRole('button', { name: 'Open' })).toBeNull();
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
