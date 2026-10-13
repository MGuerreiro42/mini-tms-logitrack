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
import { apiErrorMessage } from '@/lib/toast-api-error';

interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  dismissLabel?: string;
  onConfirm: () => Promise<unknown>;
  onOpenChange?: (open: boolean) => void;
  variant?: 'default' | 'destructive';
  available?: boolean;
  unavailableMessage?: string;
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
  available = true,
  unavailableMessage = 'This action is no longer available.',
  children,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  function applyOpen(next: boolean) {
    setOpen(next);
    setFailure(null);
    onOpenChange?.(next);
  }

  function requestOpen(next: boolean) {
    if (!isConfirming) applyOpen(next);
  }

  async function confirm() {
    setIsConfirming(true);
    setFailure(null);
    try {
      await onConfirm();
      applyOpen(false);
    } catch (error) {
      setFailure(apiErrorMessage(error));
    } finally {
      setIsConfirming(false);
    }
  }

  // An open dialog outlives its action, so the user is told why instead of watching it vanish.
  if (!available && !open) return null;

  const isWithdrawn = !available && !isConfirming;
  const message = failure ?? (isWithdrawn ? unavailableMessage : null);

  return (
    <Dialog open={open} onOpenChange={requestOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {!isWithdrawn && children}
        {message && (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isConfirming}>
              {isWithdrawn ? 'Close' : dismissLabel}
            </Button>
          </DialogClose>
          {!isWithdrawn && (
            <Button
              variant={variant === 'destructive' ? 'destructive' : 'default'}
              onClick={confirm}
              disabled={isConfirming}
            >
              {isConfirming ? 'Working…' : confirmLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
