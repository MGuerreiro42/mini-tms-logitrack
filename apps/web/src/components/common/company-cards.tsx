'use client';

import { ApproveRejectActions } from '@/components/common/approve-reject-actions';
import { DetailRow } from '@/components/common/detail-row';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApprovalStatusPill } from '@/components/ui/status-pill';
import type { ApprovalStatus } from '@/types/status';

export interface CompanyDetail {
  label: string;
  value: string;
  mono?: boolean;
}

interface Company {
  companyName: string;
  status: ApprovalStatus;
}

function DetailsCard({
  title,
  rows,
}: {
  title: string;
  rows: CompanyDetail[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {rows.map((row) => (
          <DetailRow key={row.label} {...row} />
        ))}
      </CardContent>
    </Card>
  );
}

// The signed-in seller's or carrier's own company page.
export function CompanyProfile({
  company,
  rows,
}: {
  company: Company;
  rows: CompanyDetail[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_260px]">
      <DetailsCard
        title="Company details"
        rows={[{ label: 'Company name', value: company.companyName }, ...rows]}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ApprovalStatusPill status={company.status} />
        </CardContent>
      </Card>
    </div>
  );
}

interface Mutation {
  mutate: () => void;
  mutateAsync: () => Promise<unknown>;
  isPending: boolean;
}

// The admin's review page for a seller or carrier application.
export function CompanyReview({
  company,
  rows,
  approve,
  reject,
}: {
  company: Company;
  rows: CompanyDetail[];
  approve: Mutation;
  reject: Mutation;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            {company.companyName}
            <ApprovalStatusPill status={company.status} />
          </h1>
          <p className="text-sm text-muted-foreground">
            Review the company details before deciding.
          </p>
        </div>
        <ApproveRejectActions
          status={company.status}
          onApprove={() => approve.mutate()}
          onReject={() => reject.mutateAsync()}
          isApproving={approve.isPending}
          isRejecting={reject.isPending}
        />
      </div>
      <DetailsCard title="Details" rows={rows} />
    </div>
  );
}
