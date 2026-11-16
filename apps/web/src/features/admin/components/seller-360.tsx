'use client';

import { StatusDistribution } from '@/components/common/charts/status-distribution';
import { CopyText } from '@/components/common/copy-field';
import { EmptyState } from '@/components/common/feedback-state';
import { OnTimeTile } from '@/components/common/on-time-tile';
import { Panel } from '@/components/common/panel';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import { StatTile } from '@/components/common/stat-tile';
import { WindowSelector } from '@/components/common/window-selector';
import { Badge } from '@/components/ui/badge';
import {
  CompanyReview,
  TenantHeader,
} from '@/features/companies/components/company-cards';
import {
  useApproveSeller,
  useRejectSeller,
} from '@/features/sellers/hooks/use-approve-reject-seller';
import {
  useSeller,
  useSellerModalities,
} from '@/features/sellers/hooks/use-seller';
import { sellerDetails } from '@/features/sellers/lib/seller-details';
import type { Seller } from '@/features/sellers/types';
import {
  useAdminMetrics,
  useAdminShipmentStatusCounts,
  useRecentShipments,
} from '@/features/shipments/hooks/use-admin-shipments';
import { useShipmentTracking } from '@/features/shipments/hooks/use-shipment-tracking';
import { useStatsWindow, windowLabel } from '@/hooks/use-stats-window';
import { formatTaxId } from '@/lib/br-documents';
import { formatDateTime } from '@/lib/format-date';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';

const BACK = { href: '/admin/sellers', label: 'Sellers' };

export function Seller360({ id }: { id: string }) {
  const query = useSeller(id);
  const approve = useApproveSeller(id);
  const reject = useRejectSeller(id);

  return (
    <QueryState
      query={query}
      errorMessage="Couldn't load this seller."
      notFoundMessage="Seller not found."
    >
      {(seller) =>
        seller.status === 'APPROVED' ? (
          <ApprovedSeller seller={seller} justApproved={approve.isSuccess} />
        ) : (
          <CompanyReview
            company={seller}
            rows={sellerDetails(seller, formatDateTime)}
            back={BACK}
            approve={approve}
            reject={reject}
          />
        )
      }
    </QueryState>
  );
}

function ApprovedSeller({
  seller,
  justApproved,
}: {
  seller: Seller;
  justApproved: boolean;
}) {
  // One reader of the window per page: the selector and the queries share it.
  const [statsWindow, setStatsWindow] = useStatsWindow();
  const scope = windowLabel(statsWindow);
  const { status: liveStatus } = useShipmentTracking({
    subscribeToMonitoring: true,
  });
  const sellerId = seller.id;
  const metrics = useAdminMetrics(
    { sellerId, window: statsWindow },
    liveStatus,
  );
  const counts = useAdminShipmentStatusCounts(
    { sellerId, window: statsWindow },
    liveStatus,
  );
  const recent = useRecentShipments({ sellerId }, liveStatus);
  const total = recent.data?.meta.total;
  const monitoring = (search: string) =>
    `${ROUTES.adminMonitoring}?sellerId=${sellerId}&${search}`;
  const dimmed = metrics.isPlaceholderData && 'opacity-60';

  return (
    <div className="flex flex-col gap-5">
      <TenantHeader
        company={seller}
        back={BACK}
        focusTitle={justApproved}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <CopyText value={seller.email} label="Copy e-mail" />
            <CopyText
              value={seller.document}
              display={formatTaxId(seller.document)}
              label="Copy tax ID"
              mono
            />
          </span>
        }
        action={
          total !== 0 && (
            <WindowSelector value={statsWindow} onChange={setStatsWindow} />
          )
        }
      />
      {/* Nothing until the total is known, so a seller without shipments never flashes zero tiles. */}
      {total === undefined && !recent.error ? (
        <QuerySkeleton />
      ) : total === 0 ? (
        <EmptyState
          title="No shipments yet"
          description="Metrics appear once this seller creates a shipment."
        />
      ) : (
        <>
          <QueryState query={metrics} errorMessage="Couldn't load the metrics.">
            {(data) => (
              <div
                aria-busy={metrics.isPlaceholderData}
                className={cn(
                  'grid grid-cols-2 gap-4 transition-opacity lg:grid-cols-4',
                  dimmed,
                )}
              >
                <StatTile
                  label="Shipments"
                  scope={scope}
                  value={data.shipments}
                  href={monitoring(`view=ALL&window=${statsWindow}`)}
                  linkLabel="View in Monitoring"
                />
                <OnTimeTile onTime={data.onTime} scope={scope} />
                <StatTile
                  label="Active"
                  scope="now"
                  value={data.active}
                  href={monitoring('view=active')}
                  linkLabel="View active shipments"
                />
                <StatTile
                  label="Late"
                  scope="now"
                  value={data.lateNow}
                  tone={data.lateNow > 0 ? 'critical' : undefined}
                  href={monitoring('view=late')}
                  linkLabel="View late shipments"
                />
              </div>
            )}
          </QueryState>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
            <QueryState
              query={counts}
              skeleton={<QuerySkeleton />}
              errorMessage="Couldn't load the status counts."
            >
              {(data) => (
                <StatusDistribution
                  counts={data}
                  title={`Status · ${scope}`}
                  emptyMessage="No shipments in this window."
                />
              )}
            </QueryState>
            <SellerModalities id={sellerId} />
          </div>
        </>
      )}
    </div>
  );
}

function SellerModalities({ id }: { id: string }) {
  const query = useSellerModalities(id);

  return (
    <Panel
      title="Modalities"
      isEmpty={query.data?.every((modality) => !modality.enabled)}
      emptyMessage="No modality enabled."
    >
      <QueryState
        query={query}
        skeleton={<QuerySkeleton variant="lines" />}
        errorMessage="Couldn't load the modalities."
      >
        {(modalities) => (
          <ul className="flex flex-wrap gap-2" aria-label="Enabled modalities">
            {modalities
              .filter((modality) => modality.enabled)
              .map((modality) => (
                <li key={modality.id}>
                  <Badge variant="secondary">{modality.name}</Badge>
                </li>
              ))}
          </ul>
        )}
      </QueryState>
    </Panel>
  );
}
