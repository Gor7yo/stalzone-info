"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { DATA_VERSION } from "@/lib/dataVersion";
import { plural } from "@/lib/format";
import type { Region } from "@/lib/store";
import { bestPriceQuery } from "./auction";

/**
 * Бартер из официальной базы EXBO (public/barter.json, ~17 КБ gzip).
 *
 * Экономика ингредиентов:
 * - снаряжение (прошлый тир и т.п.) — покупается на аукционе;
 * - бартерные ресурсы привязываются при получении и на аукционе НЕ продаются:
 *   их фармят в открытом мире, а часть можно получить пересозданием
 *   («Блок данных «Гамма»» → 20 фрагментов) — сам блок на аукционе есть.
 */

export interface Offer {
  /** "money" — рубли, "sleeves" — обменки */
  currency: string;
  cost: number;
  items: { id: string; amount: number }[];
}

export interface Recipe {
  result: string;
  settlement: string;
  level: number;
  offers: Offer[];
}

export interface BarterIndex {
  byResult: Map<string, Recipe[]>;
  byIngredient: Map<string, Recipe[]>;
  /** ресурсы, которые только фармятся */
  farm: Set<string>;
  /** ресурс → из чего пересоздаётся */
  packs: Map<string, { id: string; amount: number }>;
  /** пакет → какой ресурс даёт */
  unpacks: Map<string, { id: string; amount: number }>;
  /** цена у скупщика на безопасной локации */
  buyer: Map<string, number>;
}

type RawRecipe = [string, number, number, [string, number, [string, number][]][]];

interface Raw {
  settlements: string[];
  recipes: RawRecipe[];
  farm: string[];
  packs: Record<string, [string, number]>;
  buyer: Record<string, number>;
}

const push = <K, V>(map: Map<K, V[]>, key: K, value: V) => {
  const list = map.get(key);
  if (list) {
    if (!list.includes(value)) list.push(value);
  } else map.set(key, [value]);
};

export const useBarter = () =>
  useQuery({
    queryKey: ["barter"],
    queryFn: async (): Promise<BarterIndex> => {
      const res = await fetch(`/barter.json?v=${DATA_VERSION}`);
      if (!res.ok) throw new Error("barter.json");
      const raw = (await res.json()) as Raw;

      const byResult = new Map<string, Recipe[]>();
      const byIngredient = new Map<string, Recipe[]>();

      for (const [result, s, level, offers] of raw.recipes) {
        const recipe: Recipe = {
          result,
          settlement: raw.settlements[s],
          level,
          offers: offers.map(([currency, cost, items]) => ({
            currency,
            cost,
            items: items.map(([id, amount]) => ({ id, amount })),
          })),
        };
        push(byResult, result, recipe);
        for (const offer of recipe.offers) for (const i of offer.items) push(byIngredient, i.id, recipe);
      }

      const packs = new Map(Object.entries(raw.packs).map(([res, [id, amount]]) => [res, { id, amount }]));
      const unpacks = new Map([...packs].map(([res, p]) => [p.id, { id: res, amount: p.amount }]));

      return {
        byResult,
        byIngredient,
        farm: new Set(raw.farm),
        packs,
        unpacks,
        buyer: new Map(Object.entries(raw.buyer)),
      };
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

// ---------- как достать ингредиент ----------

export type Source =
  | { kind: "market" }
  | { kind: "pack"; pack: string; per: number }
  | { kind: "farm" };

export function sourceOf(index: BarterIndex, id: string): Source {
  const pack = index.packs.get(id);
  if (pack) return { kind: "pack", pack: pack.id, per: pack.amount };
  if (index.farm.has(id)) return { kind: "farm" };
  return { kind: "market" };
}

/** Какие предметы нужно искать на аукционе, чтобы оценить ингредиенты. */
export function priceIdsFor(index: BarterIndex, ids: string[]) {
  const out = new Set<string>();
  for (const id of ids) {
    const s = sourceOf(index, id);
    if (s.kind === "market") out.add(id);
    if (s.kind === "pack") out.add(s.pack);
  }
  return [...out];
}

/** Лучшие цены сразу для набора предметов: Map<id, цена | null>. */
export function useBestPrices(region: Region, ids: string[]) {
  const results = useQueries({ queries: ids.map((id) => bestPriceQuery(region, id)) });
  const prices = new Map<string, number | null>();
  ids.forEach((id, i) => prices.set(id, results[i].data?.price ?? null));
  return { prices, isLoading: results.some((r) => r.isLoading) };
}

export interface Line {
  id: string;
  amount: number;
  source: Source;
  /** сколько пакетов купить (для kind = pack) */
  packs?: number;
  /** итог в рублях; null — купить нельзя (фарм) или нет лотов */
  total: number | null;
  /** цена у скупщика за всё количество — «упущенная выгода» фарма */
  buyerValue?: number;
}

export function priceLines(index: BarterIndex, items: { id: string; amount: number }[], prices: Map<string, number | null>): Line[] {
  return items.map(({ id, amount }) => {
    const source = sourceOf(index, id);
    const buyer = index.buyer.get(id);
    const buyerValue = buyer ? buyer * amount : undefined;

    if (source.kind === "market") {
      const p = prices.get(id);
      return { id, amount, source, total: p != null ? p * amount : null };
    }
    if (source.kind === "pack") {
      const packs = Math.ceil(amount / source.per);
      const p = prices.get(source.pack);
      return { id, amount, source, packs, total: p != null ? p * packs : null, buyerValue };
    }
    return { id, amount, source, total: null, buyerValue };
  });
}

export interface Cost {
  /** рубли: оплата поселениям + всё, что можно купить */
  rubles: number;
  exchange: number;
  lines: Line[];
  /** только фарм, купить нельзя */
  farmOnly: Line[];
  /** можно купить, но сейчас нет лотов */
  noLots: Line[];
}

export function totalCost(lines: Line[], payments: { currency: string; cost: number }[]): Cost {
  let rubles = 0;
  let exchange = 0;
  for (const p of payments) {
    if (p.currency === "money") rubles += p.cost;
    else exchange += p.cost;
  }
  for (const l of lines) rubles += l.total ?? 0;
  return {
    rubles,
    exchange,
    lines,
    farmOnly: lines.filter((l) => l.source.kind === "farm"),
    noLots: lines.filter((l) => l.source.kind !== "farm" && l.total == null),
  };
}

/** Складывает одинаковые ингредиенты (для планировщика). */
export function mergeItems(lists: { id: string; amount: number }[][]) {
  const sum = new Map<string, number>();
  for (const list of lists) for (const { id, amount } of list) sum.set(id, (sum.get(id) ?? 0) + amount);
  return [...sum].map(([id, amount]) => ({ id, amount }));
}

export const currencyLabel = (currency: string, amount = 0) =>
  currency === "money" ? "₽" : plural(amount, ["обменка", "обменки", "обменок"]);
