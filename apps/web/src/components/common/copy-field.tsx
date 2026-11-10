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

type CopyButtonProps = Omit<CopyFieldProps, 'isLink' | 'display'> & {
  size?: 'icon' | 'icon-sm';
};

export function CopyButton({
  value,
  label,
  copiedMessage = 'Copied',
  failedMessage = "Couldn't copy",
  buttonRef,
  describedBy,
  size = 'icon',
}: CopyButtonProps) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(copiedMessage);
    } catch {
      toast.error(failedMessage);
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant="outline"
      ref={buttonRef}
      aria-label={label}
      aria-describedby={describedBy}
      onClick={copy}
    >
      <CopyIcon />
    </Button>
  );
}

// Inline text with a small copy button, e.g. an e-mail in a page header.
export function CopyText({
  value,
  display = value,
  label,
  mono,
}: {
  value: string;
  display?: string;
  label: string;
  mono?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn(mono && 'font-mono text-[13px]')}>{display}</span>
      <CopyButton value={value} label={label} size="icon-sm" />
    </span>
  );
}

export function CopyField({
  value,
  label,
  isLink = true,
  display = value,
  ...button
}: CopyFieldProps) {
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
      <CopyButton value={value} label={label} {...button} />
    </div>
  );
}
