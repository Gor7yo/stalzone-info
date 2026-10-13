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

export const CLANS_PAGE = 20;

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

/** Клан из поиска: сервер ищет по своей копии списка EXBO и знает место в рейтинге. */
export interface ClanHit extends Clan {
  rank: number;
}

export interface ClanSearch {
  total: number;
  data: ClanHit[];
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
    queryFn: () => api<ClanSearch>("/api/clan/search", { region, q: query, limit: CLAN_SEARCH_LIMIT }),
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
