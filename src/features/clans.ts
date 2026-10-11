"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Region } from "@/lib/store";

export interface Clan {
  id: string;
  name: string;
  tag: string;
  level: number;
  levelPoint: number;
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
