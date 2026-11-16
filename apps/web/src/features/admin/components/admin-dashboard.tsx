'use client';

import { OnTimeRows } from '@/components/common/charts/on-time-rows';
import { MedianClaimTile } from '@/components/common/median-claim-tile';
import { OnTimeTile } from '@/components/common/on-time-tile';
import { PageHeader } from '@/components/common/page-header';
import { Panel } from '@/components/common/panel';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import { StatTile } from '@/components/common/stat-tile';
import { TextLink } from '@/components/common/text-link';
import { WindowSelector } from '@/components/common/window-selector';
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
import type { AdminMetrics } from '@/features/shipments/types';
import { useStatsWindow, windowLabel } from '@/hooks/use-stats-window';
import { formatTaxId } from '@/lib/br-documents';
import { formatDate } from '@/lib/format-date';
import { hasEnoughData, notEnoughNote } from '@/lib/metrics';
import { plural } from '@/lib/plural';
import { ROUTES } from '@/lib/routes';
import { sumRecord } from '@/lib/sum-record';
import { cn } from '@/lib/utils';
import { useAdminDashboard } from '../hooks/use-admin-dashboard';
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

export function AdminDashboard() {
  // One reader of the window per page: the selector and the queries share it.
  const [statsWindow, setStatsWindow] = useStatsWindow();
  const { approvals, metrics } = useAdminDashboard(statsWindow);
  const counts = approvals.data;
  const waiting = counts ? counts.sellers.PENDING + counts.carriers.PENDING : 0;
  const scope = windowLabel(statsWindow);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Platform overview"
        description={
          approvals.error && !counts
            ? "Couldn't load the applications waiting for review."
            : !counts
              ? undefined
              : waiting > 0
                ? `${plural(waiting, 'application')} waiting for review`
                : 'No applications waiting for review'
        }
        action={
          <WindowSelector value={statsWindow} onChange={setStatsWindow} />
        }
      />
      <QueryState
        query={metrics}
        errorMessage="Couldn't load platform metrics."
      >
        {(data) => (
          // The previous window's numbers stay, dimmed, until the new ones arrive.
          <div
            aria-busy={metrics.isPlaceholderData}
            className={cn(
              'grid grid-cols-2 gap-4 transition-opacity lg:grid-cols-4',
              metrics.isPlaceholderData && 'opacity-60',
            )}
          >
            <PlatformTiles data={data} scope={scope} />
          </div>
        )}
      </QueryState>
      {/* Grid items stretch to the row, so both columns end flush. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <Panel
          title={`On time by carrier · ${scope}`}
          className={cn(
            'transition-opacity',
            metrics.isPlaceholderData && 'opacity-60',
          )}
          isEmpty={metrics.data?.byCarrier.length === 0}
          emptyMessage="No approved carrier yet."
        >
          <QueryState
            query={metrics}
            skeleton={<QuerySkeleton variant="lines" />}
            errorMessage="Couldn't load platform metrics."
          >
            {(data) => (
              <div aria-busy={metrics.isPlaceholderData}>
                <OnTimeRows
                  rows={data.byCarrier.map((carrier) => ({
                    key: carrier.carrierId,
                    label: (
                      <TextLink href={KINDS.carrier.href(carrier.carrierId)}>
                        {carrier.companyName}
                      </TextLink>
                    ),
                    rate: carrier.rate,
                    n: carrier.n,
                  }))}
                />
              </div>
            )}
          </QueryState>
        </Panel>
        <PendingApplications
          waiting={waiting}
          tenants={
            counts &&
            `${plural(counts.sellers.APPROVED, 'seller')} · ${plural(counts.carriers.APPROVED, 'carrier')}`
          }
        />
      </div>
    </div>
  );
}

function PlatformTiles({ data, scope }: { data: AdminMetrics; scope: string }) {
  const { firstAttempt } = data;
  const firstRate = hasEnoughData(firstAttempt.n) ? firstAttempt.rate : null;
  return (
    <>
      <OnTimeTile onTime={data.onTime} scope={scope} />
      <StatTile
        label="Late"
        scope="now"
        value={data.lateNow}
        tone={data.lateNow > 0 ? 'critical' : undefined}
        href={`${ROUTES.adminMonitoring}?view=late`}
        linkLabel="View late shipments"
        note={`${data.active} active now`}
      />
      <StatTile
        label="Failed"
        scope={scope}
        value={firstRate === null ? '—' : `${(100 - firstRate).toFixed(1)}%`}
        note={
          firstRate !== null
            ? `${firstAttempt.failed} failed · ${firstAttempt.returned} returned`
            : notEnoughNote(firstAttempt.n, 'deliveries')
        }
        definition={`Outcomes with a failed delivery ÷ shipments created in the last ${scope} that were delivered or ever failed (n=${firstAttempt.n}). A failure that later returned still counts.`}
      />
      <MedianClaimTile claim={data.claim} scope={scope} />
    </>
  );
}

function PendingApplications({
  waiting,
  tenants,
}: {
  waiting: number;
  tenants?: string;
}) {
  const query = usePendingApplications();
  const hidden = waiting - (query.data?.length ?? 0);

  return (
    <Panel
      title="Waiting for review"
      description={tenants}
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
          <TextLink
            href={kind.href(application.id)}
            className="truncate text-[15px] text-foreground pointer-coarse:block pointer-coarse:leading-11"
          >
            {application.companyName}
          </TextLink>
          <Badge variant="secondary">{kind.label}</Badge>
        </div>
        <span className="text-[13px] text-muted-foreground">
          Tax ID{' '}
          <span className="font-mono">{formatTaxId(application.document)}</span>{' '}
          · Signed up {formatDate(application.createdAt)}
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
