import { supabase } from '@/src/lib/supabase';
import type { UserRole } from '@/src/types';

const orderLogRoleMap: Record<
  string,
  'Agent' | 'Warehouse Staff' | 'Manager' | 'Admin' | 'System' | 'Logistics'
> = {
  Executive: 'Admin',
  Manager: 'Manager',
  Agent: 'Agent',
  'Warehouse Staff': 'Warehouse Staff',
  Warehouse: 'Warehouse Staff',
  Logistics: 'Logistics',
  Driver: 'Logistics',
};

export interface CreateDraftOrderInput {
  branchName: string | null;
  role: UserRole;
  actorName: string;
  actorEmail?: string | null;
  agentId?: string | null;
  agentName?: string | null;
}

export async function createDraftOrder(
  input: CreateDraftOrderInput,
): Promise<{ id: string; orderNumber: string }> {
  let branchId: string | null = null;
  if (input.branchName) {
    const { data: bd } = await supabase.from('branches').select('id').eq('name', input.branchName).single();
    branchId = bd?.id ?? null;
  }
  if (!branchId) {
    throw new Error('Select a branch in the header first.');
  }

  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
  const actor = input.actorName || input.actorEmail || 'User';
  const agentId = input.agentId?.trim() || null;
  const agentName = agentId ? (input.agentName?.trim() || null) : null;
  const { data, error: insErr } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      branch_id: branchId,
      status: 'Draft',
      order_date: new Date().toISOString().split('T')[0],
      subtotal: 0,
      total_amount: 0,
      payment_status: 'Unbilled',
      ...(agentId ? { agent_id: agentId, agent_name: agentName } : {}),
    })
    .select('id')
    .single();
  if (insErr) throw insErr;

  const logRole = orderLogRoleMap[input.role] ?? 'System';
  const { error: logErr } = await supabase.from('order_logs').insert({
    order_id: data.id,
    action: 'created',
    performed_by: actor,
    performed_by_role: logRole,
    description: 'Created as draft — add customer and lines, then submit for approval',
    metadata: { order_number: orderNumber },
  });
  if (logErr && import.meta.env.DEV) console.warn('[order log]', logErr.message);

  return { id: data.id, orderNumber };
}
