import type { UserRole } from '@/src/types';

/**
 * Executives always see the full org catalog and inventory listings.
 * Branch selector and warehouse assignment scopes do not restrict them.
 */
export function executiveHasFullInventoryAccess(role: UserRole): boolean {
  return role === 'Executive';
}

/**
 * Branch filter for inventory / catalog queries (`products.branch`, category branch, etc.).
 * Returns `null` for executives → org-wide (no `.eq('branch', …)` filter).
 */
export function effectiveInventoryBranch(
  role: UserRole,
  branch: string | null | undefined,
): string | null {
  if (executiveHasFullInventoryAccess(role)) return null;
  const trimmed = branch?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Branch id resolution for per-branch stock tables (`product_variant_stock`, `material_stock`).
 * Executives with no branch selected see aggregate totals; with a branch selected, stock reads stay branch-specific.
 */
export function effectiveInventoryBranchId(
  role: UserRole,
  branch: string | null | undefined,
  resolvedBranchId: string | null,
): string | null {
  if (executiveHasFullInventoryAccess(role) && !branch?.trim()) return null;
  return resolvedBranchId;
}
