import { supabase } from './supabase';

function embedOne<T extends Record<string, unknown>>(v: unknown): T | null {
  if (v == null) return null;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? null;
  if (typeof v === 'object') return v as T;
  return null;
}

function xlsxOptionalNumber(v: number | string | null | undefined): number | '' {
  if (v == null || v === '') return '';
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : '';
}

export interface MaterialCategoryExportRow {
  category_name: string;
  material_name: string;
  description: string | null;
  branch: string | null;
}

export interface RawMaterialExportRow {
  sku: string;
  name: string;
  category_name: string | null;
  brand: string | null;
  unit_of_measure: string;
  total_stock: number;
  reorder_point: number;
  safety_stock: number;
  cost_per_unit: number;
  inventory_value: number;
  monthly_consumption: number;
  status: string;
}

interface CategoryMeta {
  name: string;
  description: string | null;
  branch: string | null;
}

export async function fetchRawMaterialsCatalogForExport(branchName: string): Promise<{
  branch: string;
  categories: MaterialCategoryExportRow[];
  materials: RawMaterialExportRow[];
}> {
  const branchLabel = branchName || 'All branches';

  let catQ = supabase
    .from('material_categories')
    .select('id, name, description, sort_order, branches(name)')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (branchName) {
    const { data: branchRow } = await supabase
      .from('branches')
      .select('id')
      .eq('name', branchName)
      .maybeSingle();
    if (branchRow?.id) {
      catQ = catQ.eq('branch_id', branchRow.id);
    } else {
      return { branch: branchLabel, categories: [], materials: [] };
    }
  }

  const { data: catData, error: catErr } = await catQ;
  if (catErr) throw new Error(catErr.message);

  const categoryIds = (catData ?? []).map((c) => String(c.id)).filter(Boolean);
  const categoryMetaById = new Map<string, CategoryMeta>();
  const categoryNameById = new Map<string, string>();

  for (const c of catData ?? []) {
    const id = String(c.id);
    const br = embedOne<{ name?: string }>(c.branches);
    categoryMetaById.set(id, {
      name: String(c.name ?? ''),
      description: c.description ? String(c.description) : null,
      branch: br?.name ? String(br.name) : null,
    });
    categoryNameById.set(id, String(c.name ?? ''));
  }

  if (categoryIds.length === 0) {
    return { branch: branchLabel, categories: [], materials: [] };
  }

  const { data: matData, error: matErr } = await supabase
    .from('raw_materials')
    .select(
      'name, sku, brand, unit_of_measure, total_stock, reorder_point, safety_stock, cost_per_unit, monthly_consumption, status, category_id',
    )
    .in('category_id', categoryIds)
    .order('name', { ascending: true });

  if (matErr) throw new Error(matErr.message);

  const materials: RawMaterialExportRow[] = [];
  const categories: MaterialCategoryExportRow[] = [];
  const categoriesWithMaterials = new Set<string>();

  for (const m of matData ?? []) {
    const categoryId = m.category_id ? String(m.category_id) : '';
    const materialName = String(m.name ?? '');
    const meta = categoryId ? categoryMetaById.get(categoryId) : undefined;

    if (meta && categoryId) {
      categoriesWithMaterials.add(categoryId);
      categories.push({
        category_name: meta.name,
        material_name: materialName,
        description: meta.description,
        branch: meta.branch,
      });
    }

    const totalStock = Number(m.total_stock) || 0;
    const costPerUnit = Number(m.cost_per_unit) || 0;
    const reorderPoint = Number(m.reorder_point) || 0;
    const monthlyConsumption = Number(m.monthly_consumption) || 0;

    materials.push({
      sku: String(m.sku ?? ''),
      name: materialName,
      category_name: categoryId ? categoryNameById.get(categoryId) ?? null : null,
      brand: m.brand ? String(m.brand) : null,
      unit_of_measure: String(m.unit_of_measure ?? 'kg'),
      total_stock: totalStock,
      reorder_point: reorderPoint,
      safety_stock: Number(m.safety_stock) || 0,
      cost_per_unit: costPerUnit,
      inventory_value: totalStock * costPerUnit,
      monthly_consumption: monthlyConsumption,
      status: String(m.status ?? ''),
    });
  }

  for (const id of categoryIds) {
    if (categoriesWithMaterials.has(id)) continue;
    const meta = categoryMetaById.get(id);
    if (!meta) continue;
    categories.push({
      category_name: meta.name,
      material_name: '',
      description: meta.description,
      branch: meta.branch,
    });
  }

  categories.sort((a, b) => {
    const byCat = a.category_name.localeCompare(b.category_name);
    if (byCat !== 0) return byCat;
    return a.material_name.localeCompare(b.material_name);
  });

  return { branch: branchLabel, categories, materials };
}

export async function fetchMaterialCategoryForExport(categoryId: string): Promise<{
  categoryName: string;
  branch: string;
  categories: MaterialCategoryExportRow[];
  materials: RawMaterialExportRow[];
}> {
  const { data: catData, error: catErr } = await supabase
    .from('material_categories')
    .select('id, name, description, branches(name)')
    .eq('id', categoryId)
    .single();

  if (catErr || !catData) throw new Error('Category not found');

  const br = embedOne<{ name?: string }>(catData.branches);
  const categoryName = String(catData.name ?? '');
  const branchLabel = br?.name ? String(br.name) : 'All branches';
  const meta: CategoryMeta = {
    name: categoryName,
    description: catData.description ? String(catData.description) : null,
    branch: br?.name ? String(br.name) : null,
  };

  const { data: matData, error: matErr } = await supabase
    .from('raw_materials')
    .select(
      'name, sku, brand, unit_of_measure, total_stock, reorder_point, safety_stock, cost_per_unit, monthly_consumption, status, category_id',
    )
    .eq('category_id', categoryId)
    .order('name', { ascending: true });

  if (matErr) throw new Error(matErr.message);

  const materials: RawMaterialExportRow[] = [];
  const categories: MaterialCategoryExportRow[] = [];

  for (const m of matData ?? []) {
    const materialName = String(m.name ?? '');
    categories.push({
      category_name: meta.name,
      material_name: materialName,
      description: meta.description,
      branch: meta.branch,
    });

    const totalStock = Number(m.total_stock) || 0;
    const costPerUnit = Number(m.cost_per_unit) || 0;
    const reorderPoint = Number(m.reorder_point) || 0;
    const monthlyConsumption = Number(m.monthly_consumption) || 0;

    materials.push({
      sku: String(m.sku ?? ''),
      name: materialName,
      category_name: categoryName,
      brand: m.brand ? String(m.brand) : null,
      unit_of_measure: String(m.unit_of_measure ?? 'kg'),
      total_stock: totalStock,
      reorder_point: reorderPoint,
      safety_stock: Number(m.safety_stock) || 0,
      cost_per_unit: costPerUnit,
      inventory_value: totalStock * costPerUnit,
      monthly_consumption: monthlyConsumption,
      status: String(m.status ?? ''),
    });
  }

  if (categories.length === 0) {
    categories.push({
      category_name: meta.name,
      material_name: '',
      description: meta.description,
      branch: meta.branch,
    });
  }

  return { categoryName, branch: branchLabel, categories, materials };
}

function buildRawMaterialsWorkbook(
  XLSX: typeof import('xlsx'),
  categories: MaterialCategoryExportRow[],
  materials: RawMaterialExportRow[],
) {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Category Name', 'Material Name', 'Description', 'Branch'],
      ...categories.map((c) => [
        c.category_name,
        c.material_name,
        c.description ?? '',
        c.branch ?? '',
      ]),
    ]),
    'Categories',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'SKU',
        'Name',
        'Category',
        'Brand',
        'Unit',
        'Total Stock',
        'Reorder Point',
        'Safety Stock',
        'Cost/Unit',
        'Inventory Value',
        'Monthly Consumption',
        'Status',
      ],
      ...materials.map((m) => [
        m.sku,
        m.name,
        m.category_name ?? '',
        m.brand ?? '',
        m.unit_of_measure,
        xlsxOptionalNumber(m.total_stock),
        xlsxOptionalNumber(m.reorder_point),
        xlsxOptionalNumber(m.safety_stock),
        xlsxOptionalNumber(m.cost_per_unit),
        xlsxOptionalNumber(m.inventory_value),
        xlsxOptionalNumber(m.monthly_consumption),
        m.status,
      ]),
    ]),
    'Materials',
  );

  return wb;
}

export async function downloadRawMaterialsWorkbook(
  branch: string,
  categories: MaterialCategoryExportRow[],
  materials: RawMaterialExportRow[],
) {
  const XLSX = await import('xlsx');
  const wb = buildRawMaterialsWorkbook(XLSX, categories, materials);
  const safeBranch = branch.replace(/[^\w.-]+/g, '_').slice(0, 40);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `raw-materials-${safeBranch || 'export'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadMaterialCategoryWorkbook(
  categoryName: string,
  branch: string,
  categories: MaterialCategoryExportRow[],
  materials: RawMaterialExportRow[],
) {
  const XLSX = await import('xlsx');
  const wb = buildRawMaterialsWorkbook(XLSX, categories, materials);
  const safeCategory = categoryName.replace(/[^\w.-]+/g, '_').slice(0, 40);
  const safeBranch = branch.replace(/[^\w.-]+/g, '_').slice(0, 40);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `raw-materials-${safeCategory || 'category'}-${safeBranch || 'export'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
