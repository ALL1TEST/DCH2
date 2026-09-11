'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  type ColumnDef,
  type ColumnSort,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  MoreHorizontal,
  Search,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PAGE_SIZES, DEFAULT_PAGE_SIZE } from '@/shared/constants';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

// -------------------- Types --------------------

export interface BulkAction {
  label: string;
  onClick: (selectedIds: string[]) => void;
  variant?: 'default' | 'destructive';
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  totalItems: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onSortChange: (field: string, order: 'asc' | 'desc') => void;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onRowClick?: (row: TData) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onBulkAction?: (action: string, ids: string[]) => void;
  bulkActions?: BulkAction[];
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  /** Rich empty state — when provided, overrides emptyMessage + emptyIcon */
  emptyState?: React.ReactNode;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  searchValue?: string;
  filterContent?: React.ReactNode;
  getRowId?: (row: TData) => string;
  /** Page-size change handler — when provided, the rows-per-page selector becomes functional */
  onPageSizeChange?: (size: number) => void;
  /** When true, the <table> uses `table-layout: fixed` so declared column
   *  widths are STRICT (content is truncated/overflowed rather than expanding
   *  the column). Useful for dense tables that must stay inside their card. */
  tableFixed?: boolean;
  /** Minimum table width in px. Combined with the table-container's
   *  `overflow-x-auto`, this enables horizontal scrolling only when the
   *  viewport is narrower than `tableMinWidth` (e.g. on mobile) while keeping
   *  the table edge-to-edge with its card on wider viewports. */
  tableMinWidth?: number;
}

// -------------------- useDataTable Hook --------------------

export interface UseDataTableOptions {
  initialPage?: number;
  initialPageSize?: number;
  initialSortField?: string;
  initialSortOrder?: 'asc' | 'desc';
}

export interface UseDataTableReturn {
  currentPage: number;
  pageSize: number;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  selectedIds: string[];
  searchValue: string;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSortField: (field: string, order: 'asc' | 'desc') => void;
  setSelectedIds: (ids: string[]) => void;
  setSearchValue: (value: string) => void;
  toggleSort: (field: string) => void;
  toggleRowSelection: (id: string) => void;
  toggleAllSelection: (allIds: string[], currentDataIds: string[]) => void;
  clearSelection: () => void;
}

export function useDataTable(options: UseDataTableOptions = {}): UseDataTableReturn {
  const {
    initialPage = 1,
    initialPageSize = DEFAULT_PAGE_SIZE,
    initialSortField = 'createdAt',
    initialSortOrder = 'desc',
  } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortField, setSortFieldRaw] = useState(initialSortField);
  const [sortOrder, setSortOrderRaw] = useState<'asc' | 'desc'>(initialSortOrder);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState('');

  const setSortField = useCallback((field: string, order: 'asc' | 'desc') => {
    setSortFieldRaw(field);
    setSortOrderRaw(order);
    setCurrentPage(1);
  }, []);

  const toggleSort = useCallback(
    (field: string) => {
      if (sortField === field) {
        const next = sortOrder === 'asc' ? 'desc' : 'asc';
        setSortFieldRaw(field);
        setSortOrderRaw(next);
      } else {
        setSortFieldRaw(field);
        setSortOrderRaw('asc');
      }
      setCurrentPage(1);
    },
    [sortField, sortOrder],
  );

  const toggleRowSelection = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }, []);

  const toggleAllSelection = useCallback(
    (allIds: string[], currentDataIds: string[]) => {
      const allSelected = currentDataIds.every((id) => selectedIds.includes(id));
      if (allSelected) {
        setSelectedIds((prev) =>
          prev.filter((id) => !currentDataIds.includes(id)),
        );
      } else {
        const newIds = currentDataIds.filter((id) => !selectedIds.includes(id));
        setSelectedIds((prev) => [...prev, ...newIds]);
      }
    },
    [selectedIds],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  return {
    currentPage,
    pageSize,
    sortField,
    sortOrder,
    selectedIds,
    searchValue,
    setCurrentPage,
    setPageSize,
    setSortField,
    setSelectedIds,
    setSearchValue,
    toggleSort,
    toggleRowSelection,
    toggleAllSelection,
    clearSelection,
  };
}

// -------------------- ColumnDefHelper --------------------

interface BaseColumnOptions<TData> {
  id: string;
  header: string;
  accessorKey?: keyof TData & string;
  accessorFn?: (row: TData) => unknown;
  size?: number;
  enableSorting?: boolean;
  enableHiding?: boolean;
}

interface TextColumnOptions<TData> extends BaseColumnOptions<TData> {
  truncate?: number;
  className?: string;
}

interface StatusColumnOptions<TData> extends BaseColumnOptions<TData> {
  renderStatus?: (status: string) => React.ReactNode;
}

interface DateColumnOptions<TData> extends BaseColumnOptions<TData> {
  format?: (date: string | Date) => string;
}

interface AvatarColumnOptions<TData> extends Omit<BaseColumnOptions<TData>, 'size'> {
  getSrc?: (row: TData) => string | undefined;
  getName: (row: TData) => string;
  getSubtitle?: (row: TData) => string | undefined;
  size?: 'sm' | 'md' | 'lg';
}

interface ActionColumnOptions<TData> {
  id?: string;
  size?: number;
  render: (row: TData) => React.ReactNode;
}

export class ColumnDefHelper {
  static textColumn<TData>(options: TextColumnOptions<TData>): ColumnDef<TData> {
    return {
      id: options.id,
      accessorKey: options.accessorKey,
      accessorFn: options.accessorFn,
      header: ({ column }) => {
        const canSort = options.enableSorting !== false;
        if (!canSort) {
          return <span className="font-medium">{options.header}</span>;
        }
        return (
          <button
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <span className="font-medium">{options.header}</span>
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        );
      },
      size: options.size,
      enableSorting: options.enableSorting !== false,
      enableHiding: options.enableHiding,
      cell: ({ getValue }) => {
        const value = getValue() as string;
        if (!value) return <span className="text-muted-foreground">—</span>;
        if (options.truncate && value.length > options.truncate) {
          return (
            <span className={cn('truncate block max-w-full', options.className)} title={value}>
              {value.slice(0, options.truncate)}...
            </span>
          );
        }
        return <span className={options.className}>{value}</span>;
      },
    };
  }

  static statusColumn<TData>(options: StatusColumnOptions<TData>): ColumnDef<TData> {
    return {
      id: options.id,
      accessorKey: options.accessorKey,
      accessorFn: options.accessorFn,
      header: ({ column }) => {
        const canSort = options.enableSorting !== false;
        if (!canSort) {
          return <span className="font-medium">{options.header}</span>;
        }
        return (
          <button
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <span className="font-medium">{options.header}</span>
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        );
      },
      size: options.size,
      enableSorting: options.enableSorting !== false,
      enableHiding: options.enableHiding,
      cell: ({ getValue }) => {
        const value = getValue() as string;
        if (!value) return <span className="text-muted-foreground">—</span>;
        if (options.renderStatus) {
          return options.renderStatus(value);
        }
        return (
          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {value.replace(/_/g, ' ')}
          </span>
        );
      },
    };
  }

  static dateColumn<TData>(options: DateColumnOptions<TData>): ColumnDef<TData> {
    const { format: formatFn } = options;
    return {
      id: options.id,
      accessorKey: options.accessorKey,
      accessorFn: options.accessorFn,
      header: ({ column }) => {
        const canSort = options.enableSorting !== false;
        if (!canSort) {
          return <span className="font-medium">{options.header}</span>;
        }
        return (
          <button
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <span className="font-medium">{options.header}</span>
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        );
      },
      size: options.size,
      enableSorting: options.enableSorting !== false,
      enableHiding: options.enableHiding,
      cell: ({ getValue }) => {
        const value = getValue() as string | Date;
        if (!value) return <span className="text-muted-foreground">—</span>;
        if (formatFn) {
          return <span className="text-muted-foreground text-xs">{formatFn(value)}</span>;
        }
        const date = typeof value === 'string' ? new Date(value) : value;
        if (isNaN(date.getTime())) {
          return <span className="text-muted-foreground">—</span>;
        }
        return <span className="text-muted-foreground text-xs">{date.toLocaleDateString()}</span>;
      },
    };
  }

  static avatarColumn<TData>(options: AvatarColumnOptions<TData>): ColumnDef<TData> {
    return {
      id: options.id,
      accessorKey: options.accessorKey,
      accessorFn: options.accessorFn as any,
      header: ({ column }) => {
        const canSort = options.enableSorting !== false;
        if (!canSort) {
          return <span className="font-medium">{options.header}</span>;
        }
        return (
          <button
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <span className="font-medium">{options.header}</span>
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        );
      },
      size: (options.size ?? 200) as number,
      enableSorting: options.enableSorting !== false,
      enableHiding: options.enableHiding,
      cell: ({ row }) => {
        const rowData = row.original;
        const src = options.getSrc?.(rowData);
        const name = options.getName(rowData);
        const subtitle = options.getSubtitle?.(rowData);
        const sizeClasses = {
          sm: 'h-8 w-8 text-xs',
          md: 'h-10 w-10 text-sm',
          lg: 'h-12 w-12 text-base',
        };
        const avatarSize = sizeClasses[options.size ?? 'md'];
        const initials = name
          .split(/\s+/)
          .map((w) => w[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();

        return (
          <div className="flex items-center gap-3">
            {src ? (
              <img
                src={src}
                alt={name}
                className={cn('rounded-full object-cover shrink-0', avatarSize)}
              />
            ) : (
              <div
                className={cn(
                  'rounded-full bg-muted flex items-center justify-center shrink-0 font-medium text-muted-foreground',
                  avatarSize,
                )}
              >
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-sm">{name}</div>
              {subtitle && (
                <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
              )}
            </div>
          </div>
        );
      },
    };
  }

  static actionColumn<TData>(options: ActionColumnOptions<TData>): ColumnDef<TData> {
    return {
      id: options.id ?? 'actions',
      size: options.size ?? 60,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => options.render(row.original),
    };
  }
}

// -------------------- Sort Icon --------------------

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') {
    return <ArrowUp className="h-4 w-4" />;
  }
  if (sorted === 'desc') {
    return <ArrowDown className="h-4 w-4" />;
  }
  return <ArrowUpDown className="h-4 w-4 opacity-40" />;
}

// -------------------- Skeleton Rows --------------------

function SkeletonRows({ columnCount }: { columnCount: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, rowIdx) => (
        <TableRow key={rowIdx}>
          {Array.from({ length: columnCount }).map((_, colIdx) => (
            <TableCell key={colIdx}>
              <Skeleton className="h-5 w-full max-w-[120px]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// -------------------- Empty State --------------------

function DataTableEmpty({
  icon,
  message,
  state,
}: {
  icon?: React.ReactNode;
  message: string;
  state?: React.ReactNode;
}) {
  if (state) {
    return (
      <TableRow>
        <TableCell colSpan={999} className="p-0">
          {state}
        </TableCell>
      </TableRow>
    );
  }
  return (
    <TableRow>
      <TableCell colSpan={999}>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          {icon && (
            <div className="mb-3 text-muted-foreground/40">{icon}</div>
          )}
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </TableCell>
    </TableRow>
  );
}

// -------------------- Pagination --------------------

function DataTablePagination({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const { t } = useT();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t">
      <div className="text-xs text-muted-foreground">
        {t('app.showingRange')} {rangeStart}–{rangeEnd} {t('app.showingRangeOf')} {totalItems} {t('app.showingRangeItems')}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">{t('app.rows')}</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger size="sm" className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
          >
            <ChevronsLeft className="h-4 w-4" />
            <span className="sr-only">{t('app.firstPage')}</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">{t('app.previousPage')}</span>
          </Button>
          <span className="text-xs text-muted-foreground min-w-[60px] text-center">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">{t('app.nextPage')}</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
            <span className="sr-only">{t('app.lastPage')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// -------------------- Toolbar --------------------

function TableToolbar<TData, TValue>({
  searchPlaceholder,
  searchValue,
  onSearch,
  selectedIds,
  bulkActions,
  onBulkAction,
  onSelectionChange,
  filterContent,
}: {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearch?: (value: string) => void;
  selectedIds?: string[];
  bulkActions?: BulkAction[];
  onBulkAction?: (action: string, ids: string[]) => void;
  onSelectionChange?: (ids: string[]) => void;
  filterContent?: React.ReactNode;
}) {
  const { t } = useT();
  const hasSelection = selectedIds && selectedIds.length > 0;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 pb-2">
      <div className="flex items-center gap-2 flex-1">
        {(onSearch || searchValue !== undefined) && (
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder ?? t('common.search')}
              value={searchValue ?? ''}
              onChange={(e) => onSearch?.(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        )}
        {filterContent}
      </div>
      {hasSelection && bulkActions && bulkActions.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {selectedIds.length} {t('app.selected')}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4 mr-1" />
                {t('app.bulkActions')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {bulkActions.map((action) => (
                <DropdownMenuItem
                  key={action.label}
                  variant={action.variant}
                  disabled={action.disabled}
                  onClick={() => onBulkAction?.(action.label, selectedIds)}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectionChange?.([])}
          >
            {t('app.clear')}
          </Button>
        </div>
      )}
    </div>
  );
}

// -------------------- Main DataTable Component --------------------

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  totalItems,
  pageSize,
  currentPage,
  onPageChange,
  onSortChange,
  sortField,
  sortOrder,
  onRowClick,
  selectedIds = [],
  onSelectionChange,
  onBulkAction,
  bulkActions,
  emptyMessage,
  emptyIcon,
  emptyState,
  searchPlaceholder,
  onSearch,
  searchValue,
  filterContent,
  getRowId,
  onPageSizeChange,
  tableFixed = false,
  tableMinWidth,
}: DataTableProps<TData, TValue>) {
  const { t } = useT();
  const resolvedEmptyMessage = emptyMessage ?? t('app.noData');
  const hasRowSelection = !!onSelectionChange;
  const columnCount = columns.length + (hasRowSelection ? 1 : 0);

  const enhancedColumns = useMemo<ColumnDef<TData, TValue>[]>(() => {
    if (!hasRowSelection) return columns;
    const selectColumn: ColumnDef<TData, TValue> = {
      id: '__select__',
      size: 40,
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => {
        const allRowIds = table.getRowModel().rows.map((r) => r.id);
        const allChecked =
          allRowIds.length > 0 && allRowIds.every((id) => selectedIds.includes(id));
        const someChecked = allRowIds.some((id) => selectedIds.includes(id));

        return (
          <Checkbox
            checked={allChecked ? true : someChecked ? 'indeterminate' : false}
            onCheckedChange={(checked) => {
              if (checked) {
                const allIds = data
                  .map((row, idx) => getRowId?.(row) ?? String(idx))
                  .filter((id) => !selectedIds.includes(id));
                onSelectionChange?.([...selectedIds, ...allIds]);
              } else {
                const currentDataIds = data.map((row, idx) =>
                  getRowId?.(row) ?? String(idx),
                );
                onSelectionChange?.(
                  selectedIds.filter((id) => !currentDataIds.includes(id)),
                );
              }
            }}
            aria-label={t('app.selectAllRows')}
          />
        );
      },
      cell: ({ row }) => {
        const rowId = row.id;
        const isChecked = selectedIds.includes(rowId);

        return (
          <Checkbox
            checked={isChecked}
            onCheckedChange={(checked) => {
              if (checked) {
                onSelectionChange?.([...selectedIds, rowId]);
              } else {
                onSelectionChange?.(selectedIds.filter((id) => id !== rowId));
              }
            }}
            onClick={(e) => e.stopPropagation()}
            aria-label={`${t('app.selectRowPrefix')} ${rowId}`}
          />
        );
      },
    };

    return [selectColumn, ...columns];
  }, [columns, hasRowSelection, selectedIds, onSelectionChange, data, getRowId, t]);

  const sorting: ColumnSort[] = useMemo(() => {
    if (!sortField) return [];
    return [{ id: sortField, desc: sortOrder === 'desc' }];
  }, [sortField, sortOrder]);

  const table = useReactTable({
    data,
    columns: enhancedColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    onSortingChange: (updater) => {
      const newSorting =
        typeof updater === 'function' ? updater(sorting) : updater;
      if (newSorting.length > 0) {
        onSortChange(newSorting[0].id, newSorting[0].desc ? 'desc' : 'asc');
      }
    },
    manualPagination: true,
    manualSorting: true,
    getRowId: getRowId
      ? (row, index) => getRowId(row) ?? String(index)
      : (_, index) => String(index),
  });

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      onPageSizeChange?.(newSize);
      onPageChange(1);
    },
    [onPageChange, onPageSizeChange],
  );

  const showToolbar =
    (onSearch || searchValue !== undefined) ||
    (filterContent != null) ||
    (selectedIds.length > 0 && bulkActions && bulkActions.length > 0);

  // Only enforce a min-width when the table actually has rows. When empty
  // (no data / search-empty / initial-empty), we let the table collapse to
  // the card width so the empty state renders cleanly without forcing a
  // horizontal scrollbar.
  const tableStyle =
    tableMinWidth && data.length > 0
      ? { minWidth: `${tableMinWidth}px` }
      : undefined;
  const tableClassName = cn(tableFixed && 'table-fixed');

  return (
    <div className="rounded-lg border overflow-hidden">
      {showToolbar && (
        <TableToolbar
          searchPlaceholder={searchPlaceholder}
          searchValue={searchValue}
          onSearch={onSearch}
          selectedIds={selectedIds}
          bulkActions={bulkActions}
          onBulkAction={onBulkAction}
          onSelectionChange={onSelectionChange}
          filterContent={filterContent}
        />
      )}
      <Table className={tableClassName} style={tableStyle}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <SkeletonRows columnCount={columnCount} />
          ) : data.length === 0 ? (
            <DataTableEmpty icon={emptyIcon} message={resolvedEmptyMessage} state={emptyState} />
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={selectedIds.includes(row.id) ? 'selected' : undefined}
                className={cn(onRowClick && 'cursor-pointer')}
                onClick={(e) => {
                  const target = e.target as HTMLElement | null;
                  if (target?.closest('button, a, input, select, textarea, [role="button"], [role="checkbox"], [role="menuitem"], [data-radix-collection-item]')) {
                    return;
                  }
                  onRowClick?.(row.original);
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext(),
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <DataTablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={onPageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
