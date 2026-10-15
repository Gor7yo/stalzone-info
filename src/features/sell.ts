"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { authed } from "./account";
import type { Region } from "@/lib/store";

export interface SalePrices {
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
}

/** Лот на рынке: цена за штуку и сколько штук. */
export interface LadderStep {
  unit: number;
  amount: number;
}

/** Помощник продажи: по какой цене выставить, чтобы продалось за N часов (считает сервер). */
export interface SellAdvice {
  region: Region;
  itemId: string;
  quality: number;
  upgrade: number;
  amount: number;
  updatedAt: string;
  /** exact — сделки с той же заточкой, tier — со ступенью заточки */
  basis: "exact" | "tier";
  windowDays: number;
  deals: number;
  units: number;
  ratePerHour: number;
  /** null — сделок мало, цене не верим */
  sales: SalePrices | null;
  lastSale: string | null;
  ladder: LadderStep[];
  lotsTotal: number;
  lotsAt: string | null;
  quick: { price: number; hours: number | null } | null;
  targets: { hours: number; price: number | null }[];
  fee: number;
}

export interface SellParams {
  region: Region;
  itemId: string;
  /** -1 — у предмета нет качества */
  quality: number;
  upgrade: number;
  amount: number;
}

/** Только для Pro (сервер проверяет подписку по Telegram). */
export const useSellAdvice = (p: SellParams, enabled = true) =>
  useQuery({
    enabled,
    queryKey: ["sell", p.region, p.itemId, p.quality, p.upgrade, p.amount],
    queryFn: () =>
      authed<SellAdvice>(
        `/api/sell/advice?region=${p.region}&item=${p.itemId}&quality=${p.quality}&upgrade=${p.upgrade}&amount=${p.amount}`,
      ),
    staleTime: 30_000,
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  });

// ---------- «моя цена → когда продастся»: та же модель, что на сервере (sell-estimate.ts) ----------

/** Часть спроса уходит на лоты, которые выставят после нас дешевле. */
const COMPETITION = 0.7;
/** Дольше лот на аукционе не живёт, ч. */
export const MAX_LOT_HOURS = 48;

const curve = (s: SalePrices): [number, number][] => [
  [s.p10, 0.9],
  [s.p25, 0.75],
  [s.median, 0.5],
  [s.p75, 0.25],
  [s.p90, 0.1],
];

/** Доля покупателей, готовых заплатить price (по ценам прошлых сделок). */
function demandShare(s: SalePrices, price: number) {
  const pts = curve(s);
  const lerp = ([x0, y0]: [number, number], [x1, y1]: [number, number]) =>
    x1 > x0 ? y0 + ((price - x0) / (x1 - x0)) * (y1 - y0) : price < x1 ? y0 : y1;
  let y: number;
  if (price <= pts[0][0]) y = lerp(pts[0], pts[1]);
  else if (price >= pts[4][0]) y = lerp(pts[3], pts[4]);
  else {
    const i = pts.findIndex(([x]) => x > price);
    y = lerp(pts[i - 1], pts[i]);
  }
  return Math.min(1, Math.max(0, y));
}

/** Сколько штук на рынке дешевле (или по той же цене) — их выкупят раньше. */
export const unitsAhead = (ladder: LadderStep[], price: number) => ladder.reduce((n, l) => (l.unit <= price ? n + l.amount : n), 0);

/** Примерное время продажи по цене, ч; null — вряд ли продастся за срок жизни лота. */
export function hoursToSell(a: SellAdvice, price: number): number | null {
  if (!a.sales) return null;
  const rate = a.ratePerHour * COMPETITION * demandShare(a.sales, price);
  if (rate <= 0) return null;
  const hours = (unitsAhead(a.ladder, price) + a.amount) / rate;
  return hours > MAX_LOT_HOURS ? null : hours;
}

/** «≈20 мин», «≈3 ч», «≈1,5 сут» */
export function formatHours(h: number) {
  if (h < 1) return `≈${Math.max(5, Math.round((h * 60) / 5) * 5)} мин`;
  if (h < 24) return `≈${Math.round(h)} ч`;
  return `≈${(Math.round((h / 24) * 10) / 10).toLocaleString("ru-RU")} сут`;
}

/** «за 1 ч», «за сутки», «за 2 суток» */
export const targetLabel = (h: number) => (h === 24 ? "за сутки" : h === 48 ? "за 2 суток" : `за ${h} ч`);
