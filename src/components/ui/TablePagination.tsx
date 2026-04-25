import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';

export const TABLE_PAGE_SIZE = 20;

type TablePaginationProps = {
  page: number;
  pageSize?: number;
  total: number;
  onPageChange: (p: number) => void;
  className?: string;
};

/**
 * Reusable trim bar for large sorted tables. Parent should slice the sorted array:
 * `const totalP = Math.max(1, Math.ceil(total / pageSize) || 1);
 *  const p = Math.min(page, totalP);
 *  rows.slice((p - 1) * pageSize, p * pageSize);`
 */
export function TablePagination({
  page,
  pageSize = TABLE_PAGE_SIZE,
  total,
  onPageChange,
  className,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  return (
    <div
      className={
        `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 px-4 border-t border-gray-200 bg-gray-50/50 text-sm text-gray-600 ${className ?? ''}`
      }
    >
      <p>
        {total === 0 ? (
          'No results'
        ) : (
          <>
            Showing{' '}
            <span className="font-medium text-gray-900 tabular-nums">{from}</span>
            –
            <span className="font-medium text-gray-900 tabular-nums">{to}</span> of{' '}
            <span className="font-medium text-gray-900 tabular-nums">{total}</span>
          </>
        )}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
        <span className="text-xs text-gray-600 tabular-nums px-1 min-w-[5.5rem] text-center">
          Page {safePage} of {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="gap-1"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
