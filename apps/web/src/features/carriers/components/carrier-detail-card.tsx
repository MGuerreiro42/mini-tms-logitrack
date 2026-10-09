'use client';

import { ApproveRejectActions } from '@/components/common/approve-reject-actions';
import { DetailRow } from '@/components/common/detail-row';
import { QueryState } from '@/components/common/query-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApprovalStatusPill } from '@/components/ui/status-pill';
import {
  useApproveCarrier,
  useRejectCarrier,
} from '../hooks/use-approve-reject-carrier';
import { useCarrier } from '../hooks/use-carrier';

export function CarrierDetailCard({ id }: { id: string }) {
  const query = useCarrier(id);
  const approve = useApproveCarrier(id);
  const reject = useRejectCarrier(id);

  return (
    <QueryState
      query={query}
      errorMessage="Couldn't load this carrier."
      notFoundMessage="Carrier not found."
    >
      {(carrier) => (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-semibold">
                {carrier.companyName}
                <ApprovalStatusPill status={carrier.status} />
              </h1>
              <p className="text-sm text-muted-foreground">
                Review the company details before deciding.
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
              <DetailRow label="Manager email" value={carrier.email} />
              <DetailRow label="Tax ID" value={carrier.document} mono />
              <DetailRow label="Users" value={String(carrier.userCount)} />
              <DetailRow
                label="Created"
                value={new Date(carrier.createdAt).toLocaleString()}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </QueryState>
  );
}
