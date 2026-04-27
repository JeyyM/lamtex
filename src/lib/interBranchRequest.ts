import { SupabaseClient } from '@supabase/supabase-js';

/** Set `VITE_DEBUG_IBR=true` in `.env` to log inter-branch material/product resolution in all builds. */
const ibrDebugLog = (...args: unknown[]) => {
  if (import.meta.env.DEV || import.meta.env.VITE_DEBUG_IBR === 'true') {
    // eslint-disable-next-line no-console -- explicit IBR diagnostic
    console.log('[IBR]', ...args);
  }
};

/** Aligned with customer order logistics after approval (see `OrderDetailPage` flow). */
export type IBRStatus =
  | 'Draft'
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'
  | 'Fulfilled'
  | 'Scheduled'
  | 'Loading'
  | 'Packed'
  | 'Ready'
  | 'In Transit'
  | 'Delivered'
  | 'Partially Fulfilled'
  | 'Completed';

/**
 * **Exact** inter-branch name key: trim only (case-sensitive, same as DB `=` for the trimmed form).
 * Cross-branch "same item" = same key appears in `material_stock` / `product_variant_stock` (via
 * `raw_materials.name` or `products.name`) at both branches — not the same `material_id` / `variant_id`.
 */
export function interBranchExactNameKey(name: string | null | undefined): string {
  if (name == null) return '';
  return name.trim();
}

function readEmbedded<T extends { name?: string }>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

/**
 * `material_stock` at branch → set of `interBranchExactNameKey(raw_materials.name)`.
 * Uses explicit `material_id` + `raw_materials` reads (avoids fragile nested `!inner` embeds on `material_stock`).
 */
export async function getMaterialNameKeysWithStockAtBranch(
  supabase: SupabaseClient,
  branchId: string,
): Promise<Set<string>> {
  ibrDebugLog('getMaterialNameKeysWithStockAtBranch: branchId=', branchId);
  const { data: stock, error: e1 } = await supabase
    .from('material_stock')
    .select('material_id')
    .eq('branch_id', branchId);
  if (e1) {
    ibrDebugLog('getMaterialNameKeysWithStockAtBranch: material_stock error', e1);
    throw e1;
  }
  const rows = (stock ?? []) as { material_id: string }[];
  if (rows.length === 0) {
    ibrDebugLog(
      'getMaterialNameKeysWithStockAtBranch: 0 material_stock rows for this branch_id (no rows, or RLS blocked SELECT on material_stock — check auth.uid() and policies).',
    );
    return new Set();
  }
  const ids = [...new Set(rows.map((r) => r.material_id))];
  ibrDebugLog('getMaterialNameKeysWithStockAtBranch: stock rows', rows.length, 'unique material_id', ids.length);
  const { data: materials, error: e2 } = await supabase.from('raw_materials').select('name').in('id', ids);
  if (e2) {
    ibrDebugLog('getMaterialNameKeysWithStockAtBranch: raw_materials.in error', e2);
    throw e2;
  }
  const matList = materials ?? [];
  if (matList.length === 0 && ids.length > 0) {
    ibrDebugLog(
      'getMaterialNameKeysWithStockAtBranch: material_stock had ids but raw_materials returned 0 rows — likely RLS blocking SELECT on raw_materials, or bad FKs.',
    );
  }
  const s = new Set<string>();
  for (const m of matList) {
    const n = interBranchExactNameKey((m as { name: string | null }).name);
    if (n) s.add(n);
  }
  ibrDebugLog(
    'getMaterialNameKeysWithStockAtBranch: name keys',
    s.size,
    'raw_materials rows used',
    matList.length,
    'sample',
    [...s].slice(0, 5),
  );
  return s;
}

/**
 * `product_variant_stock` at branch → set of `interBranchExactNameKey(products.name)` (via variant).
 * Uses explicit `variant_id` + `product_variants` → `products` (avoids nested embed issues).
 */
export async function getProductNameKeysWithVariantStockAtBranch(
  supabase: SupabaseClient,
  branchId: string,
): Promise<Set<string>> {
  const { data: stock, error: e1 } = await supabase
    .from('product_variant_stock')
    .select('variant_id')
    .eq('branch_id', branchId);
  if (e1) throw e1;
  const vids = [...new Set((stock ?? []).map((r) => (r as { variant_id: string }).variant_id))];
  if (vids.length === 0) return new Set();
  const { data: rows, error: e2 } = await supabase
    .from('product_variants')
    .select('products(name)')
    .in('id', vids);
  if (e2) throw e2;
  const s = new Set<string>();
  for (const r of rows ?? []) {
    const pr = readEmbedded((r as { products?: { name: string } | { name: string }[] }).products);
    const n = interBranchExactNameKey(pr?.name);
    if (n) s.add(n);
  }
  return s;
}

/**
 * Raw material catalogue IDs whose `raw_materials.name` matches a name that has stock at **both** branches
 * (same `interBranchExactNameKey` at each; IDs need not be identical between branches).
 */
export async function getMaterialIdsWithStockAtBothBranches(
  supabase: SupabaseClient,
  branchIdA: string,
  branchIdB: string,
): Promise<Set<string>> {
  if (!branchIdA || !branchIdB) {
    ibrDebugLog('getMaterialIdsWithStockAtBothBranches: missing branch id', { branchIdA, branchIdB });
    return new Set();
  }
  ibrDebugLog('getMaterialIdsWithStockAtBothBranches: A=', branchIdA, 'B=', branchIdB);
  const [namesA, namesB] = await Promise.all([
    getMaterialNameKeysWithStockAtBranch(supabase, branchIdA),
    getMaterialNameKeysWithStockAtBranch(supabase, branchIdB),
  ]);
  const ok = new Set<string>();
  for (const n of namesA) {
    if (namesB.has(n)) ok.add(n);
  }
  ibrDebugLog(
    'getMaterialIdsWithStockAtBothBranches: |names@A|',
    namesA.size,
    '|names@B|',
    namesB.size,
    'intersection name keys',
    ok.size,
    'sample keys',
    [...ok].slice(0, 8),
  );
  if (ok.size === 0) {
    ibrDebugLog('getMaterialIdsWithStockAtBothBranches: no overlapping names — empty id set');
    return new Set();
  }
  const { data: rows, error } = await supabase.from('raw_materials').select('id, name');
  if (error) {
    ibrDebugLog('getMaterialIdsWithStockAtBothBranches: raw_materials select all error', error);
    throw error;
  }
  const out = new Set<string>();
  for (const m of rows ?? []) {
    const row = m as { id: string; name: string | null };
    const k = interBranchExactNameKey(row.name);
    if (k && ok.has(k)) out.add(row.id);
  }
  ibrDebugLog('getMaterialIdsWithStockAtBothBranches: matching raw_materials rows', out.size);
  return out;
}

/**
 * Product variant IDs whose **product** `name` (exact key) has variant stock at both branches
 * (same product name; variant SKUs need not be the same row at each branch).
 */
export async function getVariantIdsWithStockAtBothBranches(
  supabase: SupabaseClient,
  branchIdA: string,
  branchIdB: string,
): Promise<Set<string>> {
  if (!branchIdA || !branchIdB) return new Set();
  const [namesA, namesB] = await Promise.all([
    getProductNameKeysWithVariantStockAtBranch(supabase, branchIdA),
    getProductNameKeysWithVariantStockAtBranch(supabase, branchIdB),
  ]);
  const ok = new Set<string>();
  for (const n of namesA) {
    if (namesB.has(n)) ok.add(n);
  }
  if (ok.size === 0) return new Set();
  const { data: rows, error } = await supabase
    .from('product_variants')
    .select('id, products(name)')
    .eq('status', 'Active');
  if (error) throw error;
  const out = new Set<string>();
  for (const r of rows ?? []) {
    const pr = readEmbedded((r as { products?: { name: string } | { name: string }[] }).products);
    const k = interBranchExactNameKey(pr?.name);
    if (k && ok.has(k)) out.add((r as { id: string }).id);
  }
  return out;
}

export async function loadInterBranchBranchNameMap(
  supabase: SupabaseClient,
  branchIds: string[],
): Promise<Map<string, string>> {
  if (branchIds.length === 0) return new Map();
  const { data, error } = await supabase.from('branches').select('id, name').in('id', branchIds);
  if (error) throw error;
  return new Map((data ?? []).map((b) => [b.id as string, b.name as string]));
}

export async function assertMaterialStockAtBothBranches(
  supabase: SupabaseClient,
  materialId: string,
  requestingBranchId: string,
  fulfillingBranchId: string,
  nameById?: Map<string, string>,
): Promise<void> {
  const { data: mat, error: em } = await supabase.from('raw_materials').select('name').eq('id', materialId).single();
  if (em) throw em;
  const nameKey = interBranchExactNameKey(mat?.name);
  if (!nameKey) {
    throw new Error('This raw material has no name; it cannot be used on an inter-branch request.');
  }
  const [atReq, atFul] = await Promise.all([
    getMaterialNameKeysWithStockAtBranch(supabase, requestingBranchId),
    getMaterialNameKeysWithStockAtBranch(supabase, fulfillingBranchId),
  ]);
  if (atReq.has(nameKey) && atFul.has(nameKey)) return;
  const map = nameById ?? (await loadInterBranchBranchNameMap(supabase, [requestingBranchId, fulfillingBranchId]));
  const miss: string[] = [];
  if (!atReq.has(nameKey)) miss.push(map.get(requestingBranchId) ?? 'Requesting branch');
  if (!atFul.has(nameKey)) miss.push(map.get(fulfillingBranchId) ?? 'Fulfilling branch');
  throw new Error(
    `A raw material with this exact name must have material stock at both branches (same name at each: "${nameKey}"). Missing at: ${miss.join(' · ')}.`,
  );
}

export async function assertVariantStockAtBothBranches(
  supabase: SupabaseClient,
  variantId: string,
  requestingBranchId: string,
  fulfillingBranchId: string,
  nameById?: Map<string, string>,
): Promise<void> {
  const { data: vrow, error: ev } = await supabase
    .from('product_variants')
    .select('products!inner(name)')
    .eq('id', variantId)
    .single();
  if (ev) throw ev;
  const pr = readEmbedded((vrow as { products?: { name: string } | { name: string }[] }).products);
  const nameKey = interBranchExactNameKey(pr?.name);
  if (!nameKey) {
    throw new Error('This product has no name; it cannot be used on an inter-branch request.');
  }
  const [atReq, atFul] = await Promise.all([
    getProductNameKeysWithVariantStockAtBranch(supabase, requestingBranchId),
    getProductNameKeysWithVariantStockAtBranch(supabase, fulfillingBranchId),
  ]);
  if (atReq.has(nameKey) && atFul.has(nameKey)) return;
  const map = nameById ?? (await loadInterBranchBranchNameMap(supabase, [requestingBranchId, fulfillingBranchId]));
  const miss: string[] = [];
  if (!atReq.has(nameKey)) miss.push(map.get(requestingBranchId) ?? 'Requesting branch');
  if (!atFul.has(nameKey)) miss.push(map.get(fulfillingBranchId) ?? 'Fulfilling branch');
  throw new Error(
    `A product with this exact name must have variant stock at both branches (same name at each: "${nameKey}"). Missing at: ${miss.join(' · ')}.`,
  );
}

export async function assertAllInterBranchItemsInBothBranches(
  supabase: SupabaseClient,
  items: InterBranchItemRow[],
  requestingBranchId: string,
  fulfillingBranchId: string,
): Promise<void> {
  if (!requestingBranchId || !fulfillingBranchId) {
    throw new Error('Both the requesting and fulfilling branch must be set');
  }
  if (requestingBranchId === fulfillingBranchId) {
    throw new Error('Requesting and fulfilling branch must be different');
  }
  const nameById = await loadInterBranchBranchNameMap(supabase, [requestingBranchId, fulfillingBranchId]);
  for (const it of items) {
    if (it.line_kind === 'raw_material' && it.raw_material_id) {
      await assertMaterialStockAtBothBranches(
        supabase,
        it.raw_material_id,
        requestingBranchId,
        fulfillingBranchId,
        nameById,
      );
    } else if (it.line_kind === 'product' && it.product_variant_id) {
      await assertVariantStockAtBothBranches(
        supabase,
        it.product_variant_id,
        requestingBranchId,
        fulfillingBranchId,
        nameById,
      );
    }
  }
}

export interface InterBranchItemRow {
  id: string;
  request_id: string;
  line_kind: 'raw_material' | 'product';
  raw_material_id: string | null;
  product_id: string | null;
  product_variant_id: string | null;
  quantity: number;
}

type IbrLinkRow = {
  id: string;
  ibr_number: string;
  requesting_branch_id: string;
  fulfilling_branch_id: string;
  linked_purchase_order_id: string | null;
  linked_production_request_id: string | null;
};

/**
 * Creates or syncs the linked **Draft** PO (requesting branch, raw lines) and **Draft** PR (fulfilling
 * branch, product lines) — same timing as other modules: the documents exist as soon as the IBR
 * has been saved with lines, not at executive approval. Idempotent: safe to call after every save.
 */
export async function ensureInterBranchLinkedDocuments(
  supabase: SupabaseClient,
  params: { requestId: string; actor: string },
): Promise<{ poId: string | null; prId: string | null }> {
  const { data: ibr, error: e1 } = await supabase
    .from('inter_branch_requests')
    .select(
      'id, ibr_number, requesting_branch_id, fulfilling_branch_id, linked_purchase_order_id, linked_production_request_id',
    )
    .eq('id', params.requestId)
    .single();
  if (e1) throw e1;
  if (!ibr) throw new Error('Inter-branch request not found');
  const row = ibr as IbrLinkRow;
  const ibrId = row.id;
  const reqBranch = row.requesting_branch_id;
  const fulBranch = row.fulfilling_branch_id;

  const { data: itemRows, error: e2 } = await supabase
    .from('inter_branch_request_items')
    .select('id, line_kind, raw_material_id, product_id, product_variant_id, quantity')
    .eq('request_id', params.requestId);
  if (e2) throw e2;
  const items = (itemRows ?? []) as InterBranchItemRow[];
  if (items.length > 0) {
    await assertAllInterBranchItemsInBothBranches(supabase, items, reqBranch, fulBranch);
  }

  const rawLines = items.filter((i) => i.line_kind === 'raw_material');
  const productLines = items.filter((i) => i.line_kind === 'product');
  const actor = params.actor;
  const now = new Date().toISOString().split('T')[0]!;

  let poIdOut: string | null = row.linked_purchase_order_id;
  let prIdOut: string | null = row.linked_production_request_id;

  if (rawLines.length > 0) {
    let poId = row.linked_purchase_order_id;
    if (!poId) {
      const poNumber = `PO-IBR-${Date.now()}`;
      const { data: po, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({
          po_number: poNumber,
          branch_id: reqBranch,
          status: 'Draft',
          order_date: now,
          total_amount: 0,
          created_by: actor,
          is_transfer_request: true,
          transfer_requesting_branch_id: reqBranch,
          inter_branch_request_id: ibrId,
          notes: `Inter-branch: ${String(row.ibr_number)}. Materials to receive at requesting branch.`,
        })
        .select('id')
        .single();
      if (poErr) throw poErr;
      poId = po!.id as string;
      const { error: upL } = await supabase
        .from('inter_branch_requests')
        .update({ linked_purchase_order_id: poId, updated_at: new Date().toISOString() })
        .eq('id', ibrId);
      if (upL) throw upL;
      poIdOut = poId;
      const { error: logErr } = await supabase.from('purchase_order_logs').insert({
        order_id: poId,
        action: 'created',
        performed_by: actor,
        performed_by_role: 'System',
        description: `Inter-branch request ${String(row.ibr_number)} (linked PO)`,
        metadata: { inter_branch_request_id: ibrId },
      });
      if (logErr && import.meta.env.DEV) console.warn(logErr);
    } else {
      const { error: delErr } = await supabase.from('purchase_order_items').delete().eq('order_id', poId);
      if (delErr) throw delErr;
    }
    const matIds = rawLines.map((l) => l.raw_material_id).filter(Boolean) as string[];
    const { data: matRows } = matIds.length
      ? await supabase.from('raw_materials').select('id, unit_of_measure').in('id', matIds)
      : { data: [] as { id: string; unit_of_measure: string | null }[] };
    const uomBy = new Map((matRows ?? []).map((r) => [r.id, r.unit_of_measure]));
    const effectivePoId = poIdOut ?? row.linked_purchase_order_id;
    if (!effectivePoId) throw new Error('PO link missing after create');
    for (const line of rawLines) {
      const { error: liErr } = await supabase.from('purchase_order_items').insert({
        order_id: effectivePoId,
        material_id: line.raw_material_id,
        quantity_ordered: line.quantity,
        quantity_received: 0,
        unit_price: 0,
        unit_of_measure: line.raw_material_id ? uomBy.get(line.raw_material_id) ?? null : null,
      });
      if (liErr) throw liErr;
    }
  } else if (row.linked_purchase_order_id) {
    const oldPo = row.linked_purchase_order_id;
    const { error: upN } = await supabase
      .from('inter_branch_requests')
      .update({ linked_purchase_order_id: null, updated_at: new Date().toISOString() })
      .eq('id', ibrId);
    if (upN) throw upN;
    const { error: delP } = await supabase.from('purchase_orders').delete().eq('id', oldPo);
    if (delP) throw delP;
    poIdOut = null;
  }

  if (productLines.length > 0) {
    let prId = row.linked_production_request_id;
    if (!prId) {
      const prNumber = `PR-IBR-${Date.now()}`;
      const { data: pr, error: prErr } = await supabase
        .from('production_requests')
        .insert({
          pr_number: prNumber,
          branch_id: fulBranch,
          status: 'Draft',
          request_date: now,
          created_by: actor,
          is_transfer_request: true,
          transfer_requesting_branch_id: reqBranch,
          inter_branch_request_id: ibrId,
          notes: `Inter-branch: ${String(row.ibr_number)}. Products to send from fulfilling branch.`,
        })
        .select('id')
        .single();
      if (prErr) throw prErr;
      prId = pr!.id as string;
      const { error: upR } = await supabase
        .from('inter_branch_requests')
        .update({ linked_production_request_id: prId, updated_at: new Date().toISOString() })
        .eq('id', ibrId);
      if (upR) throw upR;
      prIdOut = prId;
    } else {
      const { error: delErr } = await supabase.from('production_request_items').delete().eq('request_id', prId);
      if (delErr) throw delErr;
    }
    const effectivePrId = prIdOut ?? row.linked_production_request_id;
    if (!effectivePrId) throw new Error('PR link missing after create');
    for (const line of productLines) {
      const pid = line.product_id;
      const pvid = line.product_variant_id;
      if (!pid || !pvid) throw new Error('Invalid product line');
      const { error: priErr } = await supabase.from('production_request_items').insert({
        request_id: effectivePrId,
        product_id: pid,
        product_variant_id: pvid,
        quantity: line.quantity,
        quantity_completed: 0,
      });
      if (priErr) throw priErr;
    }
  } else if (row.linked_production_request_id) {
    const oldPr = row.linked_production_request_id;
    const { error: upN2 } = await supabase
      .from('inter_branch_requests')
      .update({ linked_production_request_id: null, updated_at: new Date().toISOString() })
      .eq('id', ibrId);
    if (upN2) throw upN2;
    const { error: delR } = await supabase.from('production_requests').delete().eq('id', oldPr);
    if (delR) throw delR;
    prIdOut = null;
  }

  return { poId: poIdOut, prId: prIdOut };
}

/**
 * **Approve** = status → Approved + approver (like orders). Linked PO/PR are maintained by
 * `ensureInterBranchLinkedDocuments` when the draft is saved / submitted, not here.
 */
export async function approveInterBranchRequest(
  supabase: SupabaseClient,
  params: {
    requestId: string;
    approvedBy: string;
  },
): Promise<void> {
  const { data: ibr, error: e1 } = await supabase
    .from('inter_branch_requests')
    .select('id, status')
    .eq('id', params.requestId)
    .single();
  if (e1) throw e1;
  if (!ibr || ibr.status !== 'Pending') {
    throw new Error('Request is not pending approval');
  }

  const { data: oneLine, error: e2 } = await supabase
    .from('inter_branch_request_items')
    .select('id')
    .eq('request_id', params.requestId)
    .limit(1);
  if (e2) throw e2;
  if (!oneLine?.length) {
    throw new Error('Add at least one line before approving');
  }

  await ensureInterBranchLinkedDocuments(supabase, { requestId: params.requestId, actor: params.approvedBy });

  const { error: upErr } = await supabase
    .from('inter_branch_requests')
    .update({
      status: 'Approved' as IBRStatus,
      approved_by: params.approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.requestId);
  if (upErr) throw upErr;
}
