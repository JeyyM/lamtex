import { useAppContext } from '@/src/store/AppContext';

/** True once employee profile and permission rows have finished loading for the session. */
export function usePermissionsReady(): boolean {
  return useAppContext().profileLoaded;
}
