'use client';

import { Fragment } from 'react';
import { Panel } from '@/components/common/panel';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSession } from '@/hooks/use-session';
import { initialsFor } from '@/lib/initials';
import { hasEnoughData } from '@/lib/metrics';
import { cn } from '@/lib/utils';
import type { TeamMember } from '../types';

const NUMBER_CELL = 'text-right tabular-nums';

export function TeamTable({
  members,
  scope,
}: {
  members: TeamMember[];
  scope: string;
}) {
  const email = useSession()?.email;
  // The API sends operators first, so the manager section starts at the first manager.
  const firstManager = members.findIndex((member) => member.role === 'MANAGER');

  return (
    <Panel title="Team" description={`Owned shipments · ${scope}`}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Active</TableHead>
            <TableHead className="text-right">Claimed</TableHead>
            <TableHead className="text-right">Delivered</TableHead>
            <TableHead className="text-right">On time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member, index) => {
            const you = member.email === email;
            const { rate, n } = member.onTime;
            return (
              <Fragment key={member.carrierUserId}>
                {index === firstManager && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={5}
                      className="pt-4 text-xs font-semibold text-muted-foreground"
                    >
                      Manager
                    </TableCell>
                  </TableRow>
                )}
                <TableRow className={cn(you && 'bg-selected')}>
                  <TableCell>
                    <span
                      className="inline-flex items-center gap-2"
                      title={member.email}
                    >
                      <span
                        aria-hidden
                        className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold"
                      >
                        {initialsFor(member.name ?? member.email)}
                      </span>
                      {you ? 'You' : (member.name ?? member.email)}
                    </span>
                  </TableCell>
                  <TableCell className={NUMBER_CELL}>{member.active}</TableCell>
                  <TableCell className={NUMBER_CELL}>
                    {member.claimed}
                  </TableCell>
                  <TableCell className={NUMBER_CELL}>
                    {member.delivered}
                  </TableCell>
                  <TableCell className={NUMBER_CELL}>
                    {rate !== null && hasEnoughData(n)
                      ? `${rate.toFixed(1)}%`
                      : '—'}
                  </TableCell>
                </TableRow>
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </Panel>
  );
}
