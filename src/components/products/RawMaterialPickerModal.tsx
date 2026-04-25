import { useState, useEffect } from 'react';
import { X, ChevronRight, ArrowLeft, Search, Package, Loader2, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RawMaterial {
  id: string;
  name: string;
  sku: string;
  unit_of_measure: string;
  cost_per_unit: number;
  total_stock: number;
  status: string;
  category_id: string;
  image_url: string | null;
}

interface MaterialCategory {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (material: { materialId: string; name: string; sku: string; unit: string; cost: number; imageUrl: string | null }) => void;
  branch: string;
  alreadyAdded: string[];
  supplierId?: string | null;
  supplierName?: string | null;
}

function CategoryImage({ url, name }: { url: string | null; name: string }) {
  const [errored, setErrored] = useState(false);
  if (url && !errored) {
    return (
      <img
        src={url}
        alt={name}
        onError={() => setErrored(true)}
        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
      <Package className="w-6 h-6 text-blue-500" />
    </div>
  );
}

function MaterialImage({ url, name }: { url: string | null; name: string }) {
  const [errored, setErrored] = useState(false);
  if (url && !errored) {
    return (
      <img
        src={url}
        alt={name}
        onError={() => setErrored(true)}
        className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-gray-100"
      />
    );
  }
  return (
    <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
      <Package className="w-6 h-6 text-gray-400" />
    </div>
  );
}

export default function RawMaterialPickerModal({
  isOpen, onClose, onSelect, branch, alreadyAdded,
  supplierId = null, supplierName = null,
}: Props) {
  const [view, setView]                         = useState<'categories' | 'materials'>('categories');
  const [categories, setCategories]             = useState<MaterialCategory[]>([]);
  const [materials, setMaterials]               = useState<RawMaterial[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | null>(null);
  const [loadingCats, setLoadingCats]           = useState(false);
  const [loadingMats, setLoadingMats]           = useState(false);
  const [search, setSearch]                     = useState('');
  // Material IDs this supplier carries (null = no filter active)
  const [supplierMatIds, setSupplierMatIds]     = useState<Set<string> | null>(null);
  /** When supplier is selected: category IDs that have ≥1 of that supplier’s materials; empty = none */
  const [supplierCategoryIds, setSupplierCategoryIds] = useState<Set<string> | null>(null);
  const [loadingSupplier, setLoadingSupplier]   = useState(false);

  // Fetch supplier catalogue, then which categories actually contain those materials
  useEffect(() => {
    if (!isOpen || !supplierId) {
      setSupplierMatIds(null);
      setSupplierCategoryIds(null);
      setLoadingSupplier(false);
      return;
    }
    setLoadingSupplier(true);
    setSupplierMatIds(null);
    setSupplierCategoryIds(null);
    (async () => {
      const { data: smRows, error: smErr } = await supabase
        .from('supplier_materials')
        .select('material_id')
        .eq('supplier_id', supplierId);
      if (smErr) {
        if (import.meta.env.DEV) console.warn('[RawMaterialPickerModal]', smErr);
        setSupplierMatIds(new Set());
        setSupplierCategoryIds(new Set());
        setLoadingSupplier(false);
        return;
      }
      const idSet = new Set((smRows ?? []).map((r: { material_id: string }) => r.material_id));
      setSupplierMatIds(idSet);
      if (idSet.size === 0) {
        setSupplierCategoryIds(new Set());
        setLoadingSupplier(false);
        return;
      }
      const { data: matRows, error: matErr } = await supabase
        .from('raw_materials')
        .select('category_id')
        .in('id', [...idSet])
        .not('category_id', 'is', null);
      if (matErr) {
        if (import.meta.env.DEV) console.warn('[RawMaterialPickerModal]', matErr);
        setSupplierCategoryIds(new Set());
      } else {
        const catIds = new Set(
          (matRows ?? [])
            .map((r: { category_id: string | null }) => r.category_id)
            .filter((id): id is string => id != null),
        );
        setSupplierCategoryIds(catIds);
      }
      setLoadingSupplier(false);
    })();
  }, [isOpen, supplierId]);

  // Fetch categories on open
  useEffect(() => {
    if (!isOpen) return;
    setView('categories');
    setSelectedCategory(null);
    setSearch('');
    (async () => {
      setLoadingCats(true);
      let branchId: string | null = null;
      if (branch) {
        const { data: branchRow } = await supabase
          .from('branches').select('id').eq('name', branch).single();
        branchId = branchRow?.id ?? null;
      }

      let q = supabase
        .from('material_categories')
        .select('id, name, description, image_url')
        .eq('is_active', true);
      if (branchId) q = q.eq('branch_id', branchId) as typeof q;

      const { data } = await q.order('sort_order');
      setCategories((data as MaterialCategory[]) ?? []);
      setLoadingCats(false);
    })();
  }, [isOpen]);

  const handleCategoryClick = async (cat: MaterialCategory) => {
    setSelectedCategory(cat);
    setView('materials');
    setSearch('');
    setLoadingMats(true);
    // Supplier selected but has no materials in DB — nothing to list
    if (supplierId && supplierMatIds && supplierMatIds.size === 0) {
      setMaterials([]);
      setLoadingMats(false);
      return;
    }
    let q = supabase
      .from('raw_materials')
      .select('id, name, sku, unit_of_measure, cost_per_unit, total_stock, status, category_id, image_url')
      .eq('category_id', cat.id);
    // If supplier filter is active, only fetch materials this supplier carries
    if (supplierMatIds && supplierMatIds.size > 0) {
      q = q.in('id', [...supplierMatIds]) as typeof q;
    }
    const { data, error } = await q.order('name');
    if (error) console.error('[RawMaterialPickerModal]', error);
    setMaterials((data as RawMaterial[]) ?? []);
    setLoadingMats(false);
  };

  const handleSelect = (mat: RawMaterial) => {
    onSelect({ materialId: mat.id, name: mat.name, sku: mat.sku, unit: mat.unit_of_measure, cost: mat.cost_per_unit, imageUrl: mat.image_url });
    onClose();
  };

  // With a supplier, only show categories that have ≥1 of that supplier’s materials
  const visibleCategories = (() => {
    const base = categories.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );
    if (supplierCategoryIds === null) return base;
    return base.filter(c => supplierCategoryIds.has(c.id));
  })();

  const filteredMaterials = materials.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.sku.toLowerCase().includes(search.toLowerCase())
  );

  const getStockLabel = (mat: RawMaterial) => {
    if (mat.status === 'Out of Stock' || mat.total_stock <= 0) return { label: 'Out of Stock', color: 'text-red-500 bg-red-50' };
    if (mat.status === 'Critical') return { label: 'Critical Stock', color: 'text-orange-600 bg-orange-50' };
    if (mat.status === 'Low Stock') return { label: 'Low Stock', color: 'text-yellow-600 bg-yellow-50' };
    return { label: 'In Stock', color: 'text-green-600 bg-green-50' };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            {view === 'materials' && (
              <button
                onClick={() => { setView('categories'); setSearch(''); }}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {view === 'categories' ? 'Select Category' : selectedCategory?.name}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {view === 'categories'
                  ? 'Choose a category to browse raw materials'
                  : `${filteredMaterials.length} material${filteredMaterials.length !== 1 ? 's' : ''} available`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Supplier filter banner */}
        {supplierId && (
          <div className={`px-6 py-2 flex items-center gap-2 text-xs border-b ${
            loadingSupplier
              ? 'bg-gray-50 text-gray-400 border-gray-100'
              : 'bg-indigo-50 text-indigo-700 border-indigo-100'
          }`}>
            {loadingSupplier
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading supplier catalogue…</>
              : <>
                  <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    Showing only materials supplied by <strong>{supplierName ?? 'selected supplier'}</strong>
                    {supplierMatIds !== null && <> · {supplierMatIds.size} item{supplierMatIds.size !== 1 ? 's' : ''} in catalogue</>}
                  </span>
                </>
            }
          </div>
        )}

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={view === 'categories' ? 'Search categories…' : 'Search by name or SKU…'}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Categories ── */}
          {view === 'categories' && (
            loadingCats || loadingSupplier ? (
              <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : visibleCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2 text-center px-4">
                <Package className="w-8 h-8" />
                <p className="text-sm">
                  {search.trim() !== ''
                    ? 'No matching categories'
                    : supplierId && supplierCategoryIds != null && supplierCategoryIds.size === 0
                      ? 'This supplier has no materials linked'
                      : supplierId && supplierCategoryIds != null && supplierCategoryIds.size > 0
                        ? 'No categories to show for this supplier in this branch'
                        : 'No categories found'}
                </p>
                {supplierId && supplierCategoryIds != null && supplierCategoryIds.size === 0 && (
                  <p className="text-xs max-w-sm">
                    Link materials on the Suppliers page, or choose a different supplier.
                  </p>
                )}
                {search.trim() !== '' && (
                  <p className="text-xs">Try a different search.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visibleCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat)}
                    className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
                  >
                    <CategoryImage url={cat.image_url} name={cat.name} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{cat.name}</p>
                      {cat.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{cat.description}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            )
          )}

          {/* ── Materials ── */}
          {view === 'materials' && (
            loadingMats ? (
              <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading materials…</span>
              </div>
            ) : filteredMaterials.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                <Package className="w-8 h-8" />
                <p className="text-sm">
                  {supplierId
                    ? `No materials from ${supplierName ?? 'this supplier'} in this category`
                    : 'No materials found in this category'}
                </p>
                {supplierId && (
                  <p className="text-xs text-center max-w-xs">
                    To add materials to a supplier's catalogue, go to the Suppliers page and edit the supplier.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMaterials.map(mat => {
                  const alreadyIn = alreadyAdded.includes(mat.id);
                  const stock = getStockLabel(mat);
                  return (
                    <button
                      key={mat.id}
                      onClick={() => !alreadyIn && handleSelect(mat)}
                      disabled={alreadyIn}
                      className={`w-full flex items-center gap-4 p-3 border rounded-xl transition-all text-left ${
                        alreadyIn
                          ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                      }`}
                    >
                      <MaterialImage url={mat.image_url} name={mat.name} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 text-sm">{mat.name}</p>
                          {alreadyIn && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Already added</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{mat.sku}</p>
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 font-medium ${stock.color}`}>
                          {stock.label} · {mat.total_stock.toLocaleString()} {mat.unit_of_measure}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">₱{mat.cost_per_unit.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">per {mat.unit_of_measure}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          )}

        </div>
      </div>
    </div>
  );
}
