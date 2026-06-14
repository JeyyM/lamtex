import React from 'react';

type OrderTripIdCellProps = {
  tripNumber?: string | null;
  tripId?: string | null;
  className?: string;
};

/** Trip assignment label for order tables (trip_number, not order id). */
export function OrderTripIdCell({ tripNumber, tripId, className = '' }: OrderTripIdCellProps) {
  const label = tripNumber?.trim() || (tripId?.trim() ? tripId.trim().slice(0, 8) : null);
  if (!label) {
    return <span className={`text-gray-400 ${className}`.trim()}>—</span>;
  }
  return (
    <span className={`font-mono text-xs text-gray-700 tabular-nums ${className}`.trim()} title={tripId ?? undefined}>
      {label}
    </span>
  );
}
