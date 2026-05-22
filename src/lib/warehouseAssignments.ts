import { supabase } from '@/src/lib/supabase';

export type WarehouseCatalogProduct = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
};

export type WarehouseCatalogMaterial = {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  categoryName: string;
};

export type WarehouseAssignmentIds = {
  productIds: string[];
  materialIds: string[];
};

function nestedName(parent: unknown): string | null {
  if (!parent || typeof parent !== 'object') return null;
  const name = (parent as Record<string, unknown>).name;
  return name != null && String(name).trim() ? String(name).trim() : null;
}

export async function fetchWarehouseAssignmentIds(employeeId: string): Promise<WarehouseAssignmentIds> {
  const id = employeeId.trim();
  if (!id) return { productIds: [], materialIds: [] };

  const [productRes, materialRes] = await Promise.all([
    supabase.from('employee_product_assignments').select('product_id').eq('employee_id', id),
    supabase.from('employee_material_assignments').select('material_id').eq('employee_id', id),
  ]);

  if (productRes.error) throw new Error(productRes.error.message);
  if (materialRes.error) throw new Error(materialRes.error.message);

  return {
    productIds: (productRes.data ?? []).map(row => String(row.product_id)),
    materialIds: (materialRes.data ?? []).map(row => String(row.material_id)),
  };
}

export async function fetchWarehouseAssignmentCatalog(branchName: string | null | undefined): Promise<{
  products: WarehouseCatalogProduct[];
  materials: WarehouseCatalogMaterial[];
}> {
  const branchTrim = branchName?.trim();
  if (!branchTrim) return { products: [], materials: [] };

  const { data: branchRow } = await supabase
    .from('branches')
    .select('id, code')
    .eq('name', branchTrim)
    .maybeSingle();

  const branchId = branchRow?.id as string | undefined;
  const branchCode = branchRow?.code != null ? String(branchRow.code) : '';

  const legacyBranchNames: string[] = [branchTrim];
  if (branchCode === 'MNL') legacyBranchNames.push('Manila');
  else if (branchCode === 'CEB') legacyBranchNames.push('Cebu');
  else if (branchCode === 'BTG') legacyBranchNames.push('Batangas');
  else if (branchCode === 'QZN') legacyBranchNames.push('Quezon');

  const { data: productRows, error: productErr } = await supabase
    .from('products')
    .select('id, name, category_id, product_categories ( name )')
    .in('branch', legacyBranchNames)
    .neq('status', 'Discontinued')
    .order('name');

  if (productErr) throw new Error(productErr.message);

  const products: WarehouseCatalogProduct[] = ((productRows ?? []) as Array<Record<string, unknown>>).map(row => ({
    id: String(row.id),
    name: String(row.name ?? ''),
    categoryId: row.category_id != null ? String(row.category_id) : '',
    categoryName: nestedName(row.product_categories) ?? 'Uncategorized',
  }));

  if (!branchId) return { products, materials: [] };

  const materialQueries: Promise<{ data: unknown[] | null; error: { message: string } | null }>[] = [];

  const { data: categoryRows, error: categoryErr } = await supabase
    .from('material_categories')
    .select('id, name')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .order('name');

  if (categoryErr) throw new Error(categoryErr.message);

  const categoryIds = (categoryRows ?? []).map(row => String(row.id));
  if (categoryIds.length > 0) {
    materialQueries.push(
      supabase
        .from('raw_materials')
        .select('id, name, sku, category_id, material_categories ( name )')
        .in('category_id', categoryIds)
        .neq('status', 'Discontinued')
        .order('name') as Promise<{ data: unknown[] | null; error: { message: string } | null }>,
    );
  }

  if (['MNL', 'CEB', 'BTG'].includes(branchCode)) {
    materialQueries.push(
      supabase
        .from('raw_materials')
        .select('id, name, sku, category_id, material_categories ( name )')
        .like('sku', 'LMX-%')
        .neq('status', 'Discontinued')
        .order('name') as Promise<{ data: unknown[] | null; error: { message: string } | null }>,
    );
  } else if (branchCode === 'QZN') {
    materialQueries.push(
      supabase
        .from('raw_materials')
        .select('id, name, sku, category_id, material_categories ( name )')
        .like('sku', 'QZN-%')
        .neq('status', 'Discontinued')
        .order('name') as Promise<{ data: unknown[] | null; error: { message: string } | null }>,
    );
  }

  const materialRowMap = new Map<string, Record<string, unknown>>();
  for (const result of await Promise.all(materialQueries)) {
    if (result.error) throw new Error(result.error.message);
    for (const row of (result.data ?? []) as Array<Record<string, unknown>>) {
      materialRowMap.set(String(row.id), row);
    }
  }

  const materials: WarehouseCatalogMaterial[] = [...materialRowMap.values()]
    .map(row => ({
      id: String(row.id),
      name: String(row.name ?? ''),
      sku: String(row.sku ?? ''),
      categoryId: row.category_id != null ? String(row.category_id) : '',
      categoryName: nestedName(row.material_categories) ?? 'Uncategorized',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { products, materials };
}

export async function saveWarehouseAssignments(
  employeeId: string,
  productIds: string[],
  materialIds: string[],
): Promise<void> {
  const id = employeeId.trim();
  if (!id) throw new Error('Employee id is required');

  const uniqProducts = [...new Set(productIds.filter(Boolean))];
  const uniqMaterials = [...new Set(materialIds.filter(Boolean))];

  const { error: delProductErr } = await supabase
    .from('employee_product_assignments')
    .delete()
    .eq('employee_id', id);
  if (delProductErr) throw new Error(delProductErr.message);

  const { error: delMaterialErr } = await supabase
    .from('employee_material_assignments')
    .delete()
    .eq('employee_id', id);
  if (delMaterialErr) throw new Error(delMaterialErr.message);

  if (uniqProducts.length > 0) {
    const { error: insProductErr } = await supabase.from('employee_product_assignments').insert(
      uniqProducts.map(productId => ({ employee_id: id, product_id: productId })),
    );
    if (insProductErr) throw new Error(insProductErr.message);
  }

  if (uniqMaterials.length > 0) {
    const { error: insMaterialErr } = await supabase.from('employee_material_assignments').insert(
      uniqMaterials.map(materialId => ({ employee_id: id, material_id: materialId })),
    );
    if (insMaterialErr) throw new Error(insMaterialErr.message);
  }
}
