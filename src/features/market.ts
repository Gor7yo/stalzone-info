"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Region } from "@/lib/store";

/** Радар рынка: что подорожало, подешевело и где больше всего сделок за сутки (бэкенд, раз в 5 минут). */

export interface RadarRow {
  itemId: string;
  /** -1 — без качества */
  quality: number;
  /** ступень заточки — индекс в TIERS */
  tier: number;
  /** медиана за штуку за сутки и за предыдущие сутки */
  price: number;
  prevPrice: number | null;
  /** изменение медианы, % (null — в прошлые сутки сделок мало) */
  change: number | null;
  deals: number;
  prevDeals: number;
  turnover: number;
}

export interface Radar {
  region: string;
  updatedAt: string;
  index: { change: number; groups: number };
  up: RadarRow[];
  down: RadarRow[];
  volume: RadarRow[];
}

export const useRadar = (region: Region) =>
  useQuery({
    queryKey: ["radar", region],
    queryFn: () => api<Radar>("/api/market/radar", { region }),
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
