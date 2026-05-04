import type { SupabaseClient } from '@supabase/supabase-js';

/** Maps app `UserRole` to labels stored on domain activity logs (matches purchase/order pages). */
export const domainLogRoleMap: Record<string, string> = {
  Executive: 'Admin',
  Agent: 'Agent',
  Manager: 'Manager',
  Warehouse: 'Warehouse Staff',
  Logistics: 'Logistics',
  Driver: 'Logistics',
};

export function mapAppRoleToLogRole(role: string | undefined): string {
  if (!role) return 'System';
  return domainLogRoleMap[role] ?? role;
}

export async function insertProductLog(
  client: SupabaseClient,
  params: {
    productId: string;
    variantId?: string | null;
    action: string;
    description: string;
    performedBy: string;
    performedByRole: string;
    oldValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
  },
): Promise<void> {
  const { error } = await client.from('product_logs').insert({
    product_id: params.productId,
    variant_id: params.variantId ?? null,
    action: params.action,
    performed_by: params.performedBy,
    performed_by_role: params.performedByRole,
    description: params.description,
    old_value: params.oldValue ?? null,
    new_value: params.newValue ?? null,
    metadata: params.metadata ?? null,
  });
  if (error) console.warn('[insertProductLog]', error.message);
}

export async function insertRawMaterialLog(
  client: SupabaseClient,
  params: {
    rawMaterialId: string;
    action: string;
    description: string;
    performedBy: string;
    performedByRole: string;
    oldValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
  },
): Promise<void> {
  const { error } = await client.from('raw_material_logs').insert({
    raw_material_id: params.rawMaterialId,
    action: params.action,
    performed_by: params.performedBy,
    performed_by_role: params.performedByRole,
    description: params.description,
    old_value: params.oldValue ?? null,
    new_value: params.newValue ?? null,
    metadata: params.metadata ?? null,
  });
  if (error) console.warn('[insertRawMaterialLog]', error.message);
}
