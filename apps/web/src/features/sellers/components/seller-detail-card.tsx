'use client';

import { ApproveRejectActions } from '@/components/common/approve-reject-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApprovalStatusPill } from '@/components/ui/status-pill';
import {
  useApproveSeller,
  useRejectSeller,
} from '../hooks/use-approve-reject-seller';
import { useSeller } from '../hooks/use-seller';

export function SellerDetailCard({ id }: { id: string }) {
  const { data: seller, isLoading } = useSeller(id);
  const approve = useApproveSeller(id);
  const reject = useRejectSeller(id);

  if (isLoading || !seller) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            {seller.companyName}
            <ApprovalStatusPill status={seller.status} />
          </h1>
          <p className="text-sm text-muted-foreground">
            A state transition — approving an already-decided application
            returns 409.
          </p>
        </div>
        <ApproveRejectActions
          status={seller.status}
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
          <Row label="Email" value={seller.email} />
          <Row label="Tax ID" value={seller.document} mono />
          <Row
            label="Created"
            value={new Date(seller.createdAt).toLocaleString()}
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
