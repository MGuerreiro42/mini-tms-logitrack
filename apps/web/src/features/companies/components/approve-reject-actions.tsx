'use client';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import type { ApprovalStatus } from '@/types/status';

interface ApproveRejectActionsProps {
  status: ApprovalStatus;
  onApprove: () => void;
  onReject: () => Promise<unknown>;
  isApproving?: boolean;
  isRejecting?: boolean;
}

export function ApproveRejectActions({
  status,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: ApproveRejectActionsProps) {
  const isPending = status === 'PENDING';

  return (
    <div className="flex gap-2">
      {isPending && (
        <Button onClick={onApprove} disabled={isApproving || isRejecting}>
          {isApproving ? 'Approving…' : 'Approve'}
        </Button>
      )}
      <ConfirmDialog
        available={isPending}
        unavailableMessage="This application was already reviewed."
        trigger={
          <Button variant="destructive" disabled={isApproving || isRejecting}>
            Reject
          </Button>
        }
        title="Reject this application?"
        description="This marks the application as rejected. This action can't be undone from here."
        confirmLabel="Reject"
        variant="destructive"
        onConfirm={onReject}
      />
    </div>
  );
}
