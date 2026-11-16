'use client';

import { Fragment, useId } from 'react';
import { InitialsAvatar } from '@/components/common/initials-avatar';
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
  const titleId = useId();
  // The API sends operators first, so the manager section starts at the first manager.
  const firstManager = members.findIndex((member) => member.role === 'MANAGER');

  return (
    <Panel
      title="Team"
      titleId={titleId}
      description={`Owned shipments · ${scope}`}
      // Claimed drops below 26rem of panel: a phone or the Carrier 360 side column, not Performance.
      className="@container"
    >
      <Table aria-labelledby={titleId}>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Active</TableHead>
            <TableHead className="text-right @max-[26rem]:hidden">
              Claimed
            </TableHead>
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
                    <th
                      colSpan={5}
                      scope="colgroup"
                      className="px-2 pt-4 pb-2 text-left text-xs font-semibold text-muted-foreground"
                    >
                      Manager
                    </th>
                  </TableRow>
                )}
                <TableRow className={cn(you && 'bg-selected')}>
                  <TableCell>
                    <span
                      className="inline-flex items-center gap-2"
                      title={member.email}
                    >
                      <InitialsAvatar name={member.name ?? member.email} />
                      {you ? 'You' : (member.name ?? member.email)}
                    </span>
                  </TableCell>
                  <TableCell className={NUMBER_CELL}>{member.active}</TableCell>
                  <TableCell className={cn(NUMBER_CELL, '@max-[26rem]:hidden')}>
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
