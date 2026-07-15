'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApprovalStatusPill } from '@/components/ui/status-pill';
import { useMyCarrier } from '../hooks/use-my-carrier';

export function CarrierProfileCard() {
  const { data: carrier, isLoading } = useMyCarrier();

  if (isLoading || !carrier) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_260px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Company details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Company name" value={carrier.companyName} />
          <Row label="Manager email" value={carrier.email} />
          <Row label="Tax ID" value={carrier.document} mono />
          <Row label="Users" value={String(carrier.userCount)} />
          <Row
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
