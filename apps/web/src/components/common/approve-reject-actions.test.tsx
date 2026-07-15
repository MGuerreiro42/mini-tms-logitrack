import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApproveRejectActions } from './approve-reject-actions';

describe('ApproveRejectActions', () => {
  it('renders nothing once the application is no longer pending', () => {
    const { container } = render(
      <ApproveRejectActions
        status="APPROVED"
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('calls onApprove directly (no confirm step)', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    render(
      <ApproveRejectActions
        status="PENDING"
        onApprove={onApprove}
        onReject={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('requires confirmation before calling onReject', async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();
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
        onReject={vi.fn()}
        isApproving
      />,
    );

    expect(screen.getByRole('button', { name: 'Approving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
  });
});
