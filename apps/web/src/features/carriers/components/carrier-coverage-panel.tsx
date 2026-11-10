'use client';

import { Panel } from '@/components/common/panel';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import { Badge } from '@/components/ui/badge';
import { combineQueries } from '@/lib/combine-queries';
import {
  useCarrierCoverageAreas,
  useCarrierModalities,
} from '../hooks/use-carrier';

// Read-only: where the carrier delivers and which modalities it runs, for the admin.
export function CarrierCoveragePanel({ id }: { id: string }) {
  const query = combineQueries(
    [useCarrierCoverageAreas(id), useCarrierModalities(id)] as const,
    ([areas, modalities]) => ({ areas, modalities }),
  );

  return (
    <Panel title="Coverage & modalities">
      <QueryState
        query={query}
        skeleton={<QuerySkeleton variant="lines" />}
        errorMessage="Couldn't load the coverage."
      >
        {({ areas, modalities }) => (
          <div className="flex flex-col gap-4 text-sm">
            <Chips
              label="Coverage"
              empty="No coverage area yet."
              items={areas.map((area) => ({
                key: area.id,
                text: area.city
                  ? `${area.city}/${area.state}`
                  : `All of ${area.state}`,
              }))}
            />
            <Chips
              label="Modalities"
              empty="No modality enabled."
              items={modalities.map((modality) => ({
                key: modality.id,
                text:
                  modality.slaHours === null
                    ? modality.name
                    : `${modality.name} · ${modality.slaHours} h`,
              }))}
            />
          </div>
        )}
      </QueryState>
    </Panel>
  );
}

function Chips({
  label,
  empty,
  items,
}: {
  label: string;
  empty: string;
  items: { key: string; text: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[13px] text-muted-foreground">{label}</h3>
      {items.length === 0 ? (
        <p className="text-muted-foreground">{empty}</p>
      ) : (
        <ul aria-label={label} className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item.key}>
              <Badge variant="secondary">{item.text}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
