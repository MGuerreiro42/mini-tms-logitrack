'use client';

import { useId } from 'react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';
import { DEMO_ADMIN_DECISION_NOTE, DEMO_ADMIN_EMAIL } from '@/lib/demo';
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
  const isDemoAdmin = useSession()?.email === DEMO_ADMIN_EMAIL;
  // Only a pending application has actions to refuse.
  const blocked = isPending && isDemoAdmin;
  const noteId = useId();
  const disabled = isApproving || isRejecting || blocked;
  const describedBy = blocked ? noteId : undefined;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isPending && (
        <Button
          onClick={onApprove}
          disabled={disabled}
          aria-describedby={describedBy}
        >
          {isApproving ? 'Approving…' : 'Approve'}
        </Button>
      )}
      <ConfirmDialog
        available={isPending}
        unavailableMessage="This application was already reviewed."
        trigger={
          <Button
            variant="destructive"
            disabled={disabled}
            aria-describedby={describedBy}
          >
            Reject
          </Button>
        }
        title="Reject this application?"
        description="This marks the application as rejected. This action can't be undone from here."
        confirmLabel="Reject"
        variant="destructive"
        onConfirm={onReject}
      />
      {blocked && (
        <p id={noteId} className="text-[13px] text-muted-foreground">
          {DEMO_ADMIN_DECISION_NOTE}
        </p>
      )}
    </div>
  );
}
