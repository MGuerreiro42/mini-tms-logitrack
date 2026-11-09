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
import { rowFlashClass, useRowFlashes } from '@/hooks/use-row-flashes';
import { cn } from '@/lib/utils';
import type { PaginationMeta } from '@/types/pagination';

const MOBILE_QUERY = '(max-width: 767px)';
// Clicks on these keep their own meaning instead of opening the row's peek.
const ROW_CONTROLS = 'a, button, input, label, select, textarea';

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
  // What makes a row "changed" for the live highlight, e.g. its status.
  getRowVersion?: (row: T) => string;
  // Desktop only: the row body opens a preview and only the first cell links to the page.
  onRowClick?: (row: T) => void;
  selectedKey?: string;
  // Desktop only: a leading checkbox per row, labelled "Select <label>".
  selection?: {
    keys: ReadonlySet<string>;
    onChange: (keys: Set<string>) => void;
    getLabel: (row: T) => string;
  };
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
  // No peek below 768 px: a tap opens the page.
  const onRowClick = isMobile ? undefined : rows.onRowClick;
  const flashes = useRowFlashes(rows.data, rows.getRowKey, rows.getRowVersion);
  const getRowClassName = (row: T) =>
    cn(
      rows.getRowClassName?.(row),
      rowFlashClass(flashes.get(rows.getRowKey(row))),
    );

  useEffect(() => {
    if (isPastTheEnd) goToLastPage();
  }, [isPastTheEnd]);

  return (
    <div className="space-y-3">
      <Rows
        {...rows}
        onRowClick={onRowClick}
        getRowClassName={getRowClassName}
        isEmpty={rows.data.length === 0 && !isPastTheEnd}
      />
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
  onRowClick,
  selectedKey,
  selection,
}: RowsProps<T>) {
  const density = useDensity();
  const pageKeys = data.map(getRowKey);
  const allSelected =
    pageKeys.length > 0 && pageKeys.every((key) => selection?.keys.has(key));
  const someSelected = pageKeys.some((key) => selection?.keys.has(key));
  const toggle = (key: string, on: boolean) => {
    if (!selection) return;
    const next = new Set(selection.keys);
    if (on) next.add(key);
    else next.delete(key);
    selection.onChange(next);
  };

  return (
    <Card data-density={density} className="gap-0 py-0">
      <Table>
        <TableHeader>
          <TableRow>
            {selection && (
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  checked={allSelected}
                  ref={(input) => {
                    if (input)
                      input.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={(event) =>
                    selection.onChange(
                      new Set(event.target.checked ? pageKeys : []),
                    )
                  }
                  className="relative z-10 size-4 accent-primary"
                />
              </TableHead>
            )}
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
                colSpan={columns.length + (selection ? 1 : 0)}
                className="py-8 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
          {data.map((row) => (
            <TableRow
              key={getRowKey(row)}
              data-row-key={getRowKey(row)}
              aria-current={
                onRowClick && getRowKey(row) === selectedKey
                  ? 'true'
                  : undefined
              }
              onClick={
                onRowClick &&
                ((event) => {
                  const target = event.target as Element;
                  // Selecting text to copy it is not a request to peek.
                  if (window.getSelection()?.toString()) return;
                  if (target.closest(ROW_CONTROLS)) return;
                  onRowClick(row);
                })
              }
              className={cn(
                getRowHref && 'relative',
                onRowClick && 'cursor-pointer aria-[current=true]:bg-selected',
                getRowClassName?.(row),
              )}
            >
              {selection && (
                <TableCell className="p-0">
                  {/* The label fills the cell, so a click on its padding toggles instead of peeking. */}
                  <label className="relative z-10 flex h-full cursor-pointer items-center px-2 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${selection.getLabel(row)}`}
                      checked={selection.keys.has(getRowKey(row))}
                      onChange={(event) =>
                        toggle(getRowKey(row), event.target.checked)
                      }
                      className="size-4 accent-primary"
                    />
                  </label>
                </TableCell>
              )}
              {columns.map((col, index) => (
                <TableCell key={columnKey(col)} className={cellClassName(col)}>
                  {getRowHref && index === 0 ? (
                    <RowLink href={getRowHref(row)} stretched={!onRowClick}>
                      {col.cell(row)}
                    </RowLink>
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
  stretched = true,
}: {
  href: string;
  children: React.ReactNode;
  stretched?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        stretched
          ? 'outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset'
          : 'rounded-xs outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring'
      }
    >
      {children}
    </Link>
  );
}
