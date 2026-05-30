import React from 'react';
import { usePermissionsReady } from '@/src/lib/permissions/permissionReady';

/**
 * Renders children only after permissions are loaded AND `when` is true.
 * Prevents gated UI from flashing before profile/permission fetch completes.
 */
export function PermissionGate({
  when,
  children,
  fallback = null,
}: {
  when: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const ready = usePermissionsReady();
  if (!ready || !when) return fallback;
  return <>{children}</>;
}
