import { useMemo } from 'react';
import { useOrderPermissions } from '@/src/lib/permissions/orderPermissions';
import { useLogisticsPermissions } from '@/src/lib/permissions/logisticsPermissions';

/** Trips page: warehouse loading view when user can load orders but not full Logistics. */
export function useTripsPageAccess(): { canAccess: boolean } {
  const orderPerms = useOrderPermissions();
  const logisticsPerms = useLogisticsPermissions();

  return useMemo(
    () => ({
      canAccess: orderPerms.orderLoading && !logisticsPerms.pageAccess,
    }),
    [orderPerms.orderLoading, logisticsPerms.pageAccess],
  );
}
