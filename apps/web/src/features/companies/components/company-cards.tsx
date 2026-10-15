'use client';

import type { ReactNode } from 'react';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { DetailRow } from '@/components/common/detail-row';
import { PageHeader } from '@/components/common/page-header';
import { Panel } from '@/components/common/panel';
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

function DetailsPanel({
  rows,
  aside,
}: {
  rows: CompanyDetail[];
  aside?: ReactNode;
}) {
  return (
    <Panel title="Company details" aside={aside} className="max-w-3xl">
      <div className="text-sm">
        {rows.map((row) => (
          <DetailRow key={row.label} {...row} />
        ))}
      </div>
    </Panel>
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
    <DetailsPanel
      aside={<ApprovalStatusBadge status={company.status} />}
      rows={[{ label: 'Company name', value: company.companyName }, ...rows]}
    />
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
  back,
  approve,
  reject,
}: {
  company: Company;
  rows: CompanyDetail[];
  back: { href: string; label: string };
  approve: Mutation;
  reject: Mutation;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Breadcrumb parent={back}>{company.companyName}</Breadcrumb>
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-3.5">
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
      </div>
      <DetailsPanel rows={rows} />
    </div>
  );
}
