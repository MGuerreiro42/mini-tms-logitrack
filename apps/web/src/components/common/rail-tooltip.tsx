'use client';

import { useSidebar } from '@/components/common/sidebar-context';
import {
  Tooltip,
  TooltipContent,
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
  if (!compact) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
