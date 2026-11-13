'use client';

import { useSidebar } from '@/components/common/sidebar-context';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Names a rail icon on hover or focus; the trigger keeps its own accessible name.
export function RailTooltip({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  const { compact } = useSidebar();
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip open={compact ? undefined : false}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
