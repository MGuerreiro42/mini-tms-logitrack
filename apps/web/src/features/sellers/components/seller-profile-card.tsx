'use client';

import { DetailRow } from '@/components/common/detail-row';
import { QueryState } from '@/components/common/query-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApprovalStatusPill } from '@/components/ui/status-pill';
import { useMySeller } from '../hooks/use-my-seller';

export function SellerProfileCard() {
  const query = useMySeller();

  return (
    <QueryState query={query} errorMessage="Couldn't load your company.">
      {(seller) => (
        <div className="grid gap-4 md:grid-cols-[1fr_260px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Company details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <DetailRow label="Company name" value={seller.companyName} />
              <DetailRow label="Email" value={seller.email} />
              <DetailRow label="Tax ID" value={seller.document} mono />
              <DetailRow
                label="Created"
                value={new Date(seller.createdAt).toLocaleDateString()}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ApprovalStatusPill status={seller.status} />
            </CardContent>
          </Card>
        </div>
      )}
    </QueryState>
  );
}
