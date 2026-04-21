import { useState, useEffect } from 'react';
import { X, ChevronRight, ArrowLeft, Search, Package, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RawMaterial {
  id: string;
  name: string;
  sku: string;
  unit_of_measure: string;
  cost_per_unit: number;
  total_stock: number;
  category_id: string;
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
  onSelect: (material: { materialId: string; name: string; unit: string; cost: number }) => void;
  branch: string;
  alreadyAdded: string[]; // materialIds already in the BOM
}

export default function RawMaterialPickerModal({ isOpen, onClose, onSelect, branch, alreadyAdded }: Props) {
  const [view, setView] = useState<'categories' | 'materials'>('categories');
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | null>(null);
  const [loadingCats, setLoadingCats] = useState(false);
  const [loadingMats, setLoadingMats] = useState(false);
  const [search, setSearch] = useState('');
  const [resolvedBranchId, setResolvedBranchId] = useState<string | null>(null);

  // Fetch categories on open
  useEffect(() => {
    if (!isOpen) return;
    setView('categories');
    setSelectedCategory(null);
    setSearch('');
    (async () => {
      setLoadingCats(true);

      // Resolve branch ID by name once; reuse for material filtering
      let branchId: string | null = null;
      if (branch) {
        const { data: branchRow } = await supabase
          .from('branches')
          .select('id')
          .eq('name', branch)
          .single();
        branchId = branchRow?.id ?? null;
      }
      setResolvedBranchId(branchId);

      let q = supabase
        .from('material_categories')
        .select('id, name, description, image_url')
        .eq('is_active', true);

      if (branchId) {
        q = q.eq('branch_id', branchId) as typeof q;
      }

      const { data } = await q.order('sort_order');
      setCategories((data as MaterialCategory[]) ?? []);
      setLoadingCats(false);
    })();
  }, [isOpen]);

  // Fetch materials when a category is selected
  const handleCategoryClick = async (cat: MaterialCategory) => {
    setSelectedCategory(cat);
    setView('materials');
    setSearch('');
    setLoadingMats(true);

    const { data, error } = await supabase
      .from('raw_materials')
      .select('id, name, sku, unit_of_measure, cost_per_unit, total_stock, category_id')
      .eq('category_id', cat.id)
      .eq('status', 'Active')
      .order('name');

    if (error) console.error('[RawMaterialPickerModal] materials error:', error);
    setMaterials((data as RawMaterial[]) ?? []);
    setLoadingMats(false);
  };

  const handleSelect = (mat: RawMaterial) => {
    onSelect({
      materialId: mat.id,
      name: mat.name,
      unit: mat.unit_of_measure,
      cost: mat.cost_per_unit,
    });
    onClose();
  };

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredMaterials = materials.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.sku.toLowerCase().includes(search.toLowerCase())
  );

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
                {view === 'categories' ? 'Select Raw Material Category' : selectedCategory?.name}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {view === 'categories'
                  ? 'Choose a category to browse materials'
                  : 'Select a material to add to the Bill of Materials'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={view === 'categories' ? 'Search categories…' : 'Search materials by name or SKU…'}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Categories view */}
          {view === 'categories' && (
            loadingCats ? (
              <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading categories…</span>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                <Package className="w-8 h-8" />
                <p className="text-sm">No categories found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat)}
                    className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{cat.name}</p>
                      {cat.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{cat.description}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )
          )}

          {/* Materials view */}
          {view === 'materials' && (
            loadingMats ? (
              <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading materials…</span>
              </div>
            ) : filteredMaterials.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                <Package className="w-8 h-8" />
                <p className="text-sm">No materials found in this category</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMaterials.map(mat => {
                  const alreadyIn = alreadyAdded.includes(mat.id);
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
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900 text-sm">{mat.name}</p>
                          {alreadyIn && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Already added</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 font-mono">{mat.sku}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-gray-900">₱{mat.cost_per_unit.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">per {mat.unit_of_measure}</p>
                      </div>
                      {mat.total_stock <= 0 && !alreadyIn && (
                        <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" title="Out of stock" />
                      )}
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
