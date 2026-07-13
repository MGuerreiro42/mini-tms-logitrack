import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './confirm-dialog';

describe('ConfirmDialog', () => {
  it('opens the dialog when the trigger is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        trigger={<button type="button">Open</button>}
        title="Reject this application?"
        description="This can't be undone."
        confirmLabel="Reject"
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Reject this application?')).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        trigger={<button type="button">Open</button>}
        title="Reject this application?"
        description="This can't be undone."
        confirmLabel="Reject"
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows a working label and disables the confirm button while confirming', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        trigger={<button type="button">Open</button>}
        title="Reject this application?"
        description="This can't be undone."
        confirmLabel="Reject"
        onConfirm={vi.fn()}
        isConfirming
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('button', { name: 'Working…' })).toBeDisabled();
  });
});
