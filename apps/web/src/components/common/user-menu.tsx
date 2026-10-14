'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogout } from '@/hooks/use-logout';

export function UserMenu({
  name,
  role,
  initials,
}: {
  name: string;
  role: string;
  initials: string;
}) {
  const logout = useLogout();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex size-11 items-center justify-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-md bg-muted text-xs font-semibold text-foreground"
        >
          {initials}
        </span>
        <span className="sr-only">
          {name}, {role}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-semibold text-foreground">
            {name}
          </span>
          <span>{role}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
