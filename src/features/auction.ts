"use client";

import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Region } from "@/lib/store";

/** qlt — качество (0–5), ptn — заточка (1–15; поля нет, если +0) */
export type Additional = { qlt?: number; ptn?: number; [key: string]: unknown };

export interface Lot {
  itemId: string;
  amount: number;
  startPrice: number;
  currentPrice?: number;
  buyoutPrice: number;
  startTime: string;
  endTime: string;
  additional?: Additional;
}

export interface LotsResponse {
  total: number;
  lots: Lot[];
}

export interface Sale {
  amount: number;
  price: number;
  time: string;
  additional?: Additional;
}

export interface HistoryResponse {
  total: number;
  prices: Sale[];
}

export type LotSort = "buyout_price" | "time_left" | "time_created" | "current_price";
export type SortOrder = "asc" | "desc";

const PAGE = 20;

/** pageSize: для предметов с качеством грузим сразу 200 лотов, чтобы фильтр по качеству работал по всему рынку. */
export function useLots(region: Region, item: string, sort: LotSort, order: SortOrder, enabled = true, pageSize = PAGE) {
  return useInfiniteQuery({
    enabled,
    queryKey: ["lots", region, item, sort, order, pageSize],
    queryFn: ({ pageParam }) =>
      api<LotsResponse>("/api/auction/lots", {
        region,
        item,
        additional: true,
        limit: pageSize,
        offset: pageParam,
        sort,
        order,
      }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.length * pageSize;
      return loaded < last.total ? loaded : undefined;
    },
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

/** Лучшая цена выкупа за штуку. Ключ кеша общий для всего приложения. */
export const bestPriceQuery = (region: Region, item: string) => ({
  queryKey: ["best-price", region, item],
  queryFn: async () => {
    const res = await api<LotsResponse>("/api/auction/lots", {
      region,
      item,
      // API ставит первыми лоты без выкупа (buyoutPrice = 0), поэтому берём с запасом
      limit: 200,
      offset: 0,
      sort: "buyout_price",
      order: "asc",
    });
    const prices = res.lots.map(lotUnitPrice).filter((p) => p > 0);
    return { price: prices.length ? Math.min(...prices) : null, total: res.total };
  },
  staleTime: 2 * 60_000,
});

export const useBestPrice = (region: Region, item: string, enabled = true) =>
  useQuery({ ...bestPriceQuery(region, item), enabled });

// ---------- история за период ----------

export type HistoryPeriod = "day" | "week" | "month" | "year";

const HOUR = 3_600_000;

/** bucketMs — шаг графика: на длинном периоде рисуем медиану по корзинам, а не тысячи точек. */
export const PERIODS: { value: HistoryPeriod; label: string; days: number; title: string; bucketMs: number }[] = [
  { value: "day", label: "День", days: 1, title: "за сутки", bucketMs: 0 },
  { value: "week", label: "Неделя", days: 7, title: "за неделю", bucketMs: 6 * HOUR },
  { value: "month", label: "Месяц", days: 30, title: "за месяц", bucketMs: 24 * HOUR },
  { value: "year", label: "Год", days: 365, title: "за год", bucketMs: 7 * 24 * HOUR },
];

export const periodInfo = (p: HistoryPeriod) => PERIODS.find((x) => x.value === p)!;

/**
 * Точки графика → медиана цены в каждой корзине времени (bucketMs = 0 — без изменений).
 * Так выборка за год не рисуется «пилой» с прямыми через пустые промежутки.
 */
export function bucketPoints(points: { t: number; price: number }[], bucketMs: number) {
  if (!bucketMs) return points;
  const buckets = new Map<number, number[]>();
  for (const p of points) {
    const key = Math.floor(p.t / bucketMs);
    const list = buckets.get(key);
    if (list) list.push(p.price);
    else buckets.set(key, [p.price]);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([key, prices]) => ({
      t: key * bucketMs + bucketMs / 2,
      price: quantile(prices.sort((a, b) => a - b), 0.5),
    }));
}

export interface PeriodHistoryResponse extends HistoryResponse {
  period: HistoryPeriod;
  since: string;
  /** true — период длинный, сервер прислал равномерную выборку сделок, а не все */
  sampled: boolean;
}

/**
 * История продаж за период одним запросом: страницы EXBO листает и кеширует сервер.
 * Чем длиннее период, тем дольше ответ живёт в кеше.
 */
export function useHistory(region: Region, item: string, period: HistoryPeriod, enabled = true) {
  return useQuery({
    enabled,
    queryKey: ["history", region, item, period],
    queryFn: () => api<PeriodHistoryResponse>("/api/auction/history/period", { region, item, period }),
    staleTime: period === "day" ? 60_000 : period === "year" ? 30 * 60_000 : 5 * 60_000,
    // при смене периода старый график остаётся на экране, пока грузится новый
    placeholderData: keepPreviousData,
  });
}

// ---------- аналитика цены ----------

export interface PriceStats {
  median: number;
  min: number;
  max: number;
  p25: number;
  p75: number;
  /** изменение медианы новой половины продаж относительно старой, % */
  trend: number | null;
  sales24h: number;
  points: { t: number; price: number }[];
}

const quantile = (sorted: number[], q: number) => {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

const unit = (s: { price: number; amount: number }) => s.price / Math.max(1, Number(s.amount) || 1);

/** Статистика только по свежим сделкам: старые продажи (год назад) рынок не описывают. */
export const STATS_WINDOW_DAYS = 30;
const MIN_SALES = 3;

const matching = (sales: Sale[], filter: LotFilter) =>
  sales.filter((s) => s.price > 0 && matchesFilter(s.additional, filter));

/** Последняя сделка (любой давности) — чтобы честно сказать «давно не продавался». */
export function lastSale(sales: Sale[], filter: LotFilter = ALL) {
  const latest = matching(sales, filter).reduce<Sale | null>(
    (best, s) => (!best || new Date(s.time) > new Date(best.time) ? s : best),
    null,
  );
  return latest ? { t: new Date(latest.time).getTime(), price: unit(latest) } : null;
}

/**
 * filter — считать только сделки с тем же качеством и заточкой (у артефактов цены разных вариантов несравнимы);
 * days — окно статистики (выбранный период истории).
 */
export function priceStats(sales: Sale[], filter: LotFilter = ALL, days = STATS_WINDOW_DAYS): PriceStats | null {
  const since = Date.now() - days * 86_400_000;
  const valid = matching(sales, filter).filter((s) => new Date(s.time).getTime() >= since);
  if (valid.length < MIN_SALES) return null;

  const points = valid
    .map((s) => ({ t: new Date(s.time).getTime(), price: unit(s) }))
    .sort((a, b) => a.t - b.t);

  const sorted = points.map((p) => p.price).sort((a, b) => a - b);
  const half = Math.floor(points.length / 2);
  const older = points.slice(0, half).map((p) => p.price).sort((a, b) => a - b);
  const newer = points.slice(half).map((p) => p.price).sort((a, b) => a - b);
  const olderMedian = quantile(older, 0.5);

  const dayAgo = Date.now() - 86_400_000;

  return {
    median: quantile(sorted, 0.5),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p25: quantile(sorted, 0.25),
    p75: quantile(sorted, 0.75),
    trend: points.length >= 6 && olderMedian > 0 ? ((quantile(newer, 0.5) - olderMedian) / olderMedian) * 100 : null,
    sales24h: points.filter((p) => p.t >= dayAgo).length,
    points,
  };
}

export const lotUnitPrice = (lot: Lot) =>
  lot.buyoutPrice > 0 ? lot.buyoutPrice / Math.max(1, lot.amount) : 0;

export type Deal = { kind: "hot" | "good" | "fair" | "high"; diff: number };

/** Насколько лот дешевле/дороже рыночной медианы. */
export function dealOf(lot: Lot, median: number | undefined): Deal | null {
  const price = lotUnitPrice(lot);
  if (!median || !price) return null;
  const diff = ((price - median) / median) * 100;
  if (diff <= -25) return { kind: "hot", diff };
  if (diff <= -8) return { kind: "good", diff };
  if (diff >= 25) return { kind: "high", diff };
  return { kind: "fair", diff };
}

// ---------- качество артефактов и модулей (additional.qlt) ----------

export const QUALITY: { label: string; short: string; color: string }[] = [
  { label: "Обычный", short: "Обычн.", color: "#a3a8a0" },
  { label: "Необычный", short: "Необыч.", color: "#7ee081" },
  { label: "Особый", short: "Особый", color: "#5aa9ff" },
  { label: "Редкий", short: "Редкий", color: "#b47cff" },
  { label: "Исключительный", short: "Исключ.", color: "#ff5b79" },
  { label: "Легендарный", short: "Легенд.", color: "#ffc94a" },
];

/** Номер качества лота/продажи или null, если у предмета нет качества. */
export const qualityOf = (additional?: Additional): number | null =>
  typeof additional?.qlt === "number" && QUALITY[additional.qlt] ? additional.qlt : null;

// ---------- заточка (additional.ptn) ----------

export const MAX_UPGRADE = 15;

/** Уровень заточки: поля ptn нет — значит +0. */
export const upgradeOf = (additional?: Additional): number =>
  typeof additional?.ptn === "number" ? Math.max(0, Math.min(MAX_UPGRADE, additional.ptn)) : 0;

/** Ступени заточки — запасной вариант для оценки «выгодно/дорого», когда сделок с точным уровнем мало. */
export const TIERS: { label: string; min: number; max: number }[] = [
  { label: "+0", min: 0, max: 0 },
  { label: "+1–4", min: 1, max: 4 },
  { label: "+5–9", min: 5, max: 9 },
  { label: "+10–14", min: 10, max: 14 },
  { label: "+15", min: 15, max: 15 },
];

export const tierOf = (additional?: Additional) => {
  const u = upgradeOf(additional);
  return TIERS.findIndex((t) => u >= t.min && u <= t.max);
};

/**
 * Фильтр лотов и сделок; null/undefined/пусто — без ограничения.
 * qualities / upgrades — выбранные пользователем качества и уровни заточки (любой набор);
 * quality / upgrade — одно точное значение (для оценки лота), tier — ступень заточки.
 */
export interface LotFilter {
  quality: number | null;
  qualities?: number[] | null;
  upgrade: number | null;
  upgrades?: number[] | null;
  tier?: number | null;
}

export const ALL: LotFilter = { quality: null, upgrade: null };

/** Выбранные качества по возрастанию (точное quality или набор qualities). */
export const pickedQualities = (f: Pick<LotFilter, "quality" | "qualities">) =>
  f.qualities?.length ? [...f.qualities].sort((a, b) => a - b) : f.quality !== null ? [f.quality] : [];

/** «Редкий», «Особый, Редкий» */
export const qualityLabel = (f: Pick<LotFilter, "quality" | "qualities">) =>
  pickedQualities(f)
    .map((q) => QUALITY[q]?.label)
    .filter(Boolean)
    .join(", ");

/** Выбраны ли уровни заточки (точный уровень или набор). */
export const hasUpgradeFilter = (f: LotFilter) => f.upgrade !== null || Boolean(f.upgrades?.length);

/** Набор уровней → подряд идущие отрезки: [1,3,4,5] → [[1,1],[3,5]] */
export function upgradeRuns(levels: number[]) {
  const runs: [number, number][] = [];
  for (const l of [...levels].sort((a, b) => a - b)) {
    const last = runs[runs.length - 1];
    if (last && l === last[1] + 1) last[1] = l;
    else runs.push([l, l]);
  }
  return runs;
}

/** «+5», «+5…+10», «+1, +5», «+1, +3…+5» */
export const upgradeLabel = (f: Pick<LotFilter, "upgrade" | "upgrades">) => {
  const levels = f.upgrades?.length ? f.upgrades : f.upgrade !== null ? [f.upgrade] : [];
  return upgradeRuns(levels)
    .map(([a, b]) => (a === b ? `+${a}` : `+${a}…+${b}`))
    .join(", ");
};

export const matchesFilter = (additional: Additional | undefined, f: LotFilter) => {
  const u = upgradeOf(additional);
  return (
    (f.quality === null || qualityOf(additional) === f.quality) &&
    (!f.qualities?.length || f.qualities.includes(qualityOf(additional) ?? -1)) &&
    (f.upgrade === null || u === f.upgrade) &&
    (!f.upgrades?.length || f.upgrades.includes(u)) &&
    (f.tier == null || tierOf(additional) === f.tier)
  );
};

/**
 * Медиана для оценки лота: сначала по точному качеству и заточке,
 * если таких сделок мало — по ступени заточки. Нет данных — undefined (без оценки).
 */
export function comparableMedian(sales: Sale[], additional?: Additional) {
  const quality = qualityOf(additional);
  return (
    priceStats(sales, { quality, upgrade: upgradeOf(additional) })?.median ??
    priceStats(sales, { quality, upgrade: null, tier: tierOf(additional) })?.median
  );
}
