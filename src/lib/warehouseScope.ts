import type { UserRole } from '@/src/types';
import { executiveHasFullInventoryAccess } from '@/src/lib/inventoryAccess';

/** When active, warehouse users only see assigned catalog rows. Never applies to Executive. */
export type WarehouseAssignmentScope = {
  productIds: Set<string> | null;
  materialIds: Set<string> | null;
};

const EMPTY_UUID = '00000000-0000-0000-0000-000000000000';

export function warehouseScopeIsActive(role: UserRole, productIds: string[] | null): boolean {
  if (executiveHasFullInventoryAccess(role)) return false;
  return role === 'Warehouse' && productIds !== null;
}

export function buildWarehouseAssignmentScope(
  role: UserRole,
  productIds: string[] | null,
  materialIds: string[] | null,
): WarehouseAssignmentScope {
  if (!warehouseScopeIsActive(role, productIds)) {
    return { productIds: null, materialIds: null };
  }
  return {
    productIds: new Set(productIds ?? []),
    materialIds: new Set(materialIds ?? []),
  };
}

export function isProductInWarehouseScope(scope: WarehouseAssignmentScope, productId: string): boolean {
  if (scope.productIds === null) return true;
  if (scope.productIds.size === 0) return false;
  return scope.productIds.has(productId);
}

export function isMaterialInWarehouseScope(scope: WarehouseAssignmentScope, materialId: string): boolean {
  if (scope.materialIds === null) return true;
  if (scope.materialIds.size === 0) return false;
  return scope.materialIds.has(materialId);
}

export function filterProductsByWarehouseScope<T>(
  scope: WarehouseAssignmentScope,
  items: T[],
  getProductId: (item: T) => string,
): T[] {
  if (scope.productIds === null) return items;
  if (scope.productIds.size === 0) return [];
  return items.filter(item => scope.productIds!.has(getProductId(item)));
}

export function filterMaterialsByWarehouseScope<T>(
  scope: WarehouseAssignmentScope,
  items: T[],
  getMaterialId: (item: T) => string,
): T[] {
  if (scope.materialIds === null) return items;
  if (scope.materialIds.size === 0) return [];
  return items.filter(item => scope.materialIds!.has(getMaterialId(item)));
}

/** Supabase `.in()` filter for scoped product queries; pass null scope to skip. */
export function scopedProductIdList(scope: WarehouseAssignmentScope): string[] | null {
  if (scope.productIds === null) return null;
  if (scope.productIds.size === 0) return [EMPTY_UUID];
  return [...scope.productIds];
}

export function scopedMaterialIdList(scope: WarehouseAssignmentScope): string[] | null {
  if (scope.materialIds === null) return null;
  if (scope.materialIds.size === 0) return [EMPTY_UUID];
  return [...scope.materialIds];
}

export function warehouseScopeEmptyMessage(kind: 'products' | 'materials'): string {
  return kind === 'products'
    ? 'No product families are assigned to your account yet. Ask an executive to set your catalog access on your employee profile.'
    : 'No raw materials are assigned to your account yet. Ask an executive to set your catalog access on your employee profile.';
}
