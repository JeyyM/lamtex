import { supabase } from '@/src/lib/supabase';

export const poLogRoleMap: Record<string, string> = {
  Executive: 'Admin',
  Manager: 'Manager',
  Agent: 'Agent',
  Warehouse: 'Warehouse Staff',
  Logistics: 'Logistics',
  Driver: 'Logistics',
  Production: 'Production',
  Procurement: 'Procurement',
  Finance: 'Finance',
};

/** Empty-shell PO in Draft — add supplier/lines on the detail page, then submit for approval. */
export async function createDraftPurchaseOrder(params: {
  branchId: string | null;
  actor: string;
  logRole: string;
}): Promise<{ id: string; poNumber: string }> {
  const poNumber = `PO-${Date.now()}`;
  const { data, error: insErr } = await supabase
    .from('purchase_orders')
    .insert({
      po_number: poNumber,
      branch_id: params.branchId,
      status: 'Draft',
      order_date: new Date().toISOString().split('T')[0],
      total_amount: 0,
      created_by: params.actor,
    })
    .select('id')
    .single();
  if (insErr) throw insErr;

  const { error: logErr } = await supabase.from('purchase_order_logs').insert({
    order_id: data.id,
    action: 'drafted',
    performed_by: params.actor,
    performed_by_role: params.logRole,
    description: 'Created as draft — add materials and supplier, then submit for approval',
    metadata: { po_number: poNumber },
  });
  if (logErr && import.meta.env.DEV) console.warn('[PO log]', logErr.message);

  return { id: data.id, poNumber };
}

/** Draft PO seeded with one material line (e.g. from a material detail page). */
export async function createDraftPurchaseOrderWithInitialLine(params: {
  branchId: string | null;
  actor: string;
  roleKey: string;
  materialId: string;
  materialName: string;
  materialSku: string;
  quantity: number;
  unitPrice: number;
  unitOfMeasure: string;
}): Promise<{ id: string; poNumber: string }> {
  const logRole = poLogRoleMap[params.roleKey] ?? 'System';
  const { id, poNumber } = await createDraftPurchaseOrder({
    branchId: params.branchId,
    actor: params.actor,
    logRole,
  });

  const { error: itemErr } = await supabase.from('purchase_order_items').insert({
    order_id: id,
    material_id: params.materialId,
    quantity_ordered: params.quantity,
    quantity_received: 0,
    unit_price: params.unitPrice,
    unit_of_measure: params.unitOfMeasure,
  });
  if (itemErr) throw itemErr;

  const { error: logLineErr } = await supabase.from('purchase_order_logs').insert({
    order_id: id,
    action: 'line_added',
    performed_by: params.actor,
    performed_by_role: logRole,
    description: `Added line: ${params.materialName} (${params.materialSku}) × ${params.quantity}`,
    metadata: { material_id: params.materialId, material_sku: params.materialSku },
  });
  if (logLineErr && import.meta.env.DEV) console.warn('[PO log]', logLineErr.message);

  return { id, poNumber };
}
