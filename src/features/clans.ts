"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Region } from "@/lib/store";

export interface Clan {
  id: string;
  name: string;
  tag: string;
  level: number;
  levelPoints: number;
  registrationTime: string;
  alliance?: string;
  description: string;
  leader: string;
  memberCount: number;
  region?: string;
}

interface ClanList {
  totalClans: number;
  data: Clan[];
}

/** Кратно 2 и 3 — на широком экране сетка в 2–3 колонки заполняется ровными рядами. */
export const CLANS_PAGE = 24;

export function useClans(region: Region, page: number) {
  return useQuery({
    queryKey: ["clans", region, page],
    queryFn: async () => {
      const res = await api<Record<string, ClanList>>("/api/clan/list", {
        region,
        limit: CLANS_PAGE,
        offset: page * CLANS_PAGE,
      });
      return res[region] ?? { totalClans: 0, data: [] };
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
}

export interface ClanSearch {
  total: number;
  data: Clan[];
  /** когда сервер последний раз обновил список кланов региона; null — ещё не загрузил */
  syncedAt: string | null;
}

/** Сколько кланов показываем в результатах поиска. */
export const CLAN_SEARCH_LIMIT = 50;

/** Поиск по названию, тегу и нику лидера среди всех кланов региона. */
export function useClanSearch(region: Region, query: string) {
  return useQuery({
    enabled: query.length > 0,
    queryKey: ["clan-search", region, query],
    queryFn: () =>
      api<ClanSearch>("/api/clan/search", {
        region,
        q: query,
        limit: CLAN_SEARCH_LIMIT,
      }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

/** Значение, которое меняется не чаще чем раз в ms: не дёргаем сервер на каждую букву. */
export function useDebounced<T>(value: T, ms = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function useClan(region: Region, id: string) {
  return useQuery({
    queryKey: ["clan", region, id],
    queryFn: () => api<Clan>("/api/clan/info", { region, clanId: id }),
    staleTime: 5 * 60_000,
  });
}

export const RANKS: Record<string, string> = {
  RECRUIT: "Рекрут",
  COMMONER: "Рядовой",
  SOLDIER: "Боец",
  SERGEANT: "Сержант",
  OFFICER: "Офицер",
  COLONEL: "Полковник",
  LEADER: "Лидер",
};

// ---------- метрики кланов (история с нашего сервера: снимки раз в час) ----------

export type ClanPeriod = "week" | "month" | "all";

export interface ClanWindow {
  key: "day" | "week" | "month";
  days: number;
  /** с какого момента считаем; null — истории нет */
  since: string | null;
  /** история покрывает окно целиком (иначе — с начала истории) */
  full: boolean;
  /** изменение числа бойцов */
  members: number | null;
}

export interface ClanMetrics {
  id: string;
  region: Region;
  /** false — клана нет в нашей копии (регион ещё не загружен) */
  available: boolean;
  updatedAt?: string;
  /** когда клан пропал из списка EXBO (распущен) */
  gone?: string | null;
  historyFrom?: string | null;
  current?: { memberCount: number; level: number };
  /** место по числу бойцов среди кланов региона */
  sizePlace?: { place: number; of: number };
  windows?: ClanWindow[];
  peak?: { memberCount: number; at: string };
  /** когда взят текущий уровень; null — уровень был с начала истории */
  levelSince?: string | null;
  period?: ClanPeriod;
  series?: { t: number; memberCount: number; level: number }[];
}

export function useClanMetrics(region: Region, id: string, period: ClanPeriod) {
  return useQuery({
    queryKey: ["clan-metrics", region, id, period],
    queryFn: () =>
      api<ClanMetrics>("/api/clan/metrics", { region, id, period }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
}

/** Клан в списках сводки. */
export interface ClanBrief {
  id: string;
  tag: string;
  name: string;
  alliance: string | null;
  level: number;
  memberCount: number;
  /** изменение бойцов за окно списка */
  delta?: number;
  /** дней с основания */
  ageDays?: number;
  /** уровень неделю назад */
  fromLevel?: number;
  /** когда распущен */
  goneAt?: string;
}

export interface ClanAnalytics {
  region: Region;
  updatedAt: string;
  historyFrom: string | null;
  windows: Record<"day" | "week", { since: string | null; full: boolean }>;
  totals: {
    clans: number;
    members: number;
    avgMembers: number;
    medianMembers: number;
    medianAgeDays: number;
    membersDay: number;
    membersWeek: number;
    joinedWeek: number;
    leftWeek: number;
    changedWeek: number;
  };
  growth: { day: ClanBrief[]; week: ClanBrief[] };
  decline: ClanBrief[];
  alliances: {
    alliance: string;
    clans: number;
    members: number;
    membersWeek: number;
    avgMembers: number;
    share: number;
  }[];
  newClans: { count: number; list: ClanBrief[] };
  levelUps: { count: number; list: ClanBrief[] };
  disbanded: { count: number; list: ClanBrief[] };
  levels: { level: number; clans: number; members: number }[];
  sizes: { label: string; clans: number }[];
  ages: { label: string; clans: number }[];
}

export function useClanAnalytics(region: Region) {
  return useQuery({
    queryKey: ["clan-analytics", region],
    queryFn: () => api<ClanAnalytics>("/api/clan/analytics", { region }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
}
