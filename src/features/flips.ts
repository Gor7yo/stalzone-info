"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { authed } from "./account";
import type { Region } from "@/lib/store";

export type Confidence = "high" | "medium" | "low";

/** Лот, который выгодно выкупить и перепродать (считает сервер по своей базе сделок). */
export interface Flip {
  /** ключ лота (у EXBO нет id): предмет, цена, время окончания - по нему запоминаем выбранные лоты */
  key: string;
  itemId: string;
  /** -1 — у предмета нет качества */
  quality: number;
  upgrade: number;
  /** ключевая характеристика модуля (marksman…); нет — у предмета её нет */
  variant?: string;
  amount: number;
  buyout: number;
  unitPrice: number;
  /** ожидаемая цена продажи за штуку — медиана сделок */
  sellUnit: number;
  /** прибыль после комиссии 5 %, весь лот */
  profit: number;
  pct: number;
  /** прибыль при продаже по нижнему квартилю сделок */
  profitLow: number;
  /** exact — сделки с той же заточкой, tier — со ступенью заточки */
  basis: "exact" | "tier";
  deals: number;
  perDay: number;
  confidence: Confidence;
  /** за сколько часов примерно уйдёт по медиане; null — дольше 48 ч (нет у старого бэкенда) */
  sellHours?: number | null;
  /** прибыль в час с учётом времени продажи */
  profitPerHour?: number | null;
  /** пакет: сколько из выгодных лотов позиции скупить, чтобы всё ушло за сутки */
  batch?: { lots: number; total: number; buyout: number; profit: number; sellHours: number };
  seenAt: string;
  /** когда сборщик впервые увидел лот - для пометки «новый» (нет у старого бэкенда) */
  firstSeenAt?: string;
  endTime: string;
  lastSale: string;
}

export interface FlipFeed {
  region: Region;
  updatedAt: string;
  windowDays: number;
  flips: Flip[];
  /** проверка по запросу: открытая лента раз в минуту освежает лоты региона; doneAt null - ещё идёт */
  refresh?: { startedAt: string; doneAt: string | null } | null;
}

/** Сервер прямо сейчас освежает лоты региона (подпись «обновляем рынок…»). */
export const isRefreshing = (feed?: FlipFeed) => !!feed?.refresh && !feed.refresh.doneAt;

export const CONFIDENCE: Record<Confidence, { label: string; color: string; rank: number }> = {
  high: { label: "надёжно", color: "#7ee081", rank: 2 },
  medium: { label: "средне", color: "#ffc94a", rank: 1 },
  low: { label: "рискованно", color: "#ff5b79", rank: 0 },
};

/** Комиссия аукциона с продажи. */
export const FEE = 0.05;

/** Расклад денег по лоту: продажа по медиане целиком, комиссия, выручка на руки и цена «худшего случая» за штуку. */
export function flipMoney(f: Flip) {
  const gross = f.sellUnit * f.amount;
  return {
    gross,
    fee: gross * FEE,
    revenue: gross * (1 - FEE),
    // profitLow считается по нижней четверти сделок: p25 × шт × 0,95 − выкуп
    lowUnit: (f.profitLow + f.buyout) / (f.amount * (1 - FEE)),
  };
}

/**
 * Лента — только для Pro (сервер проверяет подписку по Telegram).
 * Раз в 30 с, пока вкладка открыта: каждый запрос раз в минуту запускает у сервера проверку
 * свежих лотов региона. Пока она идёт - спрашиваем чаще, чтобы новые лоты появились сразу.
 */
export const useFlips = (region: Region, enabled = true) =>
  useQuery({
    enabled,
    queryKey: ["flips", region],
    queryFn: () => authed<FlipFeed>(`/api/flips?region=${region}`),
    staleTime: 15_000,
    refetchInterval: (query) => (isRefreshing(query.state.data) ? 4_000 : 30_000),
    placeholderData: keepPreviousData,
  });
