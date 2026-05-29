/**
 * Forecast data layer — pulls historical signal from Supabase and assembles
 * forward-looking forecasts for the Forecasts page.
 *
 * Design notes / Disk-IO awareness:
 *   - History is bounded by an explicit lookback window (default 90 days) so
 *     queries stay small; forecasting doesn't need years of rows to be useful.
 *   - Sales / product / revenue history use ONE embedded-join query each.
 *   - Material demand is derived from sales × BOM (product_variant_raw_materials)
 *     and cross-checked against material_consumption when that table has rows,
 *     because order data is more likely to be entered first than consumption.
 *   - Customer repurchase uses a slightly longer, column-light window.
 *
 * Everything degrades gracefully: with no data the bundle is empty and the UI
 * shows guidance rather than fabricated numbers.
 */

import { supabase } from '@/src/lib/supabase';
import {
  aggregateDaily,
  forecastSeries,
  futureDays,
  isoDay,
  repurchaseForecast,
  worstConfidence,
  type ChurnRisk,
  type ConfidenceLevel,
  type SeriesForecast,
} from './forecastEngine';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ForecastFilters {
  branchId: string | null;
  /** Days of history to learn from (sales/products/materials). */
  lookbackDays: number;
  /** Days of history for customer repurchase intervals (usually longer). */
  customerLookbackDays: number;
  /** Days to project into the future. */
  horizonDays: number;
}

export interface ProductForecast {
  variantId: string | null;
  sku: string;
  productName: string;
  series: SeriesForecast;
  /** Σ forecasted units over the horizon. */
  unitsForecast: number;
  unitsLower: number;
  unitsUpper: number;
  avgUnitPrice: number;
  revenueForecast: number;
  historicalUnits: number;
  confidence: ConfidenceLevel;
}

export type MaterialDemandSource = 'consumption' | 'bom' | 'none';

export interface MaterialForecast {
  materialId: string;
  name: string;
  sku: string;
  unit: string;
  currentStock: number;
  reorderPoint: number;
  safetyStock: number;
  leadTimeDays: number;
  series: SeriesForecast;
  avgDailyDemand: number;
  demandOverHorizon: number;
  daysToStockout: number | null;
  reorderRecommended: boolean;
  reorderByDate: string | null;
  suggestedOrderQty: number;
  demandSource: MaterialDemandSource;
  confidence: ConfidenceLevel;
}

export interface CustomerForecast {
  customerId: string;
  name: string;
  orders: number;
  lastOrderDate: string | null;
  recencyDays: number | null;
  avgIntervalDays: number | null;
  frequencyPerYear: number;
  monetaryTotal: number;
  avgOrderValue: number;
  predictedNextOrderDate: string | null;
  probBuyWithinHorizon: number;
  pAlive: number;
  churnRisk: ChurnRisk;
  expectedRevenueHorizon: number;
  segment: string;
}

export interface ForecastBundle {
  generatedAt: string;
  horizonDays: number;
  historyFrom: string;
  historyTo: string;
  futureDates: string[];

  revenue: SeriesForecast;
  orderVolume: SeriesForecast;

  products: ProductForecast[];
  materials: MaterialForecast[];
  customers: CustomerForecast[];

  summary: {
    forecastRevenue: number;
    forecastRevenueLower: number;
    forecastRevenueUpper: number;
    forecastOrders: number;
    forecastUnits: number;
    materialsAtRisk: number;
    customersLikelyToBuy: number;
    expectedRepurchaseRevenue: number;
  };

  dataQuality: {
    orders: number;
    lineItems: number;
    materialsTracked: number;
    customers: number;
    overallConfidence: ConfidenceLevel;
    warnings: string[];
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXCLUDED_ORDER_STATUSES = new Set(['Draft', 'Cancelled', 'Rejected', 'Quote', 'Voided']);
const TOP_PRODUCTS = 40;
const TOP_CUSTOMERS = 150;
/** Extra days of cover beyond supplier lead time when flagging reorders. */
const REORDER_SAFETY_DAYS = 7;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Embedded relations come back as object | array | null — normalise to one. */
function firstRel<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export async function fetchForecastBundle(filters: ForecastFilters): Promise<ForecastBundle> {
  const horizon = Math.max(1, filters.horizonDays);
  const today = isoDay(new Date());
  const historyTo = today;
  const historyFrom = isoDay(addDaysDate(new Date(), -(Math.max(14, filters.lookbackDays) - 1)));
  const customerFrom = isoDay(
    addDaysDate(new Date(), -(Math.max(filters.customerLookbackDays, filters.lookbackDays) - 1)),
  );
  const future = futureDays(historyTo, horizon);
  const warnings: string[] = [];

  // --- 1. Orders in window (revenue + volume) -----------------------------
  let ordersQ = supabase
    .from('orders')
    .select('id, order_date, status, branch_id, total_amount, customer_id, customer_name')
    .gte('order_date', historyFrom)
    .lte('order_date', historyTo);
  if (filters.branchId) ordersQ = ordersQ.eq('branch_id', filters.branchId);
  const { data: ordersRaw, error: ordersErr } = await ordersQ;
  if (ordersErr) console.warn('[forecast] orders', ordersErr.message);

  const orders = (ordersRaw ?? []).filter(
    (o) => o.order_date && !EXCLUDED_ORDER_STATUSES.has(String(o.status)),
  );

  const revRows = orders.map((o) => ({ date: String(o.order_date), value: num(o.total_amount) }));
  const volRows = orders.map((o) => ({ date: String(o.order_date), value: 1 }));

  const revenue = forecastSeries(aggregateDaily(revRows, historyFrom, historyTo), {
    horizon,
    futureDates: future,
    seasonality: true,
  });
  const orderVolume = forecastSeries(aggregateDaily(volRows, historyFrom, historyTo), {
    horizon,
    futureDates: future,
    seasonality: true,
  });

  // --- 2. Line items in window (products + BOM material demand) ------------
  let liQ = supabase
    .from('order_line_items')
    .select(
      'variant_id, sku, product_name, quantity, line_total, orders!inner(order_date, status, branch_id)',
    )
    .gte('orders.order_date', historyFrom)
    .lte('orders.order_date', historyTo);
  if (filters.branchId) liQ = liQ.eq('orders.branch_id', filters.branchId);
  const { data: liRaw, error: liErr } = await liQ;
  if (liErr) console.warn('[forecast] line items', liErr.message);

  type LineRow = {
    variant_id: string | null;
    sku: string | null;
    product_name: string | null;
    quantity: number | null;
    line_total: number | string | null;
    orders: { order_date: string; status: string; branch_id: string | null } | null | unknown;
  };
  const lineItems = ((liRaw ?? []) as LineRow[])
    .map((r) => {
      const ord = firstRel(r.orders as never);
      return { row: r, ord: ord as { order_date: string; status: string } | null };
    })
    .filter((x) => x.ord?.order_date && !EXCLUDED_ORDER_STATUSES.has(String(x.ord!.status)));

  // Per-variant daily units + price aggregation.
  const variantAgg = new Map<
    string,
    { sku: string; name: string; rows: { date: string; value: number }[]; units: number; revenue: number }
  >();
  for (const { row, ord } of lineItems) {
    const key = row.variant_id ?? `${row.sku ?? ''}|${row.product_name ?? ''}`;
    if (!key) continue;
    let agg = variantAgg.get(key);
    if (!agg) {
      agg = {
        sku: row.sku ?? '—',
        name: row.product_name ?? 'Unknown product',
        rows: [],
        units: 0,
        revenue: 0,
      };
      variantAgg.set(key, agg);
    }
    const q = num(row.quantity);
    agg.rows.push({ date: ord!.order_date.slice(0, 10), value: q });
    agg.units += q;
    agg.revenue += num(row.line_total);
  }

  const products: ProductForecast[] = [];
  for (const [variantId, agg] of variantAgg.entries()) {
    if (agg.units <= 0) continue;
    const series = forecastSeries(aggregateDaily(agg.rows, historyFrom, historyTo), {
      horizon,
      futureDates: future,
      seasonality: true,
    });
    const avgUnitPrice = agg.units > 0 ? agg.revenue / agg.units : 0;
    products.push({
      variantId: variantId.includes('|') ? null : variantId,
      sku: agg.sku,
      productName: agg.name,
      series,
      unitsForecast: series.total,
      unitsLower: series.totalLower,
      unitsUpper: series.totalUpper,
      avgUnitPrice: Math.round(avgUnitPrice * 100) / 100,
      revenueForecast: Math.round(series.total * avgUnitPrice * 100) / 100,
      historicalUnits: agg.units,
      confidence: series.confidence,
    });
  }
  products.sort((a, b) => b.unitsForecast - a.unitsForecast);

  // --- 3. Materials: stock catalogue + BOM + consumption ------------------
  const materials = await buildMaterialForecasts({
    lineItems,
    historyFrom,
    historyTo,
    future,
    horizon,
    warnings,
  });

  // --- 4. Customer repurchase ---------------------------------------------
  const customers = await buildCustomerForecasts({
    branchId: filters.branchId,
    from: customerFrom,
    to: historyTo,
    horizon,
    asOf: today,
  });

  // --- Warnings -----------------------------------------------------------
  if (orders.length === 0) {
    warnings.push('No orders found in the selected window. Forecasts will populate once sales data is entered.');
  } else if (orders.length < 20) {
    warnings.push(`Only ${orders.length} orders in the window — early forecasts are low confidence.`);
  }
  if (lineItems.length === 0 && orders.length > 0) {
    warnings.push('Orders have no line items, so per-product and material forecasts are limited.');
  }

  const overallConfidence = worstConfidence([revenue.confidence, orderVolume.confidence]);

  // --- Summary ------------------------------------------------------------
  const forecastUnits = products.reduce((a, p) => a + p.unitsForecast, 0);
  const materialsAtRisk = materials.filter((m) => m.reorderRecommended).length;
  const customersLikely = customers.filter((c) => c.probBuyWithinHorizon >= 0.5).length;
  const expectedRepurchaseRevenue = customers.reduce((a, c) => a + c.expectedRevenueHorizon, 0);

  return {
    generatedAt: new Date().toISOString(),
    horizonDays: horizon,
    historyFrom,
    historyTo,
    futureDates: future,
    revenue,
    orderVolume,
    products: products.slice(0, TOP_PRODUCTS),
    materials,
    customers: customers.slice(0, TOP_CUSTOMERS),
    summary: {
      forecastRevenue: revenue.total,
      forecastRevenueLower: revenue.totalLower,
      forecastRevenueUpper: revenue.totalUpper,
      forecastOrders: Math.round(orderVolume.total),
      forecastUnits: Math.round(forecastUnits),
      materialsAtRisk,
      customersLikelyToBuy: customersLikely,
      expectedRepurchaseRevenue: Math.round(expectedRepurchaseRevenue * 100) / 100,
    },
    dataQuality: {
      orders: orders.length,
      lineItems: lineItems.length,
      materialsTracked: materials.length,
      customers: customers.length,
      overallConfidence,
      warnings,
    },
  };
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

async function buildMaterialForecasts(args: {
  lineItems: { row: { variant_id: string | null; quantity: number | null }; ord: { order_date: string } | null }[];
  historyFrom: string;
  historyTo: string;
  future: string[];
  horizon: number;
  warnings: string[];
}): Promise<MaterialForecast[]> {
  const { lineItems, historyFrom, historyTo, future, horizon, warnings } = args;

  // Raw material catalogue (stock, reorder, lead time).
  const { data: rmRaw, error: rmErr } = await supabase
    .from('raw_materials')
    .select(
      'id, name, sku, total_stock, reorder_point, safety_stock, lead_time_days, unit_of_measure, status',
    );
  if (rmErr) console.warn('[forecast] raw_materials', rmErr.message);
  const rawMaterials = (rmRaw ?? []).filter((m) => String(m.status ?? 'Active') !== 'Archived');
  const rmById = new Map(rawMaterials.map((m) => [String(m.id), m]));

  // BOM: variant -> [{ materialId, qtyNeeded }]
  const variantIds = Array.from(
    new Set(lineItems.map((l) => l.row.variant_id).filter((v): v is string => Boolean(v))),
  );
  const bom = new Map<string, { materialId: string; qty: number }[]>();
  for (const ids of chunk(variantIds, 150)) {
    if (ids.length === 0) continue;
    const { data, error } = await supabase
      .from('product_variant_raw_materials')
      .select('variant_id, raw_material_id, quantity_needed')
      .in('variant_id', ids);
    if (error) {
      console.warn('[forecast] bom', error.message);
      continue;
    }
    for (const r of data ?? []) {
      if (!r.variant_id || !r.raw_material_id) continue;
      const list = bom.get(String(r.variant_id)) ?? [];
      list.push({ materialId: String(r.raw_material_id), qty: num(r.quantity_needed) });
      bom.set(String(r.variant_id), list);
    }
  }

  // BOM-derived daily demand per material from sales line items.
  const bomDemand = new Map<string, { date: string; value: number }[]>();
  for (const { row, ord } of lineItems) {
    if (!row.variant_id || !ord?.order_date) continue;
    const recipe = bom.get(String(row.variant_id));
    if (!recipe) continue;
    const date = ord.order_date.slice(0, 10);
    const units = num(row.quantity);
    for (const ing of recipe) {
      const list = bomDemand.get(ing.materialId) ?? [];
      list.push({ date, value: units * ing.qty });
      bomDemand.set(ing.materialId, list);
    }
  }

  // Direct consumption history (preferred when present).
  const consumptionDemand = new Map<string, { date: string; value: number }[]>();
  const { data: mcRaw, error: mcErr } = await supabase
    .from('material_consumption')
    .select('material_id, quantity_consumed, consumption_date')
    .gte('consumption_date', historyFrom)
    .lte('consumption_date', historyTo);
  if (mcErr) console.warn('[forecast] material_consumption', mcErr.message);
  for (const r of mcRaw ?? []) {
    if (!r.material_id || !r.consumption_date) continue;
    const list = consumptionDemand.get(String(r.material_id)) ?? [];
    list.push({ date: String(r.consumption_date).slice(0, 10), value: num(r.quantity_consumed) });
    consumptionDemand.set(String(r.material_id), list);
  }

  if (consumptionDemand.size === 0 && bomDemand.size > 0) {
    warnings.push('No material consumption records yet — material demand is derived from product sales via the bill of materials.');
  }

  const materialIds = new Set<string>([...consumptionDemand.keys(), ...bomDemand.keys()]);
  const out: MaterialForecast[] = [];

  for (const materialId of materialIds) {
    const rm = rmById.get(materialId);
    if (!rm) continue;

    const useConsumption = (consumptionDemand.get(materialId)?.length ?? 0) > 0;
    const source: MaterialDemandSource = useConsumption ? 'consumption' : bomDemand.has(materialId) ? 'bom' : 'none';
    const rows = useConsumption ? consumptionDemand.get(materialId)! : bomDemand.get(materialId) ?? [];
    if (rows.length === 0) continue;

    const series = forecastSeries(aggregateDaily(rows, historyFrom, historyTo), {
      horizon,
      futureDates: future,
      seasonality: false,
    });

    const currentStock = num(rm.total_stock);
    const reorderPoint = num(rm.reorder_point);
    const safetyStock = num(rm.safety_stock);
    const leadTimeDays = Math.round(num(rm.lead_time_days));
    const avgDailyDemand = series.dailyMean;
    const daysToStockout = avgDailyDemand > 0 ? Math.floor(currentStock / avgDailyDemand) : null;

    const coverNeeded = leadTimeDays + REORDER_SAFETY_DAYS;
    const reorderRecommended =
      (daysToStockout !== null && daysToStockout <= coverNeeded) ||
      (reorderPoint > 0 && currentStock <= reorderPoint);

    const reorderByDate =
      daysToStockout !== null
        ? isoDay(addDaysDate(new Date(), Math.max(0, daysToStockout - leadTimeDays)))
        : null;

    // Order enough to cover lead time + horizon + safety, net of current stock.
    const demandThroughLead = avgDailyDemand * (leadTimeDays + horizon);
    const suggestedOrderQty = Math.max(0, Math.round(demandThroughLead + safetyStock - currentStock));

    out.push({
      materialId,
      name: String(rm.name ?? 'Unknown material'),
      sku: String(rm.sku ?? '—'),
      unit: String(rm.unit_of_measure ?? 'kg'),
      currentStock,
      reorderPoint,
      safetyStock,
      leadTimeDays,
      series,
      avgDailyDemand: Math.round(avgDailyDemand * 1000) / 1000,
      demandOverHorizon: series.total,
      daysToStockout,
      reorderRecommended,
      reorderByDate,
      suggestedOrderQty,
      demandSource: source,
      confidence: series.confidence,
    });
  }

  // Most urgent first: reorder-recommended, then soonest stockout.
  out.sort((a, b) => {
    if (a.reorderRecommended !== b.reorderRecommended) return a.reorderRecommended ? -1 : 1;
    const ad = a.daysToStockout ?? Number.POSITIVE_INFINITY;
    const bd = b.daysToStockout ?? Number.POSITIVE_INFINITY;
    return ad - bd;
  });
  return out;
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

async function buildCustomerForecasts(args: {
  branchId: string | null;
  from: string;
  to: string;
  horizon: number;
  asOf: string;
}): Promise<CustomerForecast[]> {
  const { branchId, from, to, horizon, asOf } = args;

  let q = supabase
    .from('orders')
    .select('customer_id, customer_name, order_date, total_amount, status, branch_id')
    .gte('order_date', from)
    .lte('order_date', to);
  if (branchId) q = q.eq('branch_id', branchId);
  const { data, error } = await q;
  if (error) console.warn('[forecast] customer orders', error.message);

  const byCustomer = new Map<string, { name: string; dates: string[]; values: number[] }>();
  for (const o of data ?? []) {
    if (!o.customer_id || !o.order_date) continue;
    if (EXCLUDED_ORDER_STATUSES.has(String(o.status))) continue;
    const id = String(o.customer_id);
    let rec = byCustomer.get(id);
    if (!rec) {
      rec = { name: String(o.customer_name ?? 'Unknown customer'), dates: [], values: [] };
      byCustomer.set(id, rec);
    }
    rec.dates.push(String(o.order_date).slice(0, 10));
    rec.values.push(num(o.total_amount));
  }

  const out: CustomerForecast[] = [];
  for (const [customerId, rec] of byCustomer.entries()) {
    // Sort dates ascending, keep values aligned by re-pairing.
    const paired = rec.dates
      .map((d, i) => ({ d, v: rec.values[i] ?? 0 }))
      .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
    const r = repurchaseForecast({
      orderDates: paired.map((p) => p.d),
      orderValues: paired.map((p) => p.v),
      asOf,
      horizon,
    });
    out.push({
      customerId,
      name: rec.name,
      orders: r.orders,
      lastOrderDate: r.lastOrderDate,
      recencyDays: r.recencyDays,
      avgIntervalDays: r.avgIntervalDays,
      frequencyPerYear: r.frequencyPerYear,
      monetaryTotal: r.monetaryTotal,
      avgOrderValue: r.avgOrderValue,
      predictedNextOrderDate: r.predictedNextOrderDate,
      probBuyWithinHorizon: r.probBuyWithinHorizon,
      pAlive: r.pAlive,
      churnRisk: r.churnRisk,
      expectedRevenueHorizon: r.expectedRevenueHorizon,
      segment: r.segment,
    });
  }

  out.sort((a, b) => b.expectedRevenueHorizon - a.expectedRevenueHorizon);
  return out;
}

// ---------------------------------------------------------------------------
// Local date helper (Date math; engine helpers are ISO-string based)
// ---------------------------------------------------------------------------

function addDaysDate(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}
