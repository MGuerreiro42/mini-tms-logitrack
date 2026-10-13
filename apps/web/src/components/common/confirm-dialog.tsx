'use client';

import { useState } from 'react';
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

interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  dismissLabel?: string;
  onConfirm: () => Promise<unknown>;
  onOpenChange?: (open: boolean) => void;
  variant?: 'default' | 'destructive';
  children?: React.ReactNode;
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  dismissLabel = 'Cancel',
  onConfirm,
  onOpenChange,
  variant = 'default',
  children,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  function applyOpen(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  function requestOpen(next: boolean) {
    if (!isConfirming) applyOpen(next);
  }

  // A failure keeps the dialog and its inputs for a retry; reporting the error is the caller's job.
  async function confirm() {
    setIsConfirming(true);
    const succeeded = await onConfirm().then(
      () => true,
      () => false,
    );
    setIsConfirming(false);
    if (succeeded) applyOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={requestOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isConfirming}>
              {dismissLabel}
            </Button>
          </DialogClose>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={confirm}
            disabled={isConfirming}
          >
            {isConfirming ? 'Working…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
