'use client';

import Link from 'next/link';
import { StatusDistribution } from '@/components/common/charts/status-distribution';
import { PageHeader } from '@/components/common/page-header';
import { Panel } from '@/components/common/panel';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import { StatTile } from '@/components/common/stat-tile';
import { Badge } from '@/components/ui/badge';
import {
  useApproveCarrier,
  useRejectCarrier,
} from '@/features/carriers/hooks/use-approve-reject-carrier';
import { ApproveRejectActions } from '@/features/companies/components/approve-reject-actions';
import {
  useApproveSeller,
  useRejectSeller,
} from '@/features/sellers/hooks/use-approve-reject-seller';
import { formatDate } from '@/lib/format-date';
import { plural } from '@/lib/plural';
import { HAPPY_PATH } from '@/lib/shipment-progress';
import { sumRecord } from '@/lib/sum-record';
import type {
  ApprovalStatusCounts,
  ShipmentStatusCounts,
} from '@/types/status';
import {
  type AdminDashboardData,
  useAdminDashboard,
} from '../hooks/use-admin-dashboard';
import {
  type Application,
  type ApplicationKind,
  usePendingApplications,
} from '../hooks/use-pending-applications';

const KINDS = {
  seller: {
    label: 'Seller',
    href: (id: string) => `/admin/sellers/${id}`,
    useApprove: useApproveSeller,
    useReject: useRejectSeller,
  },
  carrier: {
    label: 'Carrier',
    href: (id: string) => `/admin/carriers/${id}`,
    useApprove: useApproveCarrier,
    useReject: useRejectCarrier,
  },
} satisfies Record<ApplicationKind, unknown>;

const IN_PROGRESS = HAPPY_PATH.filter((status) => status !== 'DELIVERED');

export function AdminDashboard({
  shipmentCounts,
}: {
  shipmentCounts: ShipmentStatusCounts;
}) {
  return (
    <QueryState query={useAdminDashboard()}>
      {(counts) => (
        <AdminDashboardView counts={counts} shipmentCounts={shipmentCounts} />
      )}
    </QueryState>
  );
}

function AdminDashboardView({
  counts,
  shipmentCounts,
}: {
  counts: AdminDashboardData;
  shipmentCounts: ShipmentStatusCounts;
}) {
  const waiting = counts.sellers.PENDING + counts.carriers.PENDING;
  const shipments = sumRecord(shipmentCounts);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Platform overview"
        description={
          waiting > 0
            ? `${plural(waiting, 'application')} waiting for review`
            : 'No applications waiting for review'
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start">
        <PendingApplications waiting={waiting} />
        <StatusDistribution counts={shipmentCounts} />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Sellers"
          value={sumRecord(counts.sellers)}
          note={approvalNote(counts.sellers)}
        />
        <StatTile
          label="Carriers"
          value={sumRecord(counts.carriers)}
          note={approvalNote(counts.carriers)}
        />
        <StatTile
          label="In progress"
          value={IN_PROGRESS.reduce(
            (sum, status) => sum + shipmentCounts[status],
            0,
          )}
          note="Across all carriers"
        />
        <StatTile
          label="Delivered"
          value={shipmentCounts.DELIVERED}
          note={`Of ${plural(shipments, 'shipment')}`}
        />
      </div>
    </div>
  );
}

function approvalNote(counts: ApprovalStatusCounts): string {
  return `${counts.APPROVED} approved · ${counts.PENDING} pending`;
}

function PendingApplications({ waiting }: { waiting: number }) {
  const query = usePendingApplications();
  const hidden = waiting - (query.data?.length ?? 0);

  return (
    <Panel
      title="Waiting for review"
      className="gap-2"
      footer={
        hidden > 0 && (
          <span className="text-[13px] text-muted-foreground">
            {plural(hidden, 'more application')} in Sellers and Carriers
          </span>
        )
      }
    >
      <QueryState
        query={query}
        skeleton={<QuerySkeleton variant="lines" />}
        errorMessage="Couldn't load pending applications."
      >
        {(applications) =>
          applications.length === 0 ? (
            <p className="border-t border-muted py-3 text-sm text-muted-foreground">
              Nothing to review. New seller and carrier sign-ups show up here.
            </p>
          ) : (
            <ul aria-label="Pending applications">
              {applications.map((application) => (
                <ApplicationRow
                  key={`${application.kind}-${application.id}`}
                  application={application}
                />
              ))}
            </ul>
          )
        }
      </QueryState>
    </Panel>
  );
}

function ApplicationRow({ application }: { application: Application }) {
  const kind = KINDS[application.kind];
  const approve = kind.useApprove(application.id);
  const reject = kind.useReject(application.id);

  return (
    <li className="flex flex-col gap-3 border-t border-muted py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <Link
            href={kind.href(application.id)}
            className="truncate rounded-xs text-[15px] font-semibold outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center"
          >
            {application.companyName}
          </Link>
          <Badge variant="secondary">{kind.label}</Badge>
        </div>
        <span className="text-[13px] text-muted-foreground">
          Tax ID <span className="font-mono">{application.document}</span> ·
          Signed up {formatDate(application.createdAt)}
        </span>
      </div>
      <ApproveRejectActions
        status="PENDING"
        onApprove={() => approve.mutate()}
        onReject={() => reject.mutateAsync()}
        isApproving={approve.isPending}
        isRejecting={reject.isPending}
      />
    </li>
  );
}
