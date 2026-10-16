"use client";

import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { Lang } from "@/i18n/lang";
import { api } from "@/lib/api";
import type { Region } from "@/lib/store";
import { variantOf } from "./modules";

/** qlt — качество (0–5), ptn — заточка (1–15; поля нет, если +0), attributes — характеристики модуля */
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

/**
 * «Обновить»: сервер отдаёт лоты и продажи из своего снимка (до минуты давности).
 * После нажатия несколько секунд просим снимок посвежее — `fresh=true`.
 */
const freshUntil = new Map<string, number>();
export const requestFresh = (region: Region, item: string) => freshUntil.set(`${region}:${item}`, Date.now() + 3_000);
const fresh = (region: Region, item: string) => ((freshUntil.get(`${region}:${item}`) ?? 0) > Date.now() ? true : undefined);

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
        fresh: fresh(region, item),
      }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      // считаем пришедшие лоты, а не запрошенные: из EXBO приходит не больше 200 за раз
      const loaded = pages.reduce((n, p) => n + p.lots.length, 0);
      return last.lots.length && loaded < last.total ? loaded : undefined;
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
      // для цены в списках годится снимок сервера до 10 минут давности (не тратит квоту EXBO)
      maxAge: fresh(region, item) ? undefined : 600,
      fresh: fresh(region, item),
    });
    const prices = res.lots.map(lotUnitPrice).filter((p) => p > 0);
    return { price: prices.length ? Math.min(...prices) : null, total: res.total };
  },
  staleTime: 2 * 60_000,
});

export const useBestPrice = (region: Region, item: string, enabled = true) => useQuery({ ...bestPriceQuery(region, item), enabled });

// ---------- история за период ----------

/** day / week — периоды графика (Pro); month — список продаж бесплатной версии. */
export type HistoryPeriod = "day" | "week" | "month";

const HOUR = 3_600_000;

type PeriodInfo = { value: HistoryPeriod; label: string; days: number; title: string; bucketMs: number };

/** Периоды графика (переключатель). bucketMs — шаг: на длинном периоде рисуем медиану по корзинам, а не тысячи точек. */
export const PERIODS: PeriodInfo[] = [
  { value: "day", label: "День", days: 1, title: "за сутки", bucketMs: 0 },
  { value: "week", label: "Неделя", days: 7, title: "за неделю", bucketMs: 6 * HOUR },
];

/** Бесплатная версия: без графика, история продаж за месяц. */
export const FREE_PERIOD: PeriodInfo = { value: "month", label: "Месяц", days: 30, title: "за месяц", bucketMs: 24 * HOUR };

const PERIOD_EN: Record<HistoryPeriod, { label: string; title: string }> = {
  day: { label: "Day", title: "in 24 hours" },
  week: { label: "Week", title: "this week" },
  month: { label: "Month", title: "this month" },
};

/** Период с подписями на языке интерфейса. */
export const localizePeriod = (p: PeriodInfo, lang: Lang): PeriodInfo => (lang === "en" ? { ...p, ...PERIOD_EN[p.value] } : p);

export const periodInfo = (p: HistoryPeriod, lang: Lang = "ru") =>
  localizePeriod(p === "month" ? FREE_PERIOD : PERIODS.find((x) => x.value === p)!, lang);

/**
 * Точки графика → медиана цены в каждой корзине времени (bucketMs = 0 — без изменений).
 * Так выборка за год не рисуется «пилой» с прямыми через пустые промежутки.
 */
export function bucketPoints(points: ChartPoint[], bucketMs: number): ChartPoint[] {
  if (!bucketMs) return points;
  const buckets = new Map<number, ChartPoint[]>();
  for (const p of points) {
    const key = Math.floor(p.t / bucketMs);
    const list = buckets.get(key);
    if (list) list.push(p);
    else buckets.set(key, [p]);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([key, list]) =>
      // одна сделка в корзине — оставляем её как есть (с качеством и заточкой для подсказки)
      list.length === 1
        ? list[0]
        : {
            t: key * bucketMs + bucketMs / 2,
            price: quantile(
              list.map((p) => p.price).sort((a, b) => a - b),
              0.5,
            ),
            count: list.length,
          },
    );
}

export interface PeriodHistoryResponse extends HistoryResponse {
  period: HistoryPeriod;
  since: string;
  /** true — период длинный, сервер прислал равномерную выборку сделок, а не все */
  sampled: boolean;
}

/**
 * История продаж за период одним запросом: сервер берёт её из своей базы сделок
 * (пока база не накопила историю предмета — листает страницы EXBO).
 * Чем длиннее период, тем дольше ответ живёт в кеше.
 */
export function useHistory(region: Region, item: string, period: HistoryPeriod, enabled = true) {
  return useQuery({
    enabled,
    queryKey: ["history", region, item, period],
    queryFn: () => api<PeriodHistoryResponse>("/api/auction/history/period", { region, item, period, fresh: fresh(region, item) }),
    staleTime: period === "day" ? 60_000 : 5 * 60_000,
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
  points: ChartPoint[];
}

/**
 * Точка графика. У сделки — её качество и заточка (для подсказки «Редкий +15»),
 * у корзины (медиана за 6 ч / день / неделю) — сколько сделок в неё вошло.
 */
export interface ChartPoint {
  t: number;
  price: number;
  quality?: number | null;
  upgrade?: number;
  count?: number;
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

const matching = (sales: Sale[], filter: LotFilter) => sales.filter((s) => s.price > 0 && matchesFilter(s.additional, filter));

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
    .map((s): ChartPoint => ({
      t: new Date(s.time).getTime(),
      price: unit(s),
      quality: qualityOf(s.additional),
      upgrade: upgradeOf(s.additional),
    }))
    .sort((a, b) => a.t - b.t);

  const sorted = points.map((p) => p.price).sort((a, b) => a - b);
  const half = Math.floor(points.length / 2);
  const older = points
    .slice(0, half)
    .map((p) => p.price)
    .sort((a, b) => a - b);
  const newer = points
    .slice(half)
    .map((p) => p.price)
    .sort((a, b) => a - b);
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

export const lotUnitPrice = (lot: Lot) => (lot.buyoutPrice > 0 ? lot.buyoutPrice / Math.max(1, lot.amount) : 0);

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

const QUALITY_EN: typeof QUALITY = [
  { label: "Common", short: "Common", color: "#a3a8a0" },
  { label: "Uncommon", short: "Uncom.", color: "#7ee081" },
  { label: "Special", short: "Special", color: "#5aa9ff" },
  { label: "Rare", short: "Rare", color: "#b47cff" },
  { label: "Exceptional", short: "Except.", color: "#ff5b79" },
  { label: "Legendary", short: "Legend.", color: "#ffc94a" },
];

/** Качества с подписями на языке интерфейса (индексы те же, что у QUALITY). */
export const qualities = (lang: Lang) => (lang === "en" ? QUALITY_EN : QUALITY);

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
  /** Ключевая характеристика модуля (marksman…); null/undefined — любая */
  variant?: string | null;
}

export const ALL: LotFilter = { quality: null, upgrade: null };

/** Выбранные качества по возрастанию (точное quality или набор qualities). */
export const pickedQualities = (f: Pick<LotFilter, "quality" | "qualities">) =>
  f.qualities?.length ? [...f.qualities].sort((a, b) => a - b) : f.quality !== null ? [f.quality] : [];

/** «Редкий», «Особый, Редкий» */
export const qualityLabel = (f: Pick<LotFilter, "quality" | "qualities">, lang: Lang = "ru") =>
  pickedQualities(f)
    .map((q) => qualities(lang)[q]?.label)
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
    (f.tier == null || tierOf(additional) === f.tier) &&
    (f.variant == null || variantOf(additional) === f.variant)
  );
};

/**
 * Медиана для оценки лота: сначала по точному качеству и заточке,
 * если таких сделок мало — по ступени заточки. Ключевая характеристика модуля — всегда точная
 * (модули с разной характеристикой стоят несравнимо). Нет данных — undefined (без оценки).
 */
export function comparableMedian(sales: Sale[], additional?: Additional) {
  const quality = qualityOf(additional);
  const variant = variantOf(additional);
  return (
    priceStats(sales, { quality, upgrade: upgradeOf(additional), variant })?.median ??
    priceStats(sales, { quality, upgrade: null, tier: tierOf(additional), variant })?.median
  );
}
