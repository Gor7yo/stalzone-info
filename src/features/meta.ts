"use client";

import { useQuery } from "@tanstack/react-query";
import { DATA_VERSION } from "@/lib/dataVersion";

/** Названия статистик и достижений из официальной базы (public/meta.json, ~22 КБ gzip). */
export interface Meta {
  stats: Record<string, [name: string, category: string, type: string]>;
  achievements: Record<string, [title: string, description: string, points: number]>;
}

export const useMeta = () =>
  useQuery({
    queryKey: ["meta"],
    queryFn: async () => {
      const res = await fetch(`/meta.json?v=${DATA_VERSION}`);
      if (!res.ok) throw new Error("meta.json");
      return (await res.json()) as Meta;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

export const STAT_CATEGORIES: Record<string, string> = {
  COMBAT: "Бой",
  SURVIVAL: "Выживание",
  EXPLORATION: "Исследование",
  ECONOMY: "Экономика",
  SESSION_MODES: "Сессионные режимы",
  HIDEOUT: "Убежище",
  NONE: "Прочее",
};
