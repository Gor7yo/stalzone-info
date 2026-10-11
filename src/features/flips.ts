"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { authed } from "./alerts";
import type { Region } from "@/lib/store";

export type Confidence = "high" | "medium" | "low";

/** Лот, который выгодно выкупить и перепродать (считает сервер по своей базе сделок). */
export interface Flip {
  itemId: string;
  /** -1 — у предмета нет качества */
  quality: number;
  upgrade: number;
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
  seenAt: string;
  endTime: string;
  lastSale: string;
}

export interface FlipFeed {
  region: Region;
  updatedAt: string;
  windowDays: number;
  flips: Flip[];
}

export const CONFIDENCE: Record<Confidence, { label: string; color: string; rank: number }> = {
  high: { label: "надёжно", color: "#7ee081", rank: 2 },
  medium: { label: "средне", color: "#ffc94a", rank: 1 },
  low: { label: "рискованно", color: "#ff5b79", rank: 0 },
};

/** Лента — только для Pro (сервер проверяет подписку по Telegram). */
export const useFlips = (region: Region, enabled = true) =>
  useQuery({
    enabled,
    queryKey: ["flips", region],
    queryFn: () => authed<FlipFeed>(`/api/flips?region=${region}`),
    staleTime: 60_000,
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  });
