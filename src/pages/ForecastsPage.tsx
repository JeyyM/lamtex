import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarClock,
  Info,
  Loader2,
  Package,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppContext } from '@/src/store/AppContext';
import { fetchBranches, type BranchOption } from '@/src/lib/agentAnalytics';
import {
  fetchForecastBundle,
  type CustomerForecast,
  type ForecastBundle,
  type MaterialForecast,
  type ProductForecast,
} from '@/src/lib/forecasting/forecastData';
import type { ConfidenceLevel, SeriesForecast } from '@/src/lib/forecasting/forecastEngine';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const peso = (n: number): string =>
  `₱${(n ?? 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

const pesoCompact = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `₱${(n / 1_000).toFixed(1)}k`;
  return `₱${Math.round(n)}`;
};

const numFmt = (n: number, dp = 0): string =>
  (n ?? 0).toLocaleString('en-PH', { maximumFractionDigits: dp });

const pct = (n: number): string => `${Math.round((n ?? 0) * 100)}%`;

const shortDate = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

// ---------------------------------------------------------------------------
// Confidence badge
// ---------------------------------------------------------------------------

const CONF_META: Record<ConfidenceLevel, { label: string; variant: 'success' | 'info' | 'warning' | 'neutral' }> = {
  high: { label: 'High confidence', variant: 'success' },
  medium: { label: 'Medium confidence', variant: 'info' },
  low: { label: 'Low confidence', variant: 'warning' },
  insufficient: { label: 'Not enough data', variant: 'neutral' },
};

function ConfidenceBadge({ level, compact }: { level: ConfidenceLevel; compact?: boolean }) {
  const m = CONF_META[level];
  return <Badge variant={m.variant}>{compact ? m.label.replace(' confidence', '') : m.label}</Badge>;
}

function ChurnBadge({ risk }: { risk: CustomerForecast['churnRisk'] }) {
  const map: Record<CustomerForecast['churnRisk'], { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
    low: { label: 'Active', variant: 'success' },
    medium: { label: 'Cooling', variant: 'warning' },
    high: { label: 'At risk', variant: 'danger' },
    unknown: { label: 'New', variant: 'neutral' },
  };
  const m = map[risk];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

// ---------------------------------------------------------------------------
// Forecast chart (history + projected band)
// ---------------------------------------------------------------------------

interface ChartRow {
  date: string;
  label: string;
  hist?: number;
  fc?: number;
  band?: [number, number];
}

function buildChartRows(series: SeriesForecast): ChartRow[] {
  const rows: ChartRow[] = series.history.map((h) => ({
    date: h.date,
    label: shortDate(h.date),
    hist: h.value,
  }));
  // Bridge the line: repeat the last historical value as the forecast anchor.
  const last = series.history[series.history.length - 1];
  if (last) {
    const anchor = rows[rows.length - 1];
    if (anchor) {
      anchor.fc = last.value;
      anchor.band = [last.value, last.value];
    }
  }
  for (const f of series.forecast) {
    rows.push({ date: f.date, label: shortDate(f.date), fc: f.value, band: [f.lower, f.upper] });
  }
  return rows;
}

function ForecastChart({
  series,
  height = 240,
  valueFmt = (n: number) => numFmt(n),
  color = '#dc2626',
}: {
  series: SeriesForecast;
  height?: number;
  valueFmt?: (n: number) => string;
  color?: string;
}) {
  const rows = useMemo(() => buildChartRows(series), [series]);
  return (
    <div className="w-full min-h-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minHeight={0}>
        <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={{ fontSize: 11 }} width={52} tickFormatter={(v) => valueFmt(Number(v))} />
          <Tooltip
            formatter={(value: unknown, name: string) => {
              if (name === 'Projected range' && Array.isArray(value)) {
                return [`${valueFmt(Number(value[0]))} – ${valueFmt(Number(value[1]))}`, name];
              }
              return [valueFmt(Number(value)), name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="band"
            name="Projected range"
            stroke="none"
            fill={color}
            fillOpacity={0.12}
            isAnimationActive={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="hist"
            name="Actual"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="fc"
            name="Forecast"
            stroke={color}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendChip({ series }: { series: SeriesForecast }) {
  if (series.trendDirection === 'flat') {
    return <span className="inline-flex items-center gap-1 text-gray-500 text-xs"><Activity className="w-3.5 h-3.5" /> Stable</span>;
  }
  if (series.trendDirection === 'up') {
    return <span className="inline-flex items-center gap-1 text-green-600 text-xs"><TrendingUp className="w-3.5 h-3.5" /> Rising</span>;
  }
  return <span className="inline-flex items-center gap-1 text-red-600 text-xs"><TrendingDown className="w-3.5 h-3.5" /> Falling</span>;
}

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: React.ReactNode;
  tone?: 'default' | 'danger' | 'success';
}) {
  const toneClass =
    tone === 'danger' ? 'text-red-600' : tone === 'success' ? 'text-green-600' : 'text-gray-900';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase tracking-wide">
          <Icon className="w-4 h-4" />
          {label}
        </div>
        <div className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</div>
        {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type Tab = 'overview' | 'sales' | 'materials' | 'customers';

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'sales', label: 'Sales & Revenue', icon: TrendingUp },
  { id: 'materials', label: 'Inventory & Materials', icon: Boxes },
  { id: 'customers', label: 'Customers', icon: Users },
];

const HORIZON_OPTIONS = [
  { days: 7, label: 'Next 7 days' },
  { days: 14, label: 'Next 14 days' },
  { days: 30, label: 'Next 30 days' },
];

const LOOKBACK_OPTIONS = [
  { days: 30, label: '30 days history' },
  { days: 90, label: '90 days history' },
  { days: 180, label: '180 days history' },
  { days: 365, label: '365 days history' },
];

export default function ForecastsPage() {
  const { role } = useAppContext();
  const [tab, setTab] = useState<Tab>('overview');
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [horizon, setHorizon] = useState(14);
  const [lookback, setLookback] = useState(90);

  const [bundle, setBundle] = useState<ForecastBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBranches().then(setBranches).catch(() => setBranches([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const b = await fetchForecastBundle({
        branchId,
        lookbackDays: lookback,
        customerLookbackDays: Math.max(lookback, 365),
        horizonDays: horizon,
      });
      setBundle(b);
    } catch (e) {
      console.error('[forecasts] load', e);
      setError(e instanceof Error ? e.message : 'Failed to load forecasts.');
    } finally {
      setLoading(false);
    }
  }, [branchId, lookback, horizon]);

  useEffect(() => {
    void load();
  }, [load]);

  const horizonLabel = HORIZON_OPTIONS.find((h) => h.days === horizon)?.label ?? `Next ${horizon} days`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Forecasts</h1>
            <Badge variant="info">Beta</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Demand, inventory and customer projections for the {horizonLabel.toLowerCase()}. Accuracy improves as more data is entered.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={branchId ?? ''}
            onChange={(e) => setBranchId(e.target.value || null)}
            className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 bg-white"
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={lookback}
            onChange={(e) => setLookback(Number(e.target.value))}
            className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 bg-white"
          >
            {LOOKBACK_OPTIONS.map((o) => (
              <option key={o.days} value={o.days}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 bg-white"
          >
            {HORIZON_OPTIONS.map((o) => (
              <option key={o.days} value={o.days}>
                {o.label}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Data quality banner */}
      {bundle && (
        <DataQualityBanner bundle={bundle} />
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                active
                  ? 'border-red-600 text-red-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      {error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-gray-700">{error}</p>
          </CardContent>
        </Card>
      ) : loading && !bundle ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      ) : bundle ? (
        <>
          {tab === 'overview' && <OverviewTab bundle={bundle} horizonLabel={horizonLabel} />}
          {tab === 'sales' && <SalesTab bundle={bundle} horizonLabel={horizonLabel} />}
          {tab === 'materials' && <MaterialsTab bundle={bundle} horizonLabel={horizonLabel} />}
          {tab === 'customers' && <CustomersTab bundle={bundle} horizonLabel={horizonLabel} />}
        </>
      ) : null}

      <MethodologyCard />

      {role !== 'Executive' && role !== 'Manager' && (
        <p className="text-xs text-gray-400">Viewing forecasts in {role} mode.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data quality banner
// ---------------------------------------------------------------------------

function DataQualityBanner({ bundle }: { bundle: ForecastBundle }) {
  const { dataQuality } = bundle;
  const hasWarnings = dataQuality.warnings.length > 0;
  return (
    <div
      className={`rounded-xl border p-4 ${
        hasWarnings ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Info className="w-4 h-4 text-gray-500" />
          Learning from <strong>{numFmt(dataQuality.orders)}</strong> orders,{' '}
          <strong>{numFmt(dataQuality.lineItems)}</strong> line items,{' '}
          <strong>{numFmt(dataQuality.materialsTracked)}</strong> materials,{' '}
          <strong>{numFmt(dataQuality.customers)}</strong> customers.
        </div>
        <ConfidenceBadge level={dataQuality.overallConfidence} />
      </div>
      {hasWarnings && (
        <ul className="mt-2 space-y-1 text-xs text-amber-800">
          {dataQuality.warnings.map((w, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

function OverviewTab({ bundle, horizonLabel }: { bundle: ForecastBundle; horizonLabel: string }) {
  const s = bundle.summary;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Kpi
          icon={Wallet}
          label={`Projected revenue · ${horizonLabel}`}
          value={pesoCompact(s.forecastRevenue)}
          sub={`Range ${pesoCompact(s.forecastRevenueLower)} – ${pesoCompact(s.forecastRevenueUpper)}`}
        />
        <Kpi icon={Package} label="Projected orders" value={numFmt(s.forecastOrders)} sub={horizonLabel} />
        <Kpi icon={BarChart3} label="Projected units sold" value={numFmt(s.forecastUnits)} sub="Across all products" />
        <Kpi
          icon={Boxes}
          label="Materials needing reorder"
          value={numFmt(s.materialsAtRisk)}
          tone={s.materialsAtRisk > 0 ? 'danger' : 'success'}
          sub="Within lead time + buffer"
        />
        <Kpi
          icon={Users}
          label="Customers likely to buy"
          value={numFmt(s.customersLikelyToBuy)}
          sub={`≥50% chance · ${horizonLabel}`}
        />
        <Kpi
          icon={Sparkles}
          label="Expected repurchase revenue"
          value={pesoCompact(s.expectedRepurchaseRevenue)}
          sub="Probability-weighted"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Revenue forecast</CardTitle>
          <div className="flex items-center gap-2">
            <TrendChip series={bundle.revenue} />
            <ConfidenceBadge level={bundle.revenue.confidence} compact />
          </div>
        </CardHeader>
        <CardContent>
          <ForecastChart series={bundle.revenue} valueFmt={pesoCompact} height={260} />
          <p className="mt-2 text-xs text-gray-400">Method: {bundle.revenue.method}.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Order volume forecast</CardTitle>
          <div className="flex items-center gap-2">
            <TrendChip series={bundle.orderVolume} />
            <ConfidenceBadge level={bundle.orderVolume.confidence} compact />
          </div>
        </CardHeader>
        <CardContent>
          <ForecastChart series={bundle.orderVolume} color="#2563eb" valueFmt={(n) => numFmt(n)} height={220} />
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sales tab
// ---------------------------------------------------------------------------

function SalesTab({ bundle, horizonLabel }: { bundle: ForecastBundle; horizonLabel: string }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Revenue forecast</CardTitle>
          <ConfidenceBadge level={bundle.revenue.confidence} compact />
        </CardHeader>
        <CardContent>
          <ForecastChart series={bundle.revenue} valueFmt={pesoCompact} height={280} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top products · projected demand ({horizonLabel.toLowerCase()})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bundle.products.length === 0 ? (
            <EmptyState message="No product sales found in the selected window yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-2.5">Product</th>
                    <th className="text-right px-4 py-2.5">Sold (hist.)</th>
                    <th className="text-right px-4 py-2.5">Forecast units</th>
                    <th className="text-right px-4 py-2.5">Range</th>
                    <th className="text-right px-4 py-2.5">Avg price</th>
                    <th className="text-right px-4 py-2.5">Forecast revenue</th>
                    <th className="text-right px-4 py-2.5">Trend</th>
                    <th className="text-right px-4 py-2.5">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bundle.products.map((p: ProductForecast, i) => (
                    <tr key={`${p.variantId ?? p.sku}-${i}`} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-gray-900">{p.productName}</div>
                        <div className="text-xs text-gray-400">{p.sku}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{numFmt(p.historicalUnits)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{numFmt(p.unitsForecast)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-400 text-xs">
                        {numFmt(p.unitsLower)}–{numFmt(p.unitsUpper)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{peso(p.avgUnitPrice)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">{peso(p.revenueForecast)}</td>
                      <td className="px-4 py-2.5 text-right"><TrendChip series={p.series} /></td>
                      <td className="px-4 py-2.5 text-right"><ConfidenceBadge level={p.confidence} compact /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Materials tab
// ---------------------------------------------------------------------------

function MaterialsTab({ bundle, horizonLabel }: { bundle: ForecastBundle; horizonLabel: string }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Material consumption & reorder outlook</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bundle.materials.length === 0 ? (
            <EmptyState message="No material demand signal yet. Once products with a bill of materials are sold (or consumption is logged), projections appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-2.5">Material</th>
                    <th className="text-right px-4 py-2.5">In stock</th>
                    <th className="text-right px-4 py-2.5">Daily demand</th>
                    <th className="text-right px-4 py-2.5">Need ({horizonLabel.toLowerCase()})</th>
                    <th className="text-right px-4 py-2.5">Days to stockout</th>
                    <th className="text-right px-4 py-2.5">Reorder by</th>
                    <th className="text-right px-4 py-2.5">Suggested qty</th>
                    <th className="text-center px-4 py-2.5">Source</th>
                    <th className="text-center px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bundle.materials.map((m: MaterialForecast) => (
                    <tr key={m.materialId} className={m.reorderRecommended ? 'bg-red-50/60 hover:bg-red-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-gray-900">{m.name}</div>
                        <div className="text-xs text-gray-400">{m.sku} · lead {m.leadTimeDays}d</div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{numFmt(m.currentStock, 1)} {m.unit}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{numFmt(m.avgDailyDemand, 2)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{numFmt(m.demandOverHorizon, 1)}</td>
                      <td className="px-4 py-2.5 text-right">
                        {m.daysToStockout === null ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <span className={m.daysToStockout <= m.leadTimeDays ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                            {m.daysToStockout}d
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {m.reorderByDate ? shortDate(m.reorderByDate) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                        {m.suggestedOrderQty > 0 ? `${numFmt(m.suggestedOrderQty)} ${m.unit}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge variant={m.demandSource === 'consumption' ? 'info' : 'neutral'}>
                          {m.demandSource === 'consumption' ? 'Logged' : 'From BOM'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {m.reorderRecommended ? <Badge variant="danger">Reorder</Badge> : <Badge variant="success">OK</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-gray-400">
        Material stock is tracked company-wide, so reorder figures aggregate across branches even when a branch filter is applied to sales.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Customers tab
// ---------------------------------------------------------------------------

function CustomersTab({ bundle, horizonLabel }: { bundle: ForecastBundle; horizonLabel: string }) {
  const likely = bundle.customers.filter((c) => c.probBuyWithinHorizon >= 0.5);
  const atRisk = bundle.customers.filter((c) => c.churnRisk === 'high' && c.orders >= 2);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi icon={CalendarClock} label={`Likely to buy · ${horizonLabel}`} value={numFmt(likely.length)} sub="≥50% probability" />
        <Kpi icon={AlertTriangle} label="At-risk customers" value={numFmt(atRisk.length)} tone={atRisk.length > 0 ? 'danger' : 'success'} sub="Overdue vs usual cadence" />
        <Kpi icon={Wallet} label="Expected repurchase revenue" value={pesoCompact(bundle.summary.expectedRepurchaseRevenue)} sub="Probability-weighted" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Repurchase outlook</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bundle.customers.length === 0 ? (
            <EmptyState message="No customer order history in the selected window yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-2.5">Customer</th>
                    <th className="text-left px-4 py-2.5">Segment</th>
                    <th className="text-right px-4 py-2.5">Orders</th>
                    <th className="text-right px-4 py-2.5">Last order</th>
                    <th className="text-right px-4 py-2.5">Avg cycle</th>
                    <th className="text-right px-4 py-2.5">Predicted next</th>
                    <th className="text-right px-4 py-2.5">P(buy {bundle.horizonDays}d)</th>
                    <th className="text-right px-4 py-2.5">Exp. revenue</th>
                    <th className="text-center px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bundle.customers.map((c: CustomerForecast) => (
                    <tr key={c.customerId} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-2.5 text-gray-600">{c.segment}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{numFmt(c.orders)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {c.lastOrderDate ? shortDate(c.lastOrderDate) : '—'}
                        {c.recencyDays !== null && <span className="text-gray-400 text-xs"> ({c.recencyDays}d)</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {c.avgIntervalDays ? `${c.avgIntervalDays}d` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {c.predictedNextOrderDate ? shortDate(c.predictedNextOrderDate) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={c.probBuyWithinHorizon >= 0.5 ? 'font-semibold text-green-600' : 'text-gray-700'}>
                          {pct(c.probBuyWithinHorizon)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">{peso(c.expectedRevenueHorizon)}</td>
                      <td className="px-4 py-2.5 text-center"><ChurnBadge risk={c.churnRisk} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-10 text-center">
      <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-gray-500 max-w-md mx-auto">{message}</p>
    </div>
  );
}

function MethodologyCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="w-4 h-4 text-gray-500" /> How these forecasts work
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-gray-600 space-y-2">
        <p>
          Each metric is built from a gap-filled daily history. A linear trend captures growth or decline, an
          additive weekly profile captures day-of-week patterns, and a prediction band (shaded) shows the
          likely range rather than a single point. When history is thin the model falls back to a damped
          average and is labelled <em>low confidence</em> so you don&apos;t over-trust early numbers.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Sales &amp; revenue:</strong> trend + weekly seasonality with uncertainty bands.</li>
          <li><strong>Materials:</strong> demand is derived from product sales via the bill of materials (or logged consumption when available), then compared against stock, reorder point, safety stock and supplier lead time to flag reorders.</li>
          <li><strong>Customers:</strong> inter-purchase intervals drive a buying rate, discounted by a recency-based &ldquo;still active&rdquo; probability, to estimate the chance of a repurchase and expected revenue.</li>
        </ul>
        <p className="text-xs text-gray-400">
          This is a built-in baseline engine — no external AI/LLM calls. As Lamtex enters more orders, consumption
          and customer data, confidence ratings rise automatically. A server-side statistical model (e.g. Nixtla
          StatsForecast / Prophet) can later replace this engine without changing the page.
        </p>
      </CardContent>
    </Card>
  );
}
