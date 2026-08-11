import { ReactNode } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeadCell } from './Table';
import { Checkbox } from './Checkbox';
import { Pagination } from './Pagination';
import { LoadingState } from './LoadingState';
import { EmptyState } from './EmptyState';
import { Alert } from './Alert';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (row: T, index: number) => ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  rowKey: (row: T) => string;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onRowClick?: (row: T) => void;
  emptyState?: {
    title: string;
    description?: string;
    action?: ReactNode;
  };
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  bulkActions?: ReactNode;
  caption?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  error,
  rowKey,
  selectable,
  selectedIds = new Set(),
  onSelectionChange,
  onRowClick,
  emptyState,
  pagination,
  bulkActions,
  caption,
  className = '',
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && data.every((row) => selectedIds.has(rowKey(row)));
  const someSelected = data.some((row) => selectedIds.has(rowKey(row))) && !allSelected;

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(rowKey)));
    }
  };

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  if (error) {
    return <Alert type="error" title="Failed to load data">{error}</Alert>;
  }

  if (loading) {
    return <LoadingState rows={5} />;
  }

  if (data.length === 0 && emptyState) {
    return (
      <EmptyState
        title={emptyState.title}
        description={emptyState.description}
        action={emptyState.action}
      />
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {bulkActions && selectedIds.size > 0 && (
        <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded flex items-center justify-between">
          <span className="text-sm text-foreground">{selectedIds.size} selected</span>
          {bulkActions}
        </div>
      )}
      <div className="w-full overflow-auto border border-border rounded bg-white">
        <table className="w-full text-sm text-left">
          {caption && <caption className="sr-only">{caption}</caption>}
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHeadCell className="w-12">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleAll}
                    aria-label="Select all rows"
                  />
                </TableHeadCell>
              )}
              {columns.map((col) => (
                <TableHeadCell key={col.key} style={{ width: col.width }} sortable={col.sortable}>
                  {col.header}
                </TableHeadCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, rowIndex) => {
              const id = rowKey(row);
              const isSelected = selectedIds.has(id);
              return (
                <TableRow
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? 'cursor-pointer' : ''}
                >
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleRow(id)}
                        aria-label={`Select row ${rowIndex + 1}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.key} align={col.align} className={col.sortable ? 'cursor-pointer' : ''}>
                      {col.render ? col.render(row, rowIndex) : (row as Record<string, unknown>)[col.key] as ReactNode}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </table>
      </div>
      {pagination && <Pagination {...pagination} />}
    </div>
  );
}
