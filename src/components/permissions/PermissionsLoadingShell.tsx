import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAppContext } from '@/src/store/AppContext';

/** Blocks page content until employee permissions are loaded (avoids show-then-hide flicker). */
export function PermissionsLoadingShell({ children }: { children: React.ReactNode }) {
  const { session, profileLoaded } = useAppContext();
  if (session && !profileLoaded) {
    return (
      <div className="flex items-center justify-center py-24" aria-busy="true" aria-label="Loading permissions">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }
  return <>{children}</>;
}
