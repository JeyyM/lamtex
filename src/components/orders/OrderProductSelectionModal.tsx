import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '@/src/store/AppContext';
import { Button } from '@/src/components/ui/Button';
import { supabase } from '@/src/lib/supabase';
import { getVariantIdsWithStockAtBothBranches } from '@/src/lib/interBranchRequest';
import {
  X,
  Search,
  Package,
  Minus,
  Plus,
  ShoppingCart,
  Factory,
  Loader2,
  Trash2,
  AlertTriangle,
  XCircle,
  CheckCircle2,
} from 'lucide-react';

/** Aligned with CreateOrderModal / OrderDetailPage product pickers. */
export interface DBBulkDiscount {
  min_qty: number;
  max_qty: number | null;
  discount_percent: number;
}
export interface DBVariant {
  id: string;
  sku: string;
  size: string;
  description: string | null;
  unit_price: number;
  stock: number;
  /** Catalogue reorder point (for display only; no line on the bar). */
  reorderPoint: number;
  bulk_discounts: DBBulkDiscount[];
}
export interface DBProduct {
  id: string;
  name: string;
  image_url: string | null;
  variants: DBVariant[];
}
export interface DBCategory {
  id: string;
  name: string;
  image_url: string | null;
}

function mapRowsToProducts(
  productsData: any[],
  stockMap: Record<string, number>,
): DBProduct[] {
  return productsData.map((p: any) => ({
    id: p.id,
    name: p.name,
    image_url: p.image_url ?? null,
    variants: (p.product_variants ?? []).map((v: any) => ({
      id: v.id,
      sku: v.sku ?? '',
      size: v.size,
      description: v.description ?? null,
      unit_price: Number(v.unit_price ?? 0),
      stock: stockMap[v.id] ?? v.total_stock ?? 0,
      reorderPoint: Math.max(0, Math.floor(Number(v.reorder_point ?? 0))),
      bulk_discounts: (v.product_bulk_discounts ?? [])
        .filter((d: any) => d.is_active)
        .map((d: any) => ({
          min_qty: d.min_qty,
          max_qty: d.max_qty,
          discount_percent: Number(d.discount_percent),
        })),
    })),
  }));
}

/** Branch stock level for production signals (re-stocking / priority). */
const LOW_STOCK_MAX = 20;
const OK_STOCK_CEIL = 50;

type StockLevelInfo = { label: string; short: string; barClass: string; badgeClass: string; Icon: typeof Package };

function getStockLevelInfo(n: number): StockLevelInfo {
  if (n <= 0) {
    return {
      label: 'Out of stock',
      short: 'Out',
      barClass: 'bg-red-500',
      badgeClass: 'text-red-800 bg-red-100 border-red-200',
      Icon: XCircle,
    };
  }
  if (n <= LOW_STOCK_MAX) {
    return {
      label: 'Low stock',
      short: 'Low',
      barClass: 'bg-amber-500',
      badgeClass: 'text-amber-900 bg-amber-100 border-amber-200',
      Icon: AlertTriangle,
    };
  }
  if (n <= OK_STOCK_CEIL) {
    return {
      label: 'Moderate stock',
      short: 'OK',
      barClass: 'bg-blue-500',
      badgeClass: 'text-blue-800 bg-blue-100 border-blue-200',
      Icon: Package,
    };
  }
  return {
    label: 'Well stocked',
    short: 'High',
    barClass: 'bg-green-500',
    badgeClass: 'text-green-800 bg-green-100 border-green-200',
    Icon: CheckCircle2,
  };
}

/** Bar fill width by tier (decorative, no reorder mark). */
function stockBarFillWidthPct(s: number): number {
  if (s <= 0) return 4;
  if (s <= LOW_STOCK_MAX) return 28;
  if (s <= OK_STOCK_CEIL) return 55;
  return 100;
}

/** Counts among addable variants: Critical = 0 in branch, Low = 1…LOW_STOCK_MAX. */
function countCriticalAndLow(p: DBProduct, exclude: Set<string>): { critical: number; low: number } {
  let critical = 0;
  let low = 0;
  for (const v of p.variants) {
    if (exclude.has(v.id)) continue;
    const s = v.stock;
    if (s <= 0) critical += 1;
    else if (s <= LOW_STOCK_MAX) low += 1;
  }
  return { critical, low };
}

function ProductionStatusBadge({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <span className="inline-flex w-fit max-w-full items-center gap-0.5 rounded-md border border-red-200 bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">
        <XCircle className="w-3 h-3 shrink-0" aria-hidden />
        Critical
      </span>
    );
  }
  if (stock <= LOW_STOCK_MAX) {
    return (
      <span className="inline-flex w-fit max-w-full items-center gap-0.5 rounded-md border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
        <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden />
        Low
      </span>
    );
  }
  return null;
}

function ProductionProductCardBadges({ product, excludeVariantIds }: { product: DBProduct; excludeVariantIds: Set<string> }) {
  const { critical, low } = countCriticalAndLow(product, excludeVariantIds);
  if (critical === 0 && low === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1 w-full max-w-full">
      {critical > 0 && (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-semibold text-red-800 bg-red-100 border-red-200"
          title={`${critical} size${critical === 1 ? '' : 's'} with 0 in branch`}
        >
          <XCircle className="w-3 h-3 shrink-0" aria-hidden />
          {critical} Critical
        </span>
      )}
      {low > 0 && (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-semibold text-amber-900 bg-amber-100 border-amber-200"
          title={`${low} size${low === 1 ? '' : 's'} with low branch stock (1–${LOW_STOCK_MAX})`}
        >
          <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden />
          {low} Low
        </span>
      )}
    </div>
  );
}

function ProductionStockBar({
  stock,
  barClass,
  className = '',
  thin = false,
}: {
  stock: number;
  barClass: string;
  className?: string;
  thin?: boolean;
}) {
  const h = thin ? 'h-1' : 'h-2.5';
  return (
    <div className={`w-full min-w-0 ${className}`}>
      <div className={`w-full ${h} overflow-hidden rounded-full border border-gray-200/80 bg-gray-200/90`}>
        <div
          className={`h-full min-w-0 rounded-full ${barClass} transition-[width] duration-150`}
          style={{ width: `${stockBarFillWidthPct(stock)}%` }}
        />
      </div>
    </div>
  );
}

export type OrderProductSelectionPurpose = 'order' | 'production';

export interface OrderProductSelectionConfirm {
  productId: string;
  variantId: string;
  productName: string;
  /** Human-readable: size, optional description */
  variantSizeLabel: string;
  /** Catalogue SKU (for logging) */
  sku: string;
  quantity: number;
  /** @deprecated use quantity; kept for order flows that use integer */
  /** Order mode: negotiated unit price and discounts (same semantics as order edit) */
  unitPrice?: number;
  originalPrice?: number;
  discounts?: Array<{ name: string; percentage: number }>;
  stock?: number;
}

const VARIANT_SELECT = `
  id, sku, size, description, unit_price, total_stock, reorder_point,
  product_bulk_discounts(min_qty, max_qty, discount_percent, is_active)
`;

export type OrderProductInitialEdit = {
  productId: string;
  variantId: string;
  /** Whole units */
  quantity: number;
};

interface OrderProductSelectionModalProps {
  open: boolean;
  onClose: () => void;
  /** 'production' = quantity to produce, no custom price. 'order' = full order line semantics. */
  purpose: OrderProductSelectionPurpose;
  /** Variants that are already on the request/order and cannot be added again. */
  excludeVariantIds: Set<string>;
  onConfirm: (payload: OrderProductSelectionConfirm) => void;
  /** Inter-branch: when both are set, only variants with `product_variant_stock` at both branches are listed. */
  interBranchRequestingBranchId?: string | null;
  interBranchFulfillingBranchId?: string | null;
  /**
   * When set (e.g. click existing IBR/PR line), fetches the product and opens the detail view with
   * quantity and variant pre-filled. Parent should omit the line’s `variantId` from `excludeVariantIds`.
   */
  initialEdit?: OrderProductInitialEdit | null;
}

/**
 * Reusable e-commerce style product + variant picker (categories, search, detail overlay)
 * used by order editing and production request lines.
 */
export function OrderProductSelectionModal({
  open,
  onClose,
  purpose,
  excludeVariantIds,
  onConfirm,
  interBranchRequestingBranchId = null,
  interBranchFulfillingBranchId = null,
  initialEdit = null,
}: OrderProductSelectionModalProps) {
  const { branch } = useAppContext();

  const useDualBranchFilter = Boolean(
    interBranchRequestingBranchId &&
      interBranchFulfillingBranchId &&
      interBranchRequestingBranchId !== interBranchFulfillingBranchId,
  );
  const [dualVariantIds, setDualVariantIds] = useState<Set<string> | null>(null);
  const [loadingDualBranch, setLoadingDualBranch] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<DBProduct[]>([]);

  const [categories, setCategories] = useState<DBCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DBCategory | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<DBProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<DBProduct | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<DBVariant | null>(null);
  /** String so the field can be cleared; parsed on confirm / ±. */
  const [variantQtyInput, setVariantQtyInput] = useState('1');
  /** Free text while typing; empty allowed (order mode only). */
  const [variantPriceInput, setVariantPriceInput] = useState('0');
  const [variantDiscounts, setVariantDiscounts] = useState<Array<{ name: string; percentage: number }>>([]);

  const isProduction = purpose === 'production';
  const [initializingEdit, setInitializingEdit] = useState(false);
  /** Bumps when user hits “back” on the detail overlay while `initialEdit` is set, so the line re-opens. */
  const [initialEditReopen, setInitialEditReopen] = useState(0);

  const resetBrowser = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedCategory(null);
    setCategoryProducts([]);
  }, []);

  const resetDetail = useCallback(() => {
    setSelectedProduct(null);
    setSelectedVariant(null);
    setVariantQtyInput('1');
    setVariantPriceInput('0');
    setVariantDiscounts([]);
  }, []);

  /** Back from product detail: if editing an existing line, re-bootstrap that line’s product. */
  const backFromProductDetail = useCallback(() => {
    setSelectedProduct(null);
    setSelectedVariant(null);
    setVariantQtyInput('1');
    setVariantPriceInput('0');
    setVariantDiscounts([]);
    if (initialEdit) {
      setInitialEditReopen((n) => n + 1);
    }
  }, [initialEdit]);

  const resetAll = useCallback(() => {
    resetBrowser();
    resetDetail();
  }, [resetBrowser, resetDetail]);

  useEffect(() => {
    if (!open) {
      resetAll();
    }
  }, [open, resetAll]);

  useEffect(() => {
    if (!open) {
      setDualVariantIds(null);
      setLoadingDualBranch(false);
      return;
    }
    if (!useDualBranchFilter) {
      setDualVariantIds(null);
      setLoadingDualBranch(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingDualBranch(true);
      setDualVariantIds(null);
      try {
        const set = await getVariantIdsWithStockAtBothBranches(
          supabase,
          interBranchRequestingBranchId!,
          interBranchFulfillingBranchId!,
        );
        if (!cancelled) setDualVariantIds(set);
      } catch {
        if (!cancelled) setDualVariantIds(new Set());
      } finally {
        if (!cancelled) setLoadingDualBranch(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, useDualBranchFilter, interBranchRequestingBranchId, interBranchFulfillingBranchId]);

  const branchIdPromise = useCallback(async () => {
    const { data } = await supabase.from('branches').select('id').eq('name', branch).single();
    return data?.id ?? null;
  }, [branch]);

  const fetchStockMap = useCallback(
    async (variantIds: string[], branchId: string | null) => {
      const stockMap: Record<string, number> = {};
      if (variantIds.length === 0 || !branchId) return stockMap;
      const { data: stockData } = await supabase
        .from('product_variant_stock')
        .select('variant_id, quantity')
        .eq('branch_id', branchId)
        .in('variant_id', variantIds);
      (stockData ?? []).forEach((s: { variant_id: string; quantity: number }) => {
        stockMap[s.variant_id] = s.quantity;
      });
      return stockMap;
    },
    [],
  );

  /** For inter-branch, show the tighter of the two branch quantities (bottleneck). */
  const fetchStockMapMin = useCallback(
    async (variantIds: string[], branchA: string, branchB: string) => {
      const out: Record<string, number> = {};
      if (variantIds.length === 0) return out;
      const [{ data: da }, { data: db }] = await Promise.all([
        supabase
          .from('product_variant_stock')
          .select('variant_id, quantity')
          .eq('branch_id', branchA)
          .in('variant_id', variantIds),
        supabase
          .from('product_variant_stock')
          .select('variant_id, quantity')
          .eq('branch_id', branchB)
          .in('variant_id', variantIds),
      ]);
      const mapA = new Map<string, number>();
      const mapB = new Map<string, number>();
      (da ?? []).forEach((r: { variant_id: string; quantity: number }) => mapA.set(r.variant_id, r.quantity));
      (db ?? []).forEach((r: { variant_id: string; quantity: number }) => mapB.set(r.variant_id, r.quantity));
      for (const id of variantIds) {
        out[id] = Math.min(mapA.get(id) ?? 0, mapB.get(id) ?? 0);
      }
      return out;
    },
    [],
  );

  // Open detail view with a specific product/variant/qty (e.g. click existing IBR/PR line)
  useEffect(() => {
    if (!open || !initialEdit) {
      setInitializingEdit(false);
      return;
    }
    if (useDualBranchFilter && (loadingDualBranch || dualVariantIds == null)) {
      setInitializingEdit(true);
      return;
    }
    let cancelled = false;
    setInitializingEdit(true);
    void (async () => {
      try {
        const branchId = await branchIdPromise();
        const { data: productRow, error } = await supabase
          .from('products')
          .select(`id, name, image_url, product_variants(${VARIANT_SELECT})`)
          .eq('id', initialEdit.productId)
          .eq('status', 'Active')
          .maybeSingle();
        if (error || !productRow || cancelled) {
          if (!cancelled) setInitializingEdit(false);
          return;
        }
        const allVariantIds = (productRow as { product_variants?: { id: string }[] }).product_variants?.map((v) => v.id) ?? [];
        const stockMap =
          useDualBranchFilter && interBranchRequestingBranchId && interBranchFulfillingBranchId
            ? await fetchStockMapMin(allVariantIds, interBranchRequestingBranchId, interBranchFulfillingBranchId)
            : await fetchStockMap(allVariantIds, branchId);
        const [base] = mapRowsToProducts([productRow as any], stockMap);
        if (!base || cancelled) {
          if (!cancelled) setInitializingEdit(false);
          return;
        }
        let variants = base.variants;
        if (useDualBranchFilter && dualVariantIds) {
          variants = base.variants.filter(
            (v) => dualVariantIds.has(v.id) || v.id === initialEdit.variantId,
          );
        }
        const vSel = variants.find((v) => v.id === initialEdit.variantId) ?? base.variants.find((v) => v.id === initialEdit.variantId);
        if (!vSel || cancelled) {
          if (!cancelled) setInitializingEdit(false);
          return;
        }
        if (cancelled) return;
        setSelectedProduct({ ...base, variants });
        setSelectedVariant(vSel);
        setVariantQtyInput(String(Math.max(1, Math.floor(Number(initialEdit.quantity)) || 1)));
        setVariantPriceInput(String(vSel.unit_price));
        setVariantDiscounts([]);
        setSearchQuery('');
        setSelectedCategory(null);
        setCategoryProducts([]);
        setSearchResults([]);
      } finally {
        if (!cancelled) setInitializingEdit(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    initialEdit,
    initialEditReopen,
    useDualBranchFilter,
    loadingDualBranch,
    dualVariantIds,
    interBranchRequestingBranchId,
    interBranchFulfillingBranchId,
    branchIdPromise,
    fetchStockMap,
    fetchStockMapMin,
  ]);

  // Load categories when modal opens (refetch if branch context changes)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setCategoriesLoading(true);
      const { data } = await supabase
        .from('product_categories')
        .select('id, name, image_url')
        .or(`branch.eq.${branch},branch.is.null`)
        .eq('is_active', true)
        .order('sort_order');
      if (!cancelled) {
        setCategories(data ?? []);
        setCategoriesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, branch]);

  const applyDualVariantFilter = useCallback(
    (list: DBProduct[]): DBProduct[] => {
      if (!useDualBranchFilter || !dualVariantIds) return list;
      return list
        .map((p) => ({ ...p, variants: p.variants.filter((v) => dualVariantIds.has(v.id)) }))
        .filter((p) => p.variants.length > 0);
    },
    [useDualBranchFilter, dualVariantIds],
  );

  const loadProductsForCategory = useCallback(
    async (cat: DBCategory) => {
      if (useDualBranchFilter && (loadingDualBranch || dualVariantIds == null)) {
        return;
      }
      setSelectedCategory(cat);
      setProductsLoading(true);
      setCategoryProducts([]);

      const branchId = await branchIdPromise();
      const { data: productsData } = await supabase
        .from('products')
        .select(`id, name, image_url, product_variants(${VARIANT_SELECT})`)
        .eq('category_id', cat.id)
        .eq('status', 'Active')
        .order('name');

      if (!productsData) {
        setProductsLoading(false);
        return;
      }
      const allVariantIds = productsData.flatMap(
        (p: any) => p.product_variants?.map((v: any) => v.id) ?? [],
      );
      const stockMap =
        useDualBranchFilter && interBranchRequestingBranchId && interBranchFulfillingBranchId
          ? await fetchStockMapMin(allVariantIds, interBranchRequestingBranchId, interBranchFulfillingBranchId)
          : await fetchStockMap(allVariantIds, branchId);
      const mapped = applyDualVariantFilter(mapRowsToProducts(productsData, stockMap));
      setCategoryProducts(mapped);
      setProductsLoading(false);
    },
    [
      branchIdPromise,
      fetchStockMap,
      fetchStockMapMin,
      applyDualVariantFilter,
      useDualBranchFilter,
      loadingDualBranch,
      dualVariantIds,
      interBranchRequestingBranchId,
      interBranchFulfillingBranchId,
    ],
  );

  // Debounced name search (global), same need as create-order "search" branch
  useEffect(() => {
    if (!open) return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    if (useDualBranchFilter && (loadingDualBranch || dualVariantIds == null)) {
      setSearchResults([]);
      setSearchLoading(loadingDualBranch);
      return;
    }
    const t = setTimeout(() => {
      void (async () => {
        setSearchLoading(true);
        const branchId = await branchIdPromise();
        const { data: productsData } = await supabase
          .from('products')
          .select(`id, name, image_url, product_variants(${VARIANT_SELECT})`)
          .eq('status', 'Active')
          .ilike('name', `%${q}%`)
          .order('name')
          .limit(50);
        if (!productsData) {
          setSearchResults([]);
          setSearchLoading(false);
          return;
        }
        const allVariantIds = productsData.flatMap(
          (p: any) => p.product_variants?.map((v: any) => v.id) ?? [],
        );
        const stockMap =
          useDualBranchFilter && interBranchRequestingBranchId && interBranchFulfillingBranchId
            ? await fetchStockMapMin(allVariantIds, interBranchRequestingBranchId, interBranchFulfillingBranchId)
            : await fetchStockMap(allVariantIds, branchId);
        setSearchResults(applyDualVariantFilter(mapRowsToProducts(productsData, stockMap)));
        setSearchLoading(false);
      })();
    }, 300);
    return () => clearTimeout(t);
  }, [
    searchQuery,
    open,
    branchIdPromise,
    fetchStockMap,
    fetchStockMapMin,
    applyDualVariantFilter,
    useDualBranchFilter,
    loadingDualBranch,
    dualVariantIds,
    interBranchRequestingBranchId,
    interBranchFulfillingBranchId,
  ]);

  const filteredLocal = useMemo(() => {
    if (searchQuery.trim() === '') return categoryProducts;
    return categoryProducts.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, categoryProducts]);

  /** List for the "search" grid: server results if query long enough, else local filter. */
  const browseList = useMemo(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return filteredLocal;
    return searchResults;
  }, [searchQuery, filteredLocal, searchResults]);

  const variantIsSelectable = useCallback(
    (variantId: string) =>
      !excludeVariantIds.has(variantId) ||
      (initialEdit != null && variantId === initialEdit.variantId),
    [excludeVariantIds, initialEdit],
  );

  const hasAvailableVariant = (p: DBProduct) => p.variants.some((v) => variantIsSelectable(v.id));

  const openProduct = (p: DBProduct) => {
    if (!hasAvailableVariant(p)) return;
    const available = p.variants.filter((v) => variantIsSelectable(v.id));
    if (available.length === 0) return;
    setSelectedProduct({ ...p, variants: p.variants });
    const first = available[0]!;
    setSelectedVariant(first);
    setVariantQtyInput('1');
    setVariantPriceInput(String(first.unit_price));
    setVariantDiscounts([]);
  };

  const visibleVariants = useMemo(() => {
    if (!selectedProduct) return [];
    return selectedProduct.variants.filter((v) => variantIsSelectable(v.id));
  }, [selectedProduct, variantIsSelectable]);

  const addDiscount = () => setVariantDiscounts((d) => [...d, { name: '', percentage: 0 }]);
  const updateDiscount = (index: number, field: 'name' | 'percentage', value: string) => {
    setVariantDiscounts((prev) => {
      const next = [...prev];
      if (field === 'name') next[index] = { ...next[index]!, name: value };
      else next[index] = { ...next[index]!, percentage: Math.max(0, Math.min(100, Number(value) || 0)) };
      return next;
    });
  };
  const removeDiscount = (index: number) => setVariantDiscounts((d) => d.filter((_, i) => i !== index));

  /** Whole units only (no decimals) for both production and order quantity. */
  const parseStepQty = useCallback((): number => {
    const raw = variantQtyInput.trim();
    if (raw === '') return 1;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) return 1;
    return n;
  }, [variantQtyInput]);

  const handleConfirm = () => {
    if (!selectedProduct || !selectedVariant) return;
    if (!visibleVariants.some((v) => v.id === selectedVariant.id)) return;

    const raw = variantQtyInput.trim();
    if (raw === '') {
      alert(isProduction ? 'Enter a quantity to produce.' : 'Enter a quantity.');
      return;
    }
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      alert('Enter a valid whole number (at least 1).');
      return;
    }
    const qty = parsed;

    let orderUnitPrice: number | undefined;
    if (purpose === 'order') {
      const priceRaw = variantPriceInput.trim();
      if (priceRaw === '') {
        alert('Enter a price per unit.');
        return;
      }
      const up = parseFloat(priceRaw);
      if (!Number.isFinite(up) || up < 0) {
        alert('Enter a valid price per unit.');
        return;
      }
      orderUnitPrice = up;
    }

    const desc = [selectedVariant.size, selectedVariant.description].filter(Boolean).join(' — ');
    const payload: OrderProductSelectionConfirm = {
      productId: selectedProduct.id,
      variantId: selectedVariant.id,
      productName: selectedProduct.name,
      variantSizeLabel: desc,
      sku: selectedVariant.sku,
      quantity: qty,
      stock: selectedVariant.stock,
    };

    if (purpose === 'order' && orderUnitPrice !== undefined) {
      payload.unitPrice = orderUnitPrice;
      payload.originalPrice = selectedVariant.unit_price;
      payload.discounts = [...variantDiscounts];
    }

    onConfirm(payload);
    resetDetail();
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-0 lg:p-4">
        <div className="bg-white w-full h-full max-h-screen overflow-hidden flex flex-col lg:rounded-lg lg:h-auto lg:max-w-5xl lg:max-h-[90vh]">
          <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isProduction ? (
                <Factory className="w-6 h-6 text-red-600" />
              ) : (
                <ShoppingCart className="w-6 h-6 text-red-600" />
              )}
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  {initialEdit
                    ? 'Edit product line'
                    : isProduction
                      ? 'Add product to produce'
                      : 'Add products to order'}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {initialEdit
                    ? 'Update quantity or variant, then apply.'
                    : isProduction
                      ? 'Category or search, then a size'
                      : 'Browse categories and select a product'}
                </p>
              </div>
            </div>
            <button type="button" onClick={handleClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="search"
                placeholder="Search products…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim()) setSelectedCategory(null);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {initialEdit && initializingEdit && !selectedProduct && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                <p className="text-sm">Loading line…</p>
              </div>
            )}

            {!(initialEdit && initializingEdit && !selectedProduct) && (
            <>
            {searchQuery.trim() === '' && !selectedCategory ? (
              <div>
                <p className="text-xs text-gray-500 mb-2">Select a category</p>
                {categoriesLoading || (useDualBranchFilter && loadingDualBranch) ? (
                  <div className="flex items-center justify-center h-32 text-gray-400 text-sm gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading…
                  </div>
                ) : useDualBranchFilter && dualVariantIds && dualVariantIds.size === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-amber-800 text-sm text-center px-4">
                    No product names have variant stock at both the requesting and fulfilling branch.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-1">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        disabled={useDualBranchFilter && (loadingDualBranch || dualVariantIds == null)}
                        onClick={() => void loadProductsForCategory(cat)}
                        className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all group disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {cat.image_url ? (
                          <img src={cat.image_url} alt={cat.name} className="w-12 h-12 object-cover rounded-lg mb-2" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-red-100">
                            <Package className="w-6 h-6 text-gray-600 group-hover:text-red-600" />
                          </div>
                        )}
                        <div className="text-xs font-semibold text-gray-900 text-center">{cat.name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : selectedCategory && searchQuery.trim() === '' ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory(null);
                      setCategoryProducts([]);
                    }}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    ← All Categories
                  </button>
                  <span className="text-xs text-gray-400">/</span>
                  <span className="text-xs font-semibold text-gray-700">{selectedCategory.name}</span>
                </div>
                {productsLoading ? (
                  <div className="flex items-center justify-center h-32 text-gray-400 text-sm gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading…
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1">
                    {categoryProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        disabled={!hasAvailableVariant(product)}
                        onClick={() => openProduct(product)}
                        className={`flex flex-col items-center p-3 border border-gray-200 rounded-lg transition-all group ${
                          hasAvailableVariant(product)
                            ? 'hover:border-red-500 hover:bg-red-50'
                            : 'opacity-40 cursor-not-allowed'
                        }`}
                      >
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded-lg mb-2" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-red-100">
                            <Package className="w-6 h-6 text-gray-600 group-hover:text-red-600" />
                          </div>
                        )}
                        <div className="text-xs font-medium text-gray-900 text-center line-clamp-2">{product.name}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                        </div>
                        {isProduction && hasAvailableVariant(product) && (
                          <ProductionProductCardBadges product={product} excludeVariantIds={excludeVariantIds} />
                        )}
                        {!hasAvailableVariant(product) && (
                          <div className="text-[10px] text-amber-700 mt-1">All variants on this PR</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                {searchLoading && searchQuery.trim().length >= 2 && (
                  <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Searching…
                  </p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-1">
                  {browseList.length === 0 ? (
                    <div className="col-span-full flex items-center justify-center h-24 text-gray-400 text-sm">
                      {searchQuery.trim().length >= 2 ? 'No matching products' : 'No products'}
                    </div>
                  ) : (
                    browseList.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        disabled={!hasAvailableVariant(product)}
                        onClick={() => openProduct(product)}
                        className={`flex flex-col items-center p-3 border border-gray-200 rounded-lg transition-all group ${
                          hasAvailableVariant(product)
                            ? 'hover:border-red-500 hover:bg-red-50'
                            : 'opacity-40 cursor-not-allowed'
                        }`}
                      >
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded-lg mb-2" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-red-100">
                            <Package className="w-6 h-6 text-gray-600" />
                          </div>
                        )}
                        <div className="text-xs font-medium text-gray-900 text-center line-clamp-2">{product.name}</div>
                        {isProduction && hasAvailableVariant(product) && (
                          <ProductionProductCardBadges product={product} excludeVariantIds={excludeVariantIds} />
                        )}
                        {!hasAvailableVariant(product) && (
                          <div className="text-[10px] text-amber-700 mt-1">On request</div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
            </>
            )}
          </div>

          <div className="px-4 md:px-6 py-4 border-t border-gray-200 flex justify-end">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {selectedProduct && selectedVariant && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-0 lg:p-4">
          <div className="bg-white rounded-none lg:rounded-lg shadow-2xl w-full h-full lg:h-auto lg:max-w-4xl lg:max-h-[85vh] overflow-hidden flex flex-col">
            <button
              type="button"
              onClick={backFromProductDetail}
              className="absolute top-4 right-4 z-20 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
              aria-label="Back to list"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 p-4 md:p-8">
                <div className="space-y-4">
                  <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center border-2 border-gray-200 overflow-hidden">
                    {selectedProduct.image_url ? (
                      <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-32 h-32 text-gray-300" />
                    )}
                  </div>
                  {!isProduction && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-2">Price per unit</div>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg font-bold text-gray-900 flex-shrink-0">₱</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={variantPriceInput}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === '') {
                              setVariantPriceInput('');
                              return;
                            }
                            if (/^\d*\.?\d*$/.test(v)) setVariantPriceInput(v);
                          }}
                          onBlur={() => {
                            setVariantPriceInput((prev) => {
                              const t = prev.trim();
                              if (t === '') return '';
                              if (t.endsWith('.')) return t.slice(0, -1) || '0';
                              return prev;
                            });
                          }}
                          onWheel={(e) => e.preventDefault()}
                          className="min-w-0 w-full text-xl font-bold text-gray-900 bg-white px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Base price: ₱{selectedVariant.unit_price.toLocaleString()}</p>
                    </div>
                  )}
                  {isProduction && (
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                      List: <span className="font-bold text-gray-900">₱{selectedVariant.unit_price.toLocaleString()}</span>/unit
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{selectedProduct.name}</h2>
                    {!isProduction && (
                      <p className="text-sm text-gray-500 font-mono">SKU: {selectedVariant.sku || '—'}</p>
                    )}
                    {selectedVariant.description && <p className="text-gray-600 mt-2">{selectedVariant.description}</p>}
                  </div>
                  {isProduction
                    ? (() => {
                        const s = selectedVariant.stock;
                        const ro = selectedVariant.reorderPoint;
                        const st = getStockLevelInfo(s);
                        const LevelIcon = st.Icon;
                        const cardBorder =
                          s <= 0
                            ? 'border-red-200 bg-red-50/40'
                            : s <= LOW_STOCK_MAX
                              ? 'border-amber-200 bg-amber-50/50'
                              : s <= OK_STOCK_CEIL
                                ? 'border-blue-200 bg-blue-50/40'
                                : 'border-green-200 bg-green-50/40';
                        return (
                          <div
                            className={`rounded-xl border-2 p-4 ${cardBorder}`}
                            role="status"
                            aria-label={s <= 0 ? 'Critical' : s <= LOW_STOCK_MAX ? 'Low' : 'In branch'}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${st.badgeClass}`}
                              >
                                <LevelIcon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1 space-y-2">
                                <p className="text-2xl font-bold tabular-nums text-gray-900">
                                  {s} <span className="text-base font-medium text-gray-500">units</span>
                                </p>
                                {ro > 0 && (
                                  <p className="text-sm text-gray-700">
                                    Reorder point: <span className="font-bold tabular-nums text-gray-900">{ro}</span>
                                  </p>
                                )}
                                <ProductionStatusBadge stock={s} />
                                <div className="max-w-md pt-0.5">
                                  <ProductionStockBar stock={s} barClass={st.barClass} />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    : (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Branch stock: </span>
                          <span
                            className={`font-bold ${
                              selectedVariant.stock > 50
                                ? 'text-green-600'
                                : selectedVariant.stock > 0
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                            }`}
                          >
                            {selectedVariant.stock} units
                          </span>
                        </div>
                      )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Select variant</label>
                    <div className="grid grid-cols-2 gap-2">
                      {visibleVariants.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setSelectedVariant(v);
                            setVariantQtyInput('1');
                            setVariantPriceInput(String(v.unit_price));
                          }}
                          className={`px-4 py-3 border-2 rounded-lg font-medium transition-all text-left ${
                            v.id === selectedVariant.id
                              ? 'border-red-600 bg-red-50 text-red-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <div className="font-semibold leading-tight">{v.size}</div>
                          {!isProduction && (
                            <div className="text-xs text-gray-500 font-mono mt-0.5">{v.sku}</div>
                          )}
                          <div className="text-sm font-bold mt-1">₱{v.unit_price.toLocaleString()}</div>
                          {isProduction
                            ? (() => {
                                const vst = getStockLevelInfo(v.stock);
                                const vro = v.reorderPoint;
                                return (
                                  <div className="mt-2 space-y-1.5 min-w-0 w-full">
                                    {v.stock <= LOW_STOCK_MAX ? (
                                      <ProductionStatusBadge stock={v.stock} />
                                    ) : (
                                      <p className="text-xs text-gray-500 tabular-nums">{v.stock.toLocaleString()}</p>
                                    )}
                                    {vro > 0 && (
                                      <p className="text-[10px] text-gray-600">
                                        Reorder: <span className="font-semibold tabular-nums text-gray-800">{vro}</span>
                                      </p>
                                    )}
                                    <ProductionStockBar stock={v.stock} barClass={vst.barClass} thin />
                                  </div>
                                );
                              })()
                            : (
                                <div className="text-xs text-gray-500 mt-1">Stock: {v.stock}</div>
                              )}
                        </button>
                      ))}
                    </div>
                    {visibleVariants.length === 0 && (
                      <p className="text-sm text-amber-800">All variants of this product are already on the request.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      {isProduction ? 'Quantity to produce' : 'Quantity requested'}
                    </label>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          const q = parseStepQty();
                          setVariantQtyInput(String(Math.max(1, q - 1)));
                        }}
                        className="w-12 h-12 flex shrink-0 items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <div className="relative min-w-0 flex-1 max-w-[12rem]">
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={variantQtyInput}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === '') {
                              setVariantQtyInput('');
                              return;
                            }
                            if (/^\d*$/.test(v)) setVariantQtyInput(v);
                          }}
                          onWheel={(e) => e.preventDefault()}
                          placeholder="1"
                          className="w-full text-center text-2xl font-bold pl-3 pr-10 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        {variantQtyInput !== '' && (
                          <button
                            type="button"
                            onClick={() => setVariantQtyInput('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            aria-label="Clear quantity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const q = parseStepQty();
                          setVariantQtyInput(String(q + 1));
                        }}
                        className="w-12 h-12 flex shrink-0 items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    {!isProduction &&
                      variantQtyInput.trim() !== '' &&
                      (parseInt(variantQtyInput, 10) || 0) > selectedVariant.stock && (
                        <p className="text-sm text-amber-700 mt-2">Quantity exceeds current branch stock (allowed for order entry).</p>
                      )}
                  </div>

                  {purpose === 'order' && (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-semibold text-gray-900">Discounts</label>
                          <button
                            type="button"
                            onClick={addDiscount}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-600 rounded-lg hover:bg-red-50"
                          >
                            <Plus className="w-4 h-4" />
                            Add Discount
                          </button>
                        </div>
                        {variantDiscounts.length > 0 ? (
                          <div className="space-y-2">
                            {variantDiscounts.map((d, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Name"
                                  value={d.name}
                                  onChange={(e) => updateDiscount(i, 'name', e.target.value)}
                                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                                />
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={d.percentage || ''}
                                  onChange={(e) => updateDiscount(i, 'percentage', e.target.value)}
                                  onWheel={(e) => e.preventDefault()}
                                  className="w-20 px-3 py-2 text-sm text-center border border-gray-300 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-sm text-gray-600">%</span>
                                <button
                                  type="button"
                                  onClick={() => removeDiscount(i)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No discounts applied</p>
                        )}
                      </div>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={visibleVariants.length === 0}
                    className="w-full py-4 bg-red-600 text-white text-lg font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProduction ? <Factory className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                    {isProduction ? 'Add to production request' : 'Add to order'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
