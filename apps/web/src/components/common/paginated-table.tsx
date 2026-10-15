'use client';

import Link from 'next/link';
import { Fragment, useEffect, useEffectEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDensity } from '@/hooks/use-density';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import type { PaginationMeta } from '@/types/pagination';

const MOBILE_QUERY = '(max-width: 767px)';

export type CardSlot = 'title' | 'badge' | 'place' | 'meta' | 'action';

const HIDDEN_BELOW = {
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
  '2xl': 'hidden 2xl:table-cell',
} as const;

export interface Column<T> {
  id?: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  card?: CardSlot;
  hideBelow?: keyof typeof HIDDEN_BELOW;
}

interface PaginatedTableProps<T> {
  columns: Column<T>[];
  data: T[];
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
  getRowHref?: (row: T) => string;
  getRowClassName?: (row: T) => string | undefined;
  emptyMessage?: string;
  getRowKey: (row: T) => string;
}

type RowsProps<T> = Omit<PaginatedTableProps<T>, 'meta' | 'onPageChange'> & {
  isEmpty: boolean;
};

export function PaginatedTable<T>({
  meta,
  onPageChange,
  ...rows
}: PaginatedTableProps<T>) {
  const lastPage = Math.max(1, meta?.totalPages ?? 1);
  const isPastTheEnd = meta !== undefined && meta.page > lastPage;
  const goToLastPage = useEffectEvent(() => onPageChange?.(lastPage));
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const asCards = isMobile && rows.columns.some((column) => column.card);
  const Rows = asCards ? RowCards : RowTable;

  useEffect(() => {
    if (isPastTheEnd) goToLastPage();
  }, [isPastTheEnd]);

  return (
    <div className="space-y-3">
      <Rows {...rows} isEmpty={rows.data.length === 0 && !isPastTheEnd} />
      {meta && onPageChange && meta.totalPages > 1 && !isPastTheEnd && (
        <div className="flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
          <span>
            {(meta.page - 1) * meta.limit + 1}–
            {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
          </span>
          <div className="flex gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => onPageChange(meta.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="strong"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => onPageChange(meta.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function RowTable<T>({
  columns,
  data,
  getRowHref,
  getRowClassName,
  emptyMessage = 'Nothing here yet.',
  getRowKey,
  isEmpty,
}: RowsProps<T>) {
  const density = useDensity();

  return (
    <Card data-density={density} className="gap-0 py-0">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={columnKey(col)} className={cellClassName(col)}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isEmpty && (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="py-8 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
          {data.map((row) => (
            <TableRow
              key={getRowKey(row)}
              className={cn(getRowHref && 'relative', getRowClassName?.(row))}
            >
              {columns.map((col, index) => (
                <TableCell key={columnKey(col)} className={cellClassName(col)}>
                  {getRowHref && index === 0 ? (
                    <RowLink href={getRowHref(row)}>{col.cell(row)}</RowLink>
                  ) : (
                    col.cell(row)
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function RowCards<T>({
  columns,
  data,
  getRowHref,
  getRowClassName,
  emptyMessage = 'Nothing here yet.',
  getRowKey,
  isEmpty,
}: RowsProps<T>) {
  if (isEmpty) {
    return (
      <Card className="text-center text-muted-foreground">{emptyMessage}</Card>
    );
  }

  const slot = (name: CardSlot) =>
    columns.filter((column) => column.card === name);
  const [title, badges, places, metas, actions] = (
    ['title', 'badge', 'place', 'meta', 'action'] as const
  ).map(slot);
  const details = columns.filter((column) => !column.card);

  return (
    <ul className="flex flex-col gap-2.5">
      {data.map((row) => {
        const href = getRowHref?.(row);
        const cells = (list: Column<T>[], separator?: string) =>
          list.map((column, index) => (
            <Fragment key={columnKey(column)}>
              {separator && index > 0 && separator}
              {column.cell(row)}
            </Fragment>
          ));
        return (
          <li
            key={getRowKey(row)}
            className={cn(
              'relative flex flex-col gap-2.5 rounded-xl bg-card px-4 py-3.5 shadow-panel',
              getRowClassName?.(row),
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate">
                {href ? (
                  <RowLink href={href}>{cells(title)}</RowLink>
                ) : (
                  cells(title)
                )}
              </span>
              {cells(badges)}
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 flex-col gap-0.5">
                {places.length > 0 && (
                  <span className="text-[15px] font-semibold">
                    {cells(places, ' · ')}
                  </span>
                )}
                {metas.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {cells(metas, ' · ')}
                  </span>
                )}
                {details.map((column) => {
                  const value = column.cell(row);
                  if (value == null || value === false || value === '')
                    return null;
                  return (
                    <span
                      key={columnKey(column)}
                      className="text-xs text-muted-foreground"
                    >
                      {column.header && `${column.header}: `}
                      {value}
                    </span>
                  );
                })}
              </span>
              {cells(actions)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function columnKey<T>(column: Column<T>): string {
  return column.id ?? column.header;
}

function cellClassName<T>(column: Column<T>): string | undefined {
  return cn(
    column.hideBelow && HIDDEN_BELOW[column.hideBelow],
    column.className,
  );
}

// Stretched link: other interactive cells need `relative z-10` to stay clickable.
function RowLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
    >
      {children}
    </Link>
  );
}
