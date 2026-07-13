'use client';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import type { ApprovalStatus } from '@/lib/status-colors';

interface ApproveRejectActionsProps {
  status: ApprovalStatus;
  onApprove: () => void;
  onReject: () => void;
  isApproving?: boolean;
  isRejecting?: boolean;
}

// Shared between sellers and carriers admin detail screens — approve is a
// direct action (matches the mockup), reject gets a confirm step since it's
// the harder-to-undo one. Once status !== PENDING the buttons disappear
// entirely (the backend's 409 already guards this, this just avoids the
// user clicking into a guaranteed error).
export function ApproveRejectActions({
  status,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: ApproveRejectActionsProps) {
  if (status !== 'PENDING') {
    return null;
  }

  return (
    <div className="flex gap-2">
      <Button onClick={onApprove} disabled={isApproving || isRejecting}>
        {isApproving ? 'Approving…' : 'Approve'}
      </Button>
      <ConfirmDialog
        trigger={
          <Button
            variant="outline"
            className="text-destructive"
            disabled={isApproving || isRejecting}
          >
            Reject
          </Button>
        }
        title="Reject this application?"
        description="This marks the application as rejected. This action can't be undone from here."
        confirmLabel="Reject"
        variant="destructive"
        onConfirm={onReject}
        isConfirming={isRejecting}
      />
    </div>
  );
}
