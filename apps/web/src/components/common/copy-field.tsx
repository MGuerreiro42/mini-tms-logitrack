'use client';

import { CopyIcon } from 'lucide-react';
import type { ReactNode, Ref } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FIELD_CLASS =
  'min-w-0 flex-1 rounded-md border bg-muted/50 px-3 py-2 font-mono text-xs pointer-coarse:py-3.5';

interface CopyFieldProps {
  value: string;
  label: string;
  copiedMessage?: string;
  failedMessage?: string;
  isLink?: boolean;
  // Shown instead of the value, e.g. a masked secret; the copy is still the real value.
  display?: ReactNode;
  buttonRef?: Ref<HTMLButtonElement>;
  describedBy?: string;
}

export function CopyField({
  value,
  label,
  copiedMessage = 'Copied',
  failedMessage = "Couldn't copy",
  isLink = true,
  display = value,
  buttonRef,
  describedBy,
}: CopyFieldProps) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(copiedMessage);
    } catch {
      toast.error(failedMessage);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {isLink ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className={cn(FIELD_CLASS, 'truncate hover:underline')}
        >
          {display}
        </a>
      ) : (
        <code className={cn(FIELD_CLASS, 'break-all')}>{display}</code>
      )}
      <Button
        type="button"
        size="icon"
        variant="outline"
        ref={buttonRef}
        aria-label={label}
        aria-describedby={describedBy}
        onClick={copy}
      >
        <CopyIcon />
      </Button>
    </div>
  );
}
