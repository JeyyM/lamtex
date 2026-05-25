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
 * Returns the topbar branch when set; `null` only when no branch is selected (org-wide view).
 */
export function effectiveInventoryBranch(
  role: UserRole,
  branch: string | null | undefined,
): string | null {
  void role;
  const trimmed = branch?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Branch scope for order create/edit pickers (customers, products, categories).
 * Always respects the order branch or topbar selection — even for executives.
 */
export function orderCatalogBranch(
  topbarBranch: string | null | undefined,
  orderBranchName?: string | null,
): string | null {
  const fromOrder = orderBranchName?.trim();
  if (fromOrder) return fromOrder;
  const fromTopbar = topbarBranch?.trim();
  return fromTopbar ? fromTopbar : null;
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
