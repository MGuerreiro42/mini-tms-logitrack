'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { CopyField } from '@/components/common/copy-field';
import { FormError } from '@/components/common/form-error';
import { FormField } from '@/components/common/form-field';
import { Panel } from '@/components/common/panel';
import { QueryState } from '@/components/common/query-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { HTTP_STATUS } from '@/lib/http-status';
import { apiErrorMessage } from '@/lib/toast-api-error';
import { hasStatus } from '@/services/api-client';
import {
  useRotateWebhookSecret,
  useUpdateWebhookEndpoint,
  useWebhookEndpoint,
} from '../hooks/use-webhook-endpoint';
import { WEBHOOK_EVENT_LABEL, WEBHOOK_EVENTS } from '../lib/delivery-status';
import type { WebhookEndpoint } from '../types';

const endpointSchema = z.object({
  url: z.url('Enter a valid URL'),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1, 'Choose at least one event'),
  active: z.boolean(),
});

type EndpointFormValues = z.infer<typeof endpointSchema>;

const MASK = '•'.repeat(24);

export function WebhookEndpointCard() {
  return (
    <QueryState
      query={useWebhookEndpoint()}
      errorMessage="Couldn't load your webhook endpoint."
    >
      {(endpoint) => <EndpointPanel endpoint={endpoint} />}
    </QueryState>
  );
}

function EndpointPanel({ endpoint }: { endpoint: WebhookEndpoint }) {
  const update = useUpdateWebhookEndpoint();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EndpointFormValues>({
    resolver: zodResolver(endpointSchema),
    values: {
      url: endpoint.url,
      events: endpoint.events,
      active: endpoint.active,
    },
    // A rotate or refetch replaces `values`; edits the seller has not saved survive it.
    resetOptions: { keepDirtyValues: true },
  });
  // The server's URL check (https, public address) belongs on the URL field.
  const urlRejected = hasStatus(update.error, HTTP_STATUS.BAD_REQUEST);

  function save(values: EndpointFormValues) {
    update.mutate(values, {
      onError: (error) => {
        if (hasStatus(error, HTTP_STATUS.BAD_REQUEST)) {
          setError('url', { message: apiErrorMessage(error) });
        }
      },
    });
  }

  return (
    <Panel
      title="Webhook endpoint"
      aside={
        endpoint.url === endpoint.inboxUrl && (
          <Badge variant="secondary">Inbox</Badge>
        )
      }
      footer={
        <p className="text-[13px] text-muted-foreground">
          Verify signatures with any Standard Webhooks library.
        </p>
      }
    >
      <form className="space-y-4" noValidate onSubmit={handleSubmit(save)}>
        <FormField
          id="endpoint-url"
          type="url"
          label="URL"
          inputMode="url"
          error={errors.url?.message}
          {...register('url')}
        />
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Events</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {WEBHOOK_EVENTS.map((event) => (
              <label
                key={event}
                className="flex items-center gap-2 font-mono text-[13px]"
              >
                <input
                  type="checkbox"
                  value={event}
                  className="size-4 accent-primary"
                  {...register('events')}
                />
                {WEBHOOK_EVENT_LABEL[event]}
              </label>
            ))}
          </div>
          {errors.events && (
            <p role="alert" className="text-sm text-destructive">
              {errors.events.message}
            </p>
          )}
        </fieldset>
        <label
          htmlFor="endpoint-active"
          className="flex items-center justify-between gap-4"
        >
          <span className="text-sm font-semibold">Active</span>
          <Controller
            control={control}
            name="active"
            render={({ field }) => (
              <Switch
                id="endpoint-active"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </label>
        <FormError error={urlRejected ? null : update.error} />
        <div className="flex justify-end">
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save endpoint'}
          </Button>
        </div>
      </form>
      <SigningSecret secret={endpoint.secret} />
    </Panel>
  );
}

function SigningSecret({ secret }: { secret: string }) {
  const [revealed, setRevealed] = useState(false);
  const rotate = useRotateWebhookSecret();

  return (
    <div className="space-y-1.5 border-t border-muted pt-4">
      <p className="text-sm font-semibold">Signing secret</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 sm:flex-1">
          <CopyField
            value={secret}
            display={
              revealed ? (
                secret
              ) : (
                <>
                  {secret.slice(0, 6)}
                  <span aria-hidden>{MASK}</span>
                  <span className="sr-only">(hidden)</span>
                </>
              )
            }
            isLink={false}
            label="Copy signing secret"
            copiedMessage="Secret copied"
            failedMessage="Couldn't copy the secret"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Show secret"
            aria-pressed={revealed}
            onClick={() => setRevealed((value) => !value)}
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
          <ConfirmDialog
            trigger={<Button variant="outline">Rotate</Button>}
            title="Rotate the signing secret?"
            description="Deliveries from now on are signed with the new secret. Update your receiver right away or they'll fail verification."
            confirmLabel="Rotate secret"
            onConfirm={() => rotate.mutateAsync().then(() => setRevealed(true))}
          />
        </div>
      </div>
    </div>
  );
}
