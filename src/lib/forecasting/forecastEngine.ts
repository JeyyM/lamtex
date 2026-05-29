/**
 * Forecasting engine — pure statistical helpers, no database access.
 *
 * The models here are intentionally lightweight but principled: they go
 * beyond a flat average by fitting a linear trend, layering an additive
 * weekly seasonal profile on top, and quantifying uncertainty with
 * prediction intervals derived from in-sample residuals. When history is
 * too thin to support a trend/seasonality fit they degrade gracefully to a
 * damped moving-average baseline so the UI never shows a confidently wrong
 * number on sparse data.
 *
 * This file is deliberately framework-free so it can be unit-tested and,
 * later, swapped for a server-side / Python forecast without touching the UI.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient';

export interface DailyPoint {
  /** YYYY-MM-DD */
  date: string;
  value: number;
}

export interface ForecastPoint {
  /** YYYY-MM-DD */
  date: string;
  value: number;
  lower: number;
  upper: number;
}

export interface SeriesForecast {
  history: DailyPoint[];
  forecast: ForecastPoint[];
  /** Σ of point forecasts over the horizon. */
  total: number;
  totalLower: number;
  totalUpper: number;
  /** Average forecasted value per day over the horizon. */
  dailyMean: number;
  /** Average value per day across the (gap-filled) history window. */
  historyDailyMean: number;
  /** Trend slope in units/day from the fitted line. */
  trendPerDay: number;
  /** -1..1 direction strength for quick UI badges. */
  trendDirection: 'up' | 'down' | 'flat';
  confidence: ConfidenceLevel;
  /** Human-readable description of the method actually used. */
  method: string;
  /** Count of days with a non-zero observation. */
  observedDays: number;
  /** Calendar span of the history window in days. */
  spanDays: number;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function parseDay(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function addDays(iso: string, n: number): string {
  const d = parseDay(iso);
  d.setDate(d.getDate() + n);
  return isoDay(d);
}

export function daysBetweenInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  const end = parseDay(to);
  for (let d = parseDay(from); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(isoDay(new Date(d)));
  }
  return out;
}

export function diffDays(from: string, to: string): number {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000);
}

/** Future business dates (calendar days) following `lastHistoryDay`. */
export function futureDays(lastHistoryDay: string, horizon: number): string[] {
  const out: string[] = [];
  for (let k = 1; k <= horizon; k++) out.push(addDays(lastHistoryDay, k));
  return out;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/**
 * Collapse arbitrary dated rows into one gap-filled daily series spanning
 * [from, to]. Days with no rows become 0 so trend/seasonality see the real
 * cadence of demand (important for intermittent B2B ordering).
 */
export function aggregateDaily(
  rows: Array<{ date: string; value: number }>,
  from: string,
  to: string,
): DailyPoint[] {
  const bucket = new Map<string, number>();
  for (const r of rows) {
    if (!r.date) continue;
    const key = r.date.slice(0, 10);
    bucket.set(key, (bucket.get(key) ?? 0) + (Number.isFinite(r.value) ? r.value : 0));
  }
  return daysBetweenInclusive(from, to).map((date) => ({ date, value: bucket.get(date) ?? 0 }));
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1);
  return Math.sqrt(v);
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Ordinary least squares of y against its index 0..n-1. */
function ols(y: number[]): { slope: number; intercept: number } {
  const n = y.length;
  if (n < 2) return { slope: 0, intercept: y[0] ?? 0 };
  const xMean = (n - 1) / 2;
  const yMean = mean(y);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (y[i]! - yMean);
    den += (i - xMean) * (i - xMean);
  }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: yMean - slope * xMean };
}

/** z-multiplier for an ~80% two-sided prediction interval. */
const Z80 = 1.2816;

// ---------------------------------------------------------------------------
// Core series forecast
// ---------------------------------------------------------------------------

export interface ForecastOptions {
  horizon: number;
  /** Future dates to forecast. If omitted, derived from the last history day. */
  futureDates?: string[];
  /** Disable weekly seasonality (use for revenue where weekday effect is noisy). */
  seasonality?: boolean;
}

function classifyConfidence(
  observedDays: number,
  spanDays: number,
  relVolatility: number,
): ConfidenceLevel {
  let level: ConfidenceLevel;
  if (observedDays >= 30 && spanDays >= 56) level = 'high';
  else if (observedDays >= 12 && spanDays >= 21) level = 'medium';
  else if (observedDays >= 4) level = 'low';
  else level = 'insufficient';

  // High residual volatility relative to the mean knocks the rating down a peg.
  if (relVolatility > 1.5 && level === 'high') level = 'medium';
  if (relVolatility > 2.5 && level === 'medium') level = 'low';
  return level;
}

/**
 * Forecast a gap-filled daily series `horizon` days into the future.
 * Strategy:
 *   1. Fit a linear trend (captures growth/decline).
 *   2. Estimate an additive weekly profile from the detrended residuals.
 *   3. Forecast = trend(t) + weekday effect, floored at 0.
 *   4. Prediction band from residual sigma, widening with horizon.
 * Falls back to a damped mean when there is too little signal.
 */
export function forecastSeries(history: DailyPoint[], opts: ForecastOptions): SeriesForecast {
  const horizon = Math.max(1, opts.horizon);
  const useSeasonality = opts.seasonality !== false;
  const values = history.map((h) => h.value);
  const n = values.length;
  const lastDay = history[n - 1]?.date ?? isoDay(new Date());
  const future = opts.futureDates ?? futureDays(lastDay, horizon);

  const observedDays = values.filter((v) => v > 0).length;
  const spanDays = n > 0 ? diffDays(history[0]!.date, lastDay) + 1 : 0;
  const historyDailyMean = mean(values);

  // --- Sparse fallback: damped moving average -----------------------------
  if (n < 14 || observedDays < 4) {
    const recent = values.slice(-Math.min(14, n));
    const base = mean(recent);
    const sigma = Math.max(stddev(recent), base * 0.5, 0.0001);
    const fc: ForecastPoint[] = future.map((date, k) => {
      const widen = sigma * Math.sqrt(1 + k / Math.max(1, n));
      return {
        date,
        value: round2(Math.max(0, base)),
        lower: round2(Math.max(0, base - Z80 * widen)),
        upper: round2(base + Z80 * widen),
      };
    });
    return finalize(history, fc, {
      trendPerDay: 0,
      confidence: observedDays >= 4 ? 'low' : 'insufficient',
      method: 'Average baseline (limited history)',
      observedDays,
      spanDays,
      historyDailyMean,
    });
  }

  // --- Trend --------------------------------------------------------------
  const { slope, intercept } = ols(values);
  const detrended = values.map((v, i) => v - (intercept + slope * i));

  // --- Weekly seasonal profile (additive) ---------------------------------
  const weekday = (iso: string) => parseDay(iso).getDay();
  const seasonal = new Array(7).fill(0) as number[];
  if (useSeasonality) {
    const byDow: number[][] = Array.from({ length: 7 }, () => []);
    history.forEach((h, i) => byDow[weekday(h.date)]!.push(detrended[i]!));
    const rawDow = byDow.map((arr) => (arr.length ? mean(arr) : 0));
    const center = mean(rawDow);
    for (let i = 0; i < 7; i++) seasonal[i] = rawDow[i]! - center;
  }

  // --- In-sample residuals → sigma ----------------------------------------
  const fitted = values.map((_, i) => intercept + slope * i + seasonal[weekday(history[i]!.date)]!);
  const residuals = values.map((v, i) => v - fitted[i]!);
  const sigma = Math.max(stddev(residuals), 0.0001);
  const relVolatility = historyDailyMean > 0 ? sigma / historyDailyMean : 3;

  // --- Project forward ----------------------------------------------------
  const fc: ForecastPoint[] = future.map((date, k) => {
    const t = n - 1 + (k + 1);
    const point = Math.max(0, intercept + slope * t + seasonal[weekday(date)]!);
    const widen = sigma * Math.sqrt(1 + (k + 1) / n);
    return {
      date,
      value: round2(point),
      lower: round2(Math.max(0, point - Z80 * widen)),
      upper: round2(point + Z80 * widen),
    };
  });

  return finalize(history, fc, {
    trendPerDay: round4(slope),
    confidence: classifyConfidence(observedDays, spanDays, relVolatility),
    method: useSeasonality
      ? 'Linear trend + weekly seasonality'
      : 'Linear trend',
    observedDays,
    spanDays,
    historyDailyMean,
  });
}

function finalize(
  history: DailyPoint[],
  forecast: ForecastPoint[],
  meta: {
    trendPerDay: number;
    confidence: ConfidenceLevel;
    method: string;
    observedDays: number;
    spanDays: number;
    historyDailyMean: number;
  },
): SeriesForecast {
  const total = forecast.reduce((a, f) => a + f.value, 0);
  const totalLower = forecast.reduce((a, f) => a + f.lower, 0);
  const totalUpper = forecast.reduce((a, f) => a + f.upper, 0);
  const dailyMean = forecast.length ? total / forecast.length : 0;
  const dir: SeriesForecast['trendDirection'] =
    Math.abs(meta.trendPerDay) < (meta.historyDailyMean || 1) * 0.005
      ? 'flat'
      : meta.trendPerDay > 0
        ? 'up'
        : 'down';
  return {
    history,
    forecast,
    total: round2(total),
    totalLower: round2(totalLower),
    totalUpper: round2(totalUpper),
    dailyMean: round2(dailyMean),
    historyDailyMean: round2(meta.historyDailyMean),
    trendPerDay: meta.trendPerDay,
    trendDirection: dir,
    confidence: meta.confidence,
    method: meta.method,
    observedDays: meta.observedDays,
    spanDays: meta.spanDays,
  };
}

// ---------------------------------------------------------------------------
// Customer repurchase / behaviour models
// ---------------------------------------------------------------------------

export interface RepurchaseInput {
  /** Sorted ascending order dates (YYYY-MM-DD) for one customer. */
  orderDates: string[];
  /** Per-order monetary value, aligned with orderDates. */
  orderValues: number[];
  /** "Today" anchor for recency (YYYY-MM-DD). */
  asOf: string;
  /** Forecast horizon in days. */
  horizon: number;
}

export type ChurnRisk = 'low' | 'medium' | 'high' | 'unknown';

export interface RepurchaseResult {
  orders: number;
  lastOrderDate: string | null;
  firstOrderDate: string | null;
  recencyDays: number | null;
  avgIntervalDays: number | null;
  medianIntervalDays: number | null;
  /** Estimated purchases per 365 days. */
  frequencyPerYear: number;
  monetaryTotal: number;
  avgOrderValue: number;
  predictedNextOrderDate: string | null;
  /** P(at least one purchase within `horizon` days), 0..1. */
  probBuyWithinHorizon: number;
  /** "Buy-till-you-die" style P(still active), 0..1. */
  pAlive: number;
  churnRisk: ChurnRisk;
  expectedRevenueHorizon: number;
  /** RFM-style label. */
  segment: string;
}

/**
 * Repurchase model. Uses inter-purchase intervals to estimate a Poisson-ish
 * buying rate, then discounts by a recency-based "alive" probability so a
 * customer who has gone quiet for far longer than their usual gap is rated
 * unlikely to buy soon. Not a full Pareto/NBD, but the same intuition and
 * robust on small samples.
 */
export function repurchaseForecast(input: RepurchaseInput): RepurchaseResult {
  const { orderDates, orderValues, asOf, horizon } = input;
  const orders = orderDates.length;
  const monetaryTotal = orderValues.reduce((a, b) => a + b, 0);
  const avgOrderValue = orders > 0 ? monetaryTotal / orders : 0;

  if (orders === 0) {
    return emptyRepurchase();
  }

  const first = orderDates[0]!;
  const last = orderDates[orders - 1]!;
  const recencyDays = Math.max(0, diffDays(last, asOf));

  const intervals: number[] = [];
  for (let i = 1; i < orders; i++) intervals.push(Math.max(0, diffDays(orderDates[i - 1]!, orderDates[i]!)));

  if (orders === 1) {
    // No interval signal yet — flag as new/unknown, light heuristic on recency.
    const pAlive = recencyDays <= 60 ? 0.7 : recencyDays <= 120 ? 0.4 : 0.2;
    return {
      orders,
      lastOrderDate: last,
      firstOrderDate: first,
      recencyDays,
      avgIntervalDays: null,
      medianIntervalDays: null,
      frequencyPerYear: 0,
      monetaryTotal: round2(monetaryTotal),
      avgOrderValue: round2(avgOrderValue),
      predictedNextOrderDate: null,
      probBuyWithinHorizon: round4(pAlive * Math.min(0.5, horizon / 60)),
      pAlive: round4(pAlive),
      churnRisk: 'unknown',
      expectedRevenueHorizon: round2(pAlive * Math.min(0.5, horizon / 60) * avgOrderValue),
      segment: 'New',
    };
  }

  const avgInterval = mean(intervals);
  const medInterval = median(intervals);
  const frequencyPerYear = avgInterval > 0 ? 365 / avgInterval : 0;

  // Poisson rate of purchases per day from the average interval.
  const lambda = avgInterval > 0 ? 1 / avgInterval : 0;

  // Recency vs. typical gap → "still alive" probability.
  // At recency == avgInterval pAlive ~ 0.5; decays beyond that.
  const sd = Math.max(stddev(intervals), avgInterval * 0.3, 1);
  const z = (recencyDays - avgInterval) / sd;
  const pAlive = clamp01(1 / (1 + Math.exp(z)));

  // Base probability of >=1 purchase in horizon if active, then discount.
  const pIfActive = 1 - Math.exp(-lambda * horizon);
  const probBuy = clamp01(pAlive * pIfActive);

  const predictedNextOrderDate = addDays(last, Math.round(medInterval || avgInterval));

  const churnRisk: ChurnRisk =
    pAlive >= 0.6 ? 'low' : pAlive >= 0.3 ? 'medium' : 'high';

  return {
    orders,
    lastOrderDate: last,
    firstOrderDate: first,
    recencyDays,
    avgIntervalDays: Math.round(avgInterval),
    medianIntervalDays: Math.round(medInterval),
    frequencyPerYear: round2(frequencyPerYear),
    monetaryTotal: round2(monetaryTotal),
    avgOrderValue: round2(avgOrderValue),
    predictedNextOrderDate,
    probBuyWithinHorizon: round4(probBuy),
    pAlive: round4(pAlive),
    churnRisk,
    expectedRevenueHorizon: round2(probBuy * avgOrderValue),
    segment: rfmSegment(recencyDays, frequencyPerYear, monetaryTotal, avgInterval),
  };
}

function emptyRepurchase(): RepurchaseResult {
  return {
    orders: 0,
    lastOrderDate: null,
    firstOrderDate: null,
    recencyDays: null,
    avgIntervalDays: null,
    medianIntervalDays: null,
    frequencyPerYear: 0,
    monetaryTotal: 0,
    avgOrderValue: 0,
    predictedNextOrderDate: null,
    probBuyWithinHorizon: 0,
    pAlive: 0,
    churnRisk: 'unknown',
    expectedRevenueHorizon: 0,
    segment: 'No history',
  };
}

/** Coarse RFM-style segmentation tuned for B2B repeat ordering. */
function rfmSegment(
  recencyDays: number,
  frequencyPerYear: number,
  monetary: number,
  avgInterval: number,
): string {
  const overdue = avgInterval > 0 && recencyDays > avgInterval * 2;
  const frequent = frequencyPerYear >= 12;
  const valuable = monetary >= 0; // monetary thresholding is done at the page level relative to peers
  if (overdue && frequent) return 'At risk (was loyal)';
  if (overdue) return 'Lapsing';
  if (frequent && valuable) return 'Champion';
  if (frequent) return 'Loyal';
  if (recencyDays <= 30) return 'Recent';
  return 'Occasional';
}

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

function round4(x: number): number {
  return Math.round(x * 10_000) / 10_000;
}

export const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = {
  insufficient: 0,
  low: 1,
  medium: 2,
  high: 3,
};

export function worstConfidence(levels: ConfidenceLevel[]): ConfidenceLevel {
  if (levels.length === 0) return 'insufficient';
  return levels.reduce((acc, l) => (CONFIDENCE_RANK[l] < CONFIDENCE_RANK[acc] ? l : acc), 'high');
}
