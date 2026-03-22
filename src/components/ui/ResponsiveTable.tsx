import React from 'react';

export interface ResponsiveTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  width?: string; // Tailwind width class for desktop
  render?: (value: any, row: any) => React.ReactNode;
  hideOnMobile?: boolean; // Hide this column on mobile
}

export interface ResponsiveTableProps {
  columns: ResponsiveTableColumn[];
  data: any[];
  mobileCardLayout?: boolean; // Show as cards on mobile (default: true)
  mobileColumns?: string[]; // Column keys to show on mobile card layout
  onRowClick?: (row: any) => void;
  emptyMessage?: string;
  loading?: boolean;
}

/**
 * ResponsiveTable Component
 * 
 * Provides automatic responsive behavior for tables:
 * - Desktop (md and up): Full table layout with all columns
 * - Mobile (below md): Card-based layout showing selected columns
 * 
 * Features:
 * - Mobile-first approach
 * - Customizable column rendering
 * - Support for column hiding on mobile
 * - Click handlers
 * - Loading and empty states
 * 
 * Usage:
 * ```tsx
 * <ResponsiveTable
 *   columns={[
 *     { key: 'id', label: 'ID', align: 'left' },
 *     { key: 'name', label: 'Name', align: 'left' },
 *     { key: 'amount', label: 'Amount', align: 'right', render: (val) => `$${val}` }
 *   ]}
 *   data={items}
 *   mobileColumns={['id', 'name']} // Show only these on mobile
 * />
 * ```
 */
export function ResponsiveTable({
  columns,
  data,
  mobileCardLayout = true,
  mobileColumns,
  onRowClick,
  emptyMessage = 'No data available',
  loading = false,
}: ResponsiveTableProps) {
  
  // Default mobile columns to all columns if not specified
  const activeMobileColumns = mobileColumns 
    ? columns.filter(col => mobileColumns.includes(col.key))
    : columns.filter(col => !col.hideOnMobile);

  // Desktop table view
  const desktopView = (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`
                  py-3 px-4 font-semibold text-gray-700 text-${col.align || 'left'}
                  ${col.width || 'flex-1'}
                `}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className={`
                border-b border-gray-100 hover:bg-gray-50 transition-colors
                ${onRowClick ? 'cursor-pointer' : ''}
              `}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-3 px-4 text-gray-900 text-${col.align || 'left'}`}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Mobile card view
  const mobileView = (
    <div className="md:hidden space-y-3">
      {loading ? (
        <div className="py-8 text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-gray-500 text-sm">{emptyMessage}</p>
        </div>
      ) : (
        data.map((row, idx) => (
          <div
            key={idx}
            className={`
              bg-white border border-gray-200 rounded-lg p-4 space-y-3 
              ${onRowClick ? 'cursor-pointer active:bg-gray-50' : ''}
            `}
            onClick={() => onRowClick?.(row)}
          >
            {activeMobileColumns.map((col) => (
              <div key={col.key} className="flex justify-between items-start gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {col.label}
                </span>
                <span className="text-sm text-gray-900 font-medium text-right">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </span>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );

  // Empty state for desktop
  if (data.length === 0 && !loading) {
    return (
      <>
        <div className="hidden md:flex items-center justify-center py-12">
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
        {mobileCardLayout && mobileView}
      </>
    );
  }

  // Loading state
  if (loading) {
    return (
      <>
        <div className="hidden md:flex items-center justify-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
        {mobileCardLayout && mobileView}
      </>
    );
  }

  return (
    <>
      {desktopView}
      {mobileCardLayout && mobileView}
    </>
  );
}
