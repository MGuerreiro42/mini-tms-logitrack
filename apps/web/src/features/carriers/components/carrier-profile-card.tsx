'use client';

import { DetailRow } from '@/components/common/detail-row';
import { QueryState } from '@/components/common/query-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApprovalStatusPill } from '@/components/ui/status-pill';
import { useMyCarrier } from '../hooks/use-my-carrier';

export function CarrierProfileCard() {
  const query = useMyCarrier();

  return (
    <QueryState query={query} errorMessage="Couldn't load your company.">
      {(carrier) => (
        <div className="grid gap-4 md:grid-cols-[1fr_260px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Company details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <DetailRow label="Company name" value={carrier.companyName} />
              <DetailRow label="Manager email" value={carrier.email} />
              <DetailRow label="Tax ID" value={carrier.document} mono />
              <DetailRow label="Users" value={String(carrier.userCount)} />
              <DetailRow
                label="Created"
                value={new Date(carrier.createdAt).toLocaleDateString()}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ApprovalStatusPill status={carrier.status} />
            </CardContent>
          </Card>
        </div>
      )}
    </QueryState>
  );
}
