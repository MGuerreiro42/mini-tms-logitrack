'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PaginationMeta } from '@/types/pagination';

export interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

interface PaginatedTableProps<T> {
  columns: Column<T>[];
  data: T[];
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  getRowHref?: (row: T) => string;
  emptyMessage?: string;
  getRowKey: (row: T) => string;
}

export function PaginatedTable<T>({
  columns,
  data,
  meta,
  onPageChange,
  getRowHref,
  emptyMessage = 'Nothing here yet.',
  getRowKey,
}: PaginatedTableProps<T>) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.header} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
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
                className={getRowHref ? 'relative' : undefined}
              >
                {columns.map((col, index) => (
                  <TableCell key={col.header} className={col.className}>
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
      </div>
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {meta.page} of {meta.totalPages} · {meta.total} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => onPageChange(meta.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
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

// Stretched link: the whole row is clickable, keyboard-focusable and opens in a new tab.
// Interactive content in other cells needs `relative z-10` to stay on top.
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
