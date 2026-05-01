import { supabase } from '@/src/lib/supabase';

export const prLogRoleMap: Record<string, string> = {
  Executive: 'Admin',
  Agent: 'Agent',
  Warehouse: 'Warehouse Staff',
  Logistics: 'Logistics',
  Driver: 'Logistics',
  Production: 'Production',
  Manager: 'Manager',
  Procurement: 'Procurement',
  Finance: 'Finance',
};

export async function createDraftProductionRequest(params: {
  branchId: string | null;
  actor: string;
  logRole: string;
}): Promise<{ id: string; prNumber: string }> {
  const prNumber = `PR-${Date.now()}`;
  const { data, error: insErr } = await supabase
    .from('production_requests')
    .insert({
      pr_number: prNumber,
      branch_id: params.branchId,
      status: 'Draft',
      request_date: new Date().toISOString().split('T')[0],
      created_by: params.actor,
    })
    .select('id')
    .single();
  if (insErr) throw insErr;
  const { error: logErr } = await supabase.from('production_request_logs').insert({
    request_id: data.id,
    action: 'drafted',
    performed_by: params.actor,
    performed_by_role: params.logRole,
    description: 'Created as draft — add product lines, then submit for approval',
    metadata: { pr_number: prNumber },
  });
  if (logErr && import.meta.env.DEV) console.warn('[PR log]', logErr.message);
  return { id: data.id, prNumber };
}

/** Draft PR with one line (e.g. started from a product family page). */
export async function createDraftProductionRequestWithInitialLine(params: {
  branchId: string | null;
  actor: string;
  roleKey: string;
  productId: string;
  variantId: string;
  quantity: number;
  lineLabel: string;
}): Promise<{ id: string; prNumber: string }> {
  const logRole = prLogRoleMap[params.roleKey] ?? 'System';
  const { id, prNumber } = await createDraftProductionRequest({
    branchId: params.branchId,
    actor: params.actor,
    logRole,
  });

  const { error: insItem } = await supabase.from('production_request_items').insert({
    request_id: id,
    product_id: params.productId,
    product_variant_id: params.variantId,
    quantity: params.quantity,
    quantity_completed: 0,
  });
  if (insItem) throw insItem;

  const { error: logLineErr } = await supabase.from('production_request_logs').insert({
    request_id: id,
    action: 'line_added',
    performed_by: params.actor,
    performed_by_role: logRole,
    description: `Added line: ${params.lineLabel} × ${params.quantity}`,
    metadata: null,
  });
  if (logLineErr && import.meta.env.DEV) console.warn('[PR log]', logLineErr.message);

  return { id, prNumber };
}
