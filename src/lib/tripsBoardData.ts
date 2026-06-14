import { supabase } from '@/src/lib/supabase';
import {
  applyOrderLabelsToTrips,
  fetchOrderIdsMatchingDispatchSearch,
  fetchTripsForBranch,
} from '@/src/lib/logisticsScheduling';
import type { Trip } from '@/src/types/logistics';

const ORDER_STATUS_RANK: Record<string, number> = {
  Scheduled: 1,
  Loading: 2,
  Packed: 3,
  Ready: 4,
  'In Transit': 5,
  Delivered: 6,
  Complete: 7,
  Delayed: 8,
  Cancelled: 9,
};

export type TripsBoardKpis = {
  activeTrips: number;
  loadingTrips: number;
  packedReadyTrips: number;
  ordersOnTrips: number;
};

export type TripsBoardData = {
  trips: Trip[];
  tripLowestOrderStatus: Record<string, string>;
  tripOrderStatusMap: Record<string, Record<string, string>>;
  tripOrderMeta: Record<string, { orderNumber: string }>;
  fromDb: boolean;
  error?: string;
};

function isTerminalTripStatus(status: string): boolean {
  return status === 'Complete' || status === 'Delivered' || status === 'Cancelled';
}

export function resolveTripDisplayStatus(tripId: string, tripStatus: string, tripLowestOrderStatus: Record<string, string>): string {
  if (tripStatus === 'Delayed') return 'Delayed';
  if (tripStatus === 'Cancelled') return 'Cancelled';
  if (tripStatus === 'Complete') return 'Complete';
  return tripLowestOrderStatus[tripId] ?? tripStatus;
}

export function computeTripsBoardKpis(trips: Trip[], tripLowestOrderStatus: Record<string, string>): TripsBoardKpis {
  const active = trips.filter((t) => !isTerminalTripStatus(t.status));
  let loadingTrips = 0;
  let packedReadyTrips = 0;
  let ordersOnTrips = 0;

  for (const trip of active) {
    const display = resolveTripDisplayStatus(trip.id, trip.status, tripLowestOrderStatus);
    ordersOnTrips += trip.orders.length;
    if (display === 'Loading') loadingTrips += 1;
    if (display === 'Packed' || display === 'Ready') packedReadyTrips += 1;
  }

  return {
    activeTrips: active.length,
    loadingTrips,
    packedReadyTrips,
    ordersOnTrips,
  };
}

export async function loadTripsBoard(branchName: string): Promise<TripsBoardData> {
  const branch = branchName.trim();
  if (!branch) {
    return {
      trips: [],
      tripLowestOrderStatus: {},
      tripOrderStatusMap: {},
      tripOrderMeta: {},
      fromDb: false,
    };
  }

  const tripsResult = await fetchTripsForBranch(branch, 'truck');
  if (tripsResult.error) {
    return {
      trips: [],
      tripLowestOrderStatus: {},
      tripOrderStatusMap: {},
      tripOrderMeta: {},
      fromDb: false,
      error: tripsResult.error,
    };
  }

  let trips = tripsResult.trips;
  const allOrderIds = [...new Set(trips.flatMap((t) => t.orders))];
  const tripLowestOrderStatus: Record<string, string> = {};
  const tripOrderStatusMap: Record<string, Record<string, string>> = {};
  const tripOrderMeta: Record<string, { orderNumber: string }> = {};

  if (allOrderIds.length) {
    const { data: orderRows, error: orderStatusErr } = await supabase
      .from('orders')
      .select('id, status, order_number, customer_name')
      .in('id', allOrderIds);

    if (orderStatusErr) {
      return {
        trips,
        tripLowestOrderStatus: {},
        tripOrderStatusMap: {},
        tripOrderMeta: {},
        fromDb: true,
        error: orderStatusErr.message,
      };
    }

    trips = applyOrderLabelsToTrips(trips, (orderRows ?? []).map((r) => ({
      id: r.id as string,
      order_number: r.order_number as string | null,
      customer_name: r.customer_name as string | null,
    })));

    const statusByOrderId: Record<string, string> = {};
    for (const row of orderRows ?? []) {
      const id = row.id as string;
      statusByOrderId[id] = (row.status as string) ?? 'Scheduled';
      const num = String(row.order_number ?? '').trim();
      if (num) tripOrderMeta[id] = { orderNumber: num };
    }

    for (const trip of trips) {
      if (!trip.orders.length) continue;
      if (trip.status === 'Cancelled' || trip.status === 'Delayed' || trip.status === 'Complete') {
        tripLowestOrderStatus[trip.id] = trip.status;
        continue;
      }
      let lowestRank = Infinity;
      let lowestSt = trip.status;
      tripOrderStatusMap[trip.id] = {};
      for (const oid of trip.orders) {
        const st = statusByOrderId[oid] ?? 'Scheduled';
        tripOrderStatusMap[trip.id][oid] = st;
        const rank = ORDER_STATUS_RANK[st] ?? 99;
        if (rank < lowestRank) {
          lowestRank = rank;
          lowestSt = st;
        }
      }
      tripLowestOrderStatus[trip.id] = lowestSt;
    }
  }

  return {
    trips,
    tripLowestOrderStatus,
    tripOrderStatusMap,
    tripOrderMeta,
    fromDb: true,
  };
}

export { fetchOrderIdsMatchingDispatchSearch };
