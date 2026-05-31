import {
  inDispatchQueueScheduleRange,
  resolveDatePeriodQuery,
  type DatePeriodKind,
  type DatePeriodQuery,
} from '@/src/lib/datePeriodQuery';
import type { Trip } from '@/src/types/logistics';

/** Apply dispatch period rules: clip old trips per range, always keep today + future scheduled trips. */
export function filterTripsByDispatchSchedulePeriod(
  trips: Trip[],
  period: Pick<DatePeriodQuery, 'from' | 'to' | 'invalid'>,
): Trip[] {
  if (period.invalid) return trips;
  return trips.filter((trip) =>
    inDispatchQueueScheduleRange(trip.scheduledDate, period.from, period.to),
  );
}

/** Dispatch board list source: search shows all matches; otherwise apply schedule period (future-inclusive). */
export function dispatchBoardTripsForView(
  trips: Trip[],
  options: {
    searching: boolean;
    periodKind: DatePeriodKind;
    customStart?: string;
    customEnd?: string;
  },
): Trip[] {
  if (options.searching) return trips;
  const period = resolveDatePeriodQuery(
    options.periodKind,
    options.customStart ?? '',
    options.customEnd ?? '',
  );
  return filterTripsByDispatchSchedulePeriod(trips, period);
}
