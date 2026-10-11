"use client";

import { useQuery } from "@tanstack/react-query";
import { api, isNotFound } from "@/lib/api";
import type { Region } from "@/lib/store";
import type { Clan } from "./clans";

export interface Stat {
  id: string;
  type: "INTEGER" | "DECIMAL" | "DATE" | "DURATION";
  value: number | string;
}

export interface Character {
  username: string;
  uuid: string;
  status: string;
  alliance: string;
  lastLogin: string;
  displayedAchievements: string[];
  clan?: {
    info: Clan;
    member: { name: string; rank: string; joinTime: string };
  };
  stats: Stat[];
}

export function useCharacter(region: Region, name: string) {
  return useQuery({
    queryKey: ["character", region, name.toLowerCase()],
    queryFn: () => api<Character>("/api/character/profile", { region, username: name }),
    enabled: name.length > 0,
    staleTime: 2 * 60_000,
    retry: (count, error) => !isNotFound(error) && count < 1,
  });
}
