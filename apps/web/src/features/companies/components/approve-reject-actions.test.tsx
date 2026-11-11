import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearSession, setSession } from '@/lib/session';
import { ApproveRejectActions } from './approve-reject-actions';

describe('ApproveRejectActions', () => {
  it.each(['APPROVED', 'REJECTED'] as const)(
    'offers no action once %s',
    (status) => {
      render(
        <ApproveRejectActions
          status={status}
          onApprove={vi.fn()}
          onReject={vi.fn().mockResolvedValue(undefined)}
        />,
      );

      expect(screen.queryByRole('button')).toBeNull();
    },
  );

  it('calls onApprove directly (no confirm step)', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    render(
      <ApproveRejectActions
        status="PENDING"
        onApprove={onApprove}
        onReject={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('shows the demo admin both actions disabled, with the reason', () => {
    setSession({
      token: 't',
      role: 'ADMIN',
      userId: 'u',
      email: 'admin@demo.minitms.dev',
    });
    render(
      <ApproveRejectActions
        status="PENDING"
        onApprove={vi.fn()}
        onReject={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    for (const name of ['Approve', 'Reject']) {
      const button = screen.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAccessibleDescription(
        "The demo admin can't approve or reject sign-ups",
      );
    }
    clearSession();
  });

  it('requires confirmation before calling onReject', async () => {
    const user = userEvent.setup();
    const onReject = vi.fn().mockResolvedValue(undefined);
    render(
      <ApproveRejectActions
        status="PENDING"
        onApprove={vi.fn()}
        onReject={onReject}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Reject' }));
    expect(onReject).not.toHaveBeenCalled();

    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }));
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('disables both buttons while approving or rejecting', () => {
    render(
      <ApproveRejectActions
        status="PENDING"
        onApprove={vi.fn()}
        onReject={vi.fn().mockResolvedValue(undefined)}
        isApproving
      />,
    );

    expect(screen.getByRole('button', { name: 'Approving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
  });
});
