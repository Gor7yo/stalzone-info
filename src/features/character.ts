"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
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

export type ProgressPeriod = "week" | "month";

/** Прирост статистики за период — по ежедневным снимкам нашего сервера. */
export interface Progress {
  username: string;
  /** с какого дня следим */
  since: string | null;
  /** снимок-начало; null — снимок пока один */
  from: string | null;
  to: string | null;
  period: ProgressPeriod;
  /** история покрывает весь период */
  full: boolean;
  days: number;
  /** прирост по id статы, только ненулевые */
  deltas: Record<string, number>;
  daily: { day: string; kil: number; dea: number; "pla-tim": number }[];
}

/**
 * Прогресс игрока. Запрашиваем после профиля: открытие профиля и пишет снимок.
 * 404 — игрока ещё не открывали (снимок пишется прямо сейчас).
 */
export function useProgress(region: Region, name: string, period: ProgressPeriod, enabled = true) {
  return useQuery({
    queryKey: ["character-progress", region, name.toLowerCase(), period],
    queryFn: () => api<Progress>("/api/character/progress", { region, username: name, period }),
    enabled: enabled && name.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60_000,
    retry: (count, error) => !isNotFound(error) && count < 1,
  });
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
