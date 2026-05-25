import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import {
  fetchDriverTripLineItems,
  type DriverDeliveryLineItem,
  type DriverTripSummary,
} from '@/src/lib/driverDashboard';
import { Box, Loader2, Package } from 'lucide-react';

type Props = {
  trip: DriverTripSummary | null;
};

type DeliveryBadge = {
  label: string;
  variant: 'success' | 'warning' | 'neutral' | 'info';
};

function groupByOrder(items: DriverDeliveryLineItem[]): Map<string, DriverDeliveryLineItem[]> {
  const map = new Map<string, DriverDeliveryLineItem[]>();
  for (const item of items) {
    const key = item.orderId;
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return map;
}

function lineIsDelivered(line: DriverDeliveryLineItem): boolean {
  return line.quantityDelivered >= line.quantity && line.quantity > 0;
}

function lineIsPartial(line: DriverDeliveryLineItem): boolean {
  return line.quantityDelivered > 0 && line.quantityDelivered < line.quantity;
}

function orderDeliveryBadge(lines: DriverDeliveryLineItem[]): DeliveryBadge {
  const status = lines[0]?.orderStatus ?? '';
  if (status === 'Delivered' || status === 'Completed') {
    return { label: 'Delivered', variant: 'success' };
  }
  if (status === 'Partially Fulfilled') {
    return { label: 'Partially delivered', variant: 'warning' };
  }
  const allDone = lines.length > 0 && lines.every(lineIsDelivered);
  const anyProgress = lines.some((l) => l.quantityDelivered > 0);
  if (allDone) return { label: 'Delivered', variant: 'success' };
  if (anyProgress) return { label: 'Partially delivered', variant: 'warning' };
  return { label: 'Pending', variant: 'neutral' };
}

function tripDeliveryBadge(items: DriverDeliveryLineItem[]): DeliveryBadge | null {
  if (!items.length) return null;
  const allDone = items.every(lineIsDelivered);
  const anyProgress = items.some((l) => l.quantityDelivered > 0);
  if (allDone) return { label: 'All delivered', variant: 'success' };
  if (anyProgress) return { label: 'Partial delivery', variant: 'warning' };
  return { label: 'Not delivered', variant: 'neutral' };
}

function lineDeliveryBadge(line: DriverDeliveryLineItem): DeliveryBadge | null {
  if (lineIsDelivered(line)) return { label: 'Delivered', variant: 'success' };
  if (lineIsPartial(line)) return { label: 'Partial', variant: 'warning' };
  return null;
}

function ProductThumb({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="w-12 h-12 object-cover rounded-lg border border-gray-200 bg-white shrink-0"
      />
    );
  }
  return (
    <div
      className="w-12 h-12 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center shrink-0"
      aria-hidden
    >
      <Box className="w-5 h-5 text-gray-400" />
    </div>
  );
}

export function DriverTripDeliveryItemsCard({ trip }: Props): React.ReactElement | null {
  const [items, setItems] = useState<DriverDeliveryLineItem[]>([]);
  const [loading, setLoading] = useState(false);

  const orderIdsKey = trip?.orderIds.join(',') ?? '';

  useEffect(() => {
    if (!trip?.orderIds.length) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchDriverTripLineItems(trip.orderIds).then((rows) => {
      if (!cancelled) {
        setItems(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [trip?.id, orderIdsKey]);

  const grouped = useMemo(() => groupByOrder(items), [items]);
  const tripBadge = useMemo(() => tripDeliveryBadge(items), [items]);

  if (!trip) return null;

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const deliveredQty = items.reduce((s, i) => s + i.quantityDelivered, 0);
  const deliveredLines = items.filter(lineIsDelivered).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <Package className="w-5 h-5 text-amber-600" />
          Delivery items
          <span className="text-sm font-normal text-gray-500">· {trip.tripNumber}</span>
          {!loading && tripBadge && <Badge variant={tripBadge.variant}>{tripBadge.label}</Badge>}
          {!loading && items.length > 0 && (
            <Badge variant="default">{items.length} line{items.length === 1 ? '' : 's'}</Badge>
          )}
        </CardTitle>
        {!loading && items.length > 0 && (
          <p className="text-xs text-gray-500 font-normal mt-1">
            {totalQty} unit{totalQty === 1 ? '' : 's'} total
            {deliveredQty > 0 && (
              <span className="text-emerald-700">
                {' '}
                · {deliveredQty} delivered
                {deliveredLines < items.length && ` (${deliveredLines}/${items.length} lines complete)`}
              </span>
            )}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading items…
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No line items on this trip.</p>
        ) : (
          <div className="space-y-4">
            {[...grouped.entries()].map(([orderId, lines]) => {
              const first = lines[0];
              const orderBadge = orderDeliveryBadge(lines);
              return (
                <div key={orderId} className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 min-w-0">
                      {first.orderNumber} · {first.customerName}
                    </p>
                    <Badge variant={orderBadge.variant} className="shrink-0">
                      {orderBadge.label}
                    </Badge>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {lines.map((line) => {
                      const remaining = Math.max(0, line.quantity - line.quantityDelivered);
                      const done = lineIsDelivered(line);
                      const lineBadge = lineDeliveryBadge(line);
                      return (
                        <li key={line.id} className="px-3 py-2.5 flex items-start gap-3">
                          <ProductThumb imageUrl={line.imageUrl} name={line.productName} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2 flex-wrap">
                              <p className="text-sm font-medium text-gray-900">{line.productName}</p>
                              {lineBadge && (
                                <Badge variant={lineBadge.variant} className="text-[10px] px-1.5 py-0">
                                  {lineBadge.label}
                                </Badge>
                              )}
                            </div>
                            {line.variantDescription && (
                              <p className="text-xs text-gray-500 truncate">{line.variantDescription}</p>
                            )}
                            {line.sku && (
                              <p className="text-xs text-gray-400 font-mono mt-0.5">{line.sku}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-gray-900 tabular-nums">
                              ×{line.quantity}
                            </p>
                            {line.quantityDelivered > 0 && (
                              <p className={`text-xs tabular-nums ${done ? 'text-emerald-600' : 'text-amber-700'}`}>
                                {line.quantityDelivered} delivered
                                {!done && remaining > 0 && ` · ${remaining} left`}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
