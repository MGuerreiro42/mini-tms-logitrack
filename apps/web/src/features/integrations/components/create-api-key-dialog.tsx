'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CopyField } from '@/components/common/copy-field';
import { FormError } from '@/components/common/form-error';
import { FormField } from '@/components/common/form-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useCreateApiKey } from '../hooks/use-api-keys';
import type { CreatedApiKey } from '../types';

const API_KEY_NAME_MAX_LENGTH = 60;

const apiKeySchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(API_KEY_NAME_MAX_LENGTH),
});

type ApiKeyFormValues = z.infer<typeof apiKeySchema>;

// The form it replaces held focus, so the key's Copy button takes it instead of the dialog losing it.
const focusOnMount = (node: HTMLElement | null) => node?.focus();

export function CreateApiKeyDialog() {
  const [open, setOpen] = useState(false);
  const create = useCreateApiKey();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApiKeyFormValues>({ resolver: zodResolver(apiKeySchema) });

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) {
      create.reset();
      reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Create key</Button>
      </DialogTrigger>
      <DialogContent
        // An outside click must not throw away a key that is never shown again; Esc and Done still close.
        onInteractOutside={(event) => {
          if (create.data) event.preventDefault();
        }}
      >
        {create.data ? (
          <CreatedKey apiKey={create.data} />
        ) : (
          <form
            className="grid gap-4"
            noValidate
            onSubmit={handleSubmit(({ name }) => create.mutate(name))}
          >
            <DialogHeader>
              <DialogTitle>Create an API key</DialogTitle>
              <DialogDescription>
                Name it after the system that will use it.
              </DialogDescription>
            </DialogHeader>
            <FormField
              id="api-key-name"
              label="Name"
              maxLength={API_KEY_NAME_MAX_LENGTH}
              error={errors.name?.message}
              {...register('name')}
            />
            <FormError error={create.error} />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Creating…' : 'Create key'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreatedKey({ apiKey }: { apiKey: CreatedApiKey }) {
  const descriptionId = useId();

  return (
    <>
      <DialogHeader>
        <DialogTitle>API key created</DialogTitle>
        <DialogDescription>
          {/* Its own id: Radix keeps the description's id for the dialog itself. */}
          <span id={descriptionId}>
            {apiKey.name} — copy it now; you won't see it again.
          </span>
        </DialogDescription>
      </DialogHeader>
      <CopyField
        value={apiKey.key}
        isLink={false}
        label="Copy API key"
        copiedMessage="Key copied"
        failedMessage="Couldn't copy the key"
        buttonRef={focusOnMount}
        describedBy={descriptionId}
      />
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="strong">Done</Button>
        </DialogClose>
      </DialogFooter>
    </>
  );
}
