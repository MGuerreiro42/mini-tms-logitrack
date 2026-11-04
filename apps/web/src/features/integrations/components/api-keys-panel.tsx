'use client';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Panel } from '@/components/common/panel';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import { Button } from '@/components/ui/button';
import { formatDate, formatShortDateTime } from '@/lib/format-date';
import { useApiKeys, useRevokeApiKey } from '../hooks/use-api-keys';
import type { ApiKey } from '../types';
import { CreateApiKeyDialog } from './create-api-key-dialog';

export function ApiKeysPanel() {
  return (
    <Panel title="API keys" aside={<CreateApiKeyDialog />}>
      {/* Not Panel's description: beside the aside it would float mid-row. */}
      <p className="-mt-2 text-[13px] text-muted-foreground">
        Create and read shipments from your own systems.
      </p>
      <QueryState
        query={useApiKeys()}
        skeleton={<QuerySkeleton variant="lines" />}
        errorMessage="Couldn't load your API keys."
      >
        {(keys) =>
          keys.length === 0 ? (
            <p className="border-t border-muted py-3 text-sm text-muted-foreground">
              No API keys yet. Create one to call the API from a script.
            </p>
          ) : (
            <ul>
              {keys.map((key) => (
                <ApiKeyRow key={key.id} apiKey={key} />
              ))}
            </ul>
          )
        }
      </QueryState>
    </Panel>
  );
}

function ApiKeyRow({ apiKey }: { apiKey: ApiKey }) {
  const revoke = useRevokeApiKey();

  return (
    <li className="flex items-center gap-4 border-t border-muted py-3">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-semibold">{apiKey.name}</span>
        <span className="text-[13px] text-muted-foreground">
          <span className="font-mono">{apiKey.prefix}…</span> · Last used{' '}
          {apiKey.lastUsedAt ? formatShortDateTime(apiKey.lastUsedAt) : 'Never'}{' '}
          · Created {formatDate(apiKey.createdAt)}
        </span>
      </span>
      <ConfirmDialog
        trigger={
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            aria-label={`Revoke ${apiKey.name}`}
          >
            Revoke
          </Button>
        }
        title={`Revoke ${apiKey.name}?`}
        description="Requests with this key are rejected from now on. This can't be undone."
        confirmLabel="Revoke key"
        variant="destructive"
        onConfirm={() => revoke.mutateAsync(apiKey.id)}
      />
    </li>
  );
}
