'use client';

import { DetailRow } from '@/components/common/detail-row';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApprovalStatusBadge } from '@/components/ui/status-badge';
import type { ApprovalStatus } from '@/types/status';
import { ApproveRejectActions } from './approve-reject-actions';

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
          <ApprovalStatusBadge status={company.status} />
        </CardContent>
      </Card>
    </div>
  );
}

const REVIEW_SUBTITLE: Record<ApprovalStatus, string> = {
  PENDING: 'Review the company details before deciding.',
  APPROVED: 'This application was approved.',
  REJECTED: 'This application was rejected.',
};

interface Mutation {
  mutate: () => void;
  mutateAsync: () => Promise<unknown>;
  isPending: boolean;
}

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
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {company.companyName}
            <ApprovalStatusBadge status={company.status} />
          </span>
        }
        description={
          <span role="status">{REVIEW_SUBTITLE[company.status]}</span>
        }
        action={
          <ApproveRejectActions
            status={company.status}
            onApprove={() => approve.mutate()}
            onReject={() => reject.mutateAsync()}
            isApproving={approve.isPending}
            isRejecting={reject.isPending}
          />
        }
      />
      <DetailsCard title="Details" rows={rows} />
    </div>
  );
}
