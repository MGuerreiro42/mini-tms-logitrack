'use client';

import { ApproveRejectActions } from '@/components/common/approve-reject-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApprovalStatusPill } from '@/components/ui/status-pill';
import {
  useApproveCarrier,
  useRejectCarrier,
} from '../hooks/use-approve-reject-carrier';
import { useCarrier } from '../hooks/use-carrier';

export function CarrierDetailCard({ id }: { id: string }) {
  const { data: carrier, isLoading } = useCarrier(id);
  const approve = useApproveCarrier(id);
  const reject = useRejectCarrier(id);

  if (isLoading || !carrier) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            {carrier.companyName}
            <ApprovalStatusPill status={carrier.status} />
          </h1>
          <p className="text-sm text-muted-foreground">
            A state transition — approving an already-decided company returns
            409.
          </p>
        </div>
        <ApproveRejectActions
          status={carrier.status}
          onApprove={() => approve.mutate()}
          onReject={() => reject.mutate()}
          isApproving={approve.isPending}
          isRejecting={reject.isPending}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Manager email" value={carrier.email} />
          <Row label="Tax ID" value={carrier.document} mono />
          <Row label="Users" value={String(carrier.userCount)} />
          <Row
            label="Created"
            value={new Date(carrier.createdAt).toLocaleString()}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? 'font-mono text-xs' : 'font-medium'}>
        {value}
      </span>
    </div>
  );
}
