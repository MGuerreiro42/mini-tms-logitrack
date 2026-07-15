'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApprovalStatusPill } from '@/components/ui/status-pill';
import { useMySeller } from '../hooks/use-my-seller';

export function SellerProfileCard() {
  const { data: seller, isLoading } = useMySeller();

  if (isLoading || !seller) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_260px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Company details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Company name" value={seller.companyName} />
          <Row label="Email" value={seller.email} />
          <Row label="Tax ID" value={seller.document} mono />
          <Row
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
