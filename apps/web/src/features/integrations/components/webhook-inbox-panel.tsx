'use client';

import { useAutoAnimate } from '@formkit/auto-animate/react';
import { ShieldCheckIcon, ShieldXIcon } from 'lucide-react';
import { LiveIndicator } from '@/components/common/live-indicator';
import { Panel } from '@/components/common/panel';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useNow } from '@/hooks/use-now';
import { formatTimeAgo } from '@/lib/format-date';
import type { LiveConnection } from '@/lib/live-status';
import { LIST_ANIMATION } from '@/lib/motion';
import { toastApiError } from '@/lib/toast-api-error';
import { cn } from '@/lib/utils';
import {
  useUpdateWebhookEndpoint,
  useWebhookEndpoint,
} from '../hooks/use-webhook-endpoint';
import {
  useSetInboxFailing,
  useWebhookInbox,
} from '../hooks/use-webhook-inbox';
import { WEBHOOK_DELIVERY_STATUS } from '../lib/delivery-status';
import type { WebhookInboxRequest } from '../types';

const TIME_REFRESH_MS = 15_000;

export function WebhookInboxPanel({ live }: { live: LiveConnection }) {
  const inbox = useWebhookInbox(live.status);
  const endpoint = useWebhookEndpoint().data;
  const setFailing = useSetInboxFailing();
  const failRequests = setFailing.isPending
    ? setFailing.variables
    : inbox.data?.failRequests;

  return (
    <Panel
      title="Test inbox"
      aside={
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <LiveIndicator live={live} />
          <label
            htmlFor="inbox-fail-requests"
            className="flex items-center gap-2 text-sm font-semibold"
          >
            Fail requests
            <Switch
              id="inbox-fail-requests"
              checked={failRequests ?? false}
              disabled={!inbox.data || setFailing.isPending}
              onCheckedChange={(checked) => setFailing.mutate(checked)}
            />
          </label>
        </div>
      }
    >
      <p className="-mt-2 text-[13px] text-muted-foreground">
        Receives your webhooks so you can inspect them without a server. Turn on
        Fail requests to answer 500 and test retries.
      </p>
      {endpoint && endpoint.url !== endpoint.inboxUrl && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-notice px-4 py-3 text-sm text-notice-foreground">
          <p className="min-w-0 flex-1">
            Your endpoint points to another URL; the inbox only receives while
            it is the endpoint.
          </p>
          <UseTestInboxButton inboxUrl={endpoint.inboxUrl} />
        </div>
      )}
      <QueryState
        query={inbox}
        skeleton={<QuerySkeleton variant="lines" />}
        errorMessage="Couldn't load the test inbox."
      >
        {({ requests }) => <InboxLog requests={requests} />}
      </QueryState>
    </Panel>
  );
}

function UseTestInboxButton({ inboxUrl }: { inboxUrl: string }) {
  const update = useUpdateWebhookEndpoint();

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      disabled={update.isPending}
      onClick={() =>
        update.mutate({ url: inboxUrl }, { onError: toastApiError })
      }
    >
      Use test inbox
    </Button>
  );
}

// Parsed only for display: the body is whatever the receiver got, so it may not be JSON.
function readBody(body: string): { type?: string; text: string } {
  try {
    const json: unknown = JSON.parse(body);
    const type =
      json && typeof json === 'object' && 'type' in json ? json.type : null;
    return {
      type: typeof type === 'string' ? type : undefined,
      text: JSON.stringify(json, null, 2),
    };
  } catch {
    return { text: body };
  }
}

// The log stays mounted while empty, so the first request is announced.
function InboxLog({ requests }: { requests: WebhookInboxRequest[] }) {
  const [listRef] = useAutoAnimate<HTMLOListElement>(LIST_ANIMATION);
  const now = useNow(TIME_REFRESH_MS);

  return (
    <>
      {requests.length === 0 && (
        <p className="border-t border-muted py-3 text-sm text-muted-foreground">
          Webhooks sent to your inbox show up here as they arrive.
        </p>
      )}
      <ol
        ref={listRef}
        role="log"
        aria-label="Inbox requests"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: it scrolls, so it must be keyboard reachable.
        tabIndex={0}
        className="max-h-[32rem] overflow-auto"
      >
        {requests.map((request) => (
          <li key={request.id} className="border-t border-muted py-3">
            <InboxRequestLine request={request} now={now} />
          </li>
        ))}
      </ol>
    </>
  );
}

function InboxRequestLine({
  request,
  now,
}: {
  request: WebhookInboxRequest;
  now: Date;
}) {
  const accepted = request.responseStatus < 300;
  const body = readBody(request.body);
  const SignatureIcon = request.signatureValid ? ShieldCheckIcon : ShieldXIcon;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        <time dateTime={request.receivedAt} className="text-muted-foreground">
          {formatTimeAgo(request.receivedAt, now)}
        </time>
        {body.type && <span className="font-mono">{body.type}</span>}
        <span className="min-w-0 truncate font-mono text-muted-foreground">
          {request.webhookId ?? 'No webhook-id'}
        </span>
        <Badge
          variant="plain"
          className={
            WEBHOOK_DELIVERY_STATUS[accepted ? 'SUCCEEDED' : 'FAILED'].className
          }
        >
          {request.responseStatus}
        </Badge>
        <span
          className={cn(
            'inline-flex items-center gap-1 font-semibold',
            request.signatureValid
              ? 'text-status-delivered-fg'
              : 'text-destructive',
          )}
        >
          <SignatureIcon aria-hidden className="size-3.5" />
          {request.signatureValid ? 'Signature valid' : 'Signature invalid'}
        </span>
      </div>
      <details>
        <summary className="cursor-pointer text-[13px] text-muted-foreground">
          Body
        </summary>
        <section
          aria-label="Request body"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: it scrolls, so it must be keyboard reachable.
          tabIndex={0}
          className="mt-2 max-h-72 overflow-auto rounded-md bg-muted/50 p-3"
        >
          <pre className="font-mono text-xs">{body.text}</pre>
        </section>
      </details>
    </div>
  );
}
