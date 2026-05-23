import { supabase } from '@/src/lib/supabase';
import { resolveBranchIdByName } from '@/src/lib/branchCompanySettings';

export const MANILA_BRANCH_NAME = 'Manila';

export type LogisticsTransportMode = 'truck' | 'interisland';

export type LogisticsModeAvailability = {
  truck: boolean;
  interIsland: boolean;
  availableModes: LogisticsTransportMode[];
  defaultMode: LogisticsTransportMode | null;
};

/** Inter-island is available at every branch; truck mode requires at least one truck in fleet. */
export async function resolveLogisticsModeAvailability(
  branchName: string,
): Promise<LogisticsModeAvailability> {
  const name = branchName.trim();
  if (!name) {
    return { truck: false, interIsland: false, availableModes: [], defaultMode: null };
  }

  try {
  const bid = await resolveBranchIdByName(name);

  let truckCount = 0;
  if (bid) {
    const { count, error } = await supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('branch_id', bid)
      .eq('type', 'Truck');
    if (!error) truckCount = count ?? 0;
  }

  const truck = truckCount > 0;
  const interIsland = true;

  const availableModes: LogisticsTransportMode[] = [];
  if (truck) availableModes.push('truck');
  availableModes.push('interisland');

  let defaultMode: LogisticsTransportMode | null = null;
  if (availableModes.length === 1) {
    defaultMode = availableModes[0]!;
  } else if (availableModes.length > 1) {
    defaultMode = 'truck';
  }

  return { truck, interIsland, availableModes, defaultMode };
  } catch {
    return {
      truck: false,
      interIsland: true,
      availableModes: ['interisland'],
      defaultMode: 'interisland',
    };
  }
}

export function logisticsModeToTripFilter(mode: LogisticsTransportMode): 'truck' | 'container' {
  return mode === 'interisland' ? 'container' : 'truck';
}
