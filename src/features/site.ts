"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { authed } from "./account";

/** Тех. работы и баннер-объявление (настраивают админы, вкладка «Сайт» в /admin). */
export interface SiteStatus {
  /** сайт закрыт для всех, кроме админов; until - «примерно до», только для текста */
  maintenance: { message: string; until: string | null; since: string } | null;
  banner: { text: string; tone: "info" | "warn"; until: string | null } | null;
}

const SITE_KEY = ["site"] as const;
const ADMIN_SITE_KEY = ["admin", "site"] as const;

/**
 * Состояние сайта: при открытии и раз в минуту - тех. работы включат или выключат,
 * страница переключится сама. Ошибка запроса - сервер обновляется или недоступен.
 */
export const useSite = () =>
  useQuery({
    queryKey: SITE_KEY,
    queryFn: () => api<SiteStatus>("/api/site"),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });

/** Для админки: как есть, вместе с истёкшим баннером. */
export const useAdminSite = () =>
  useQuery({
    queryKey: ADMIN_SITE_KEY,
    queryFn: () => authed<SiteStatus>("/api/admin/site"),
  });

function useSiteMutation<T>(path: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: T) => authed<SiteStatus>(path, "POST", body),
    onSuccess: (data) => {
      qc.setQueryData(ADMIN_SITE_KEY, data);
      qc.invalidateQueries({ queryKey: SITE_KEY });
      qc.invalidateQueries({ queryKey: ["admin", "log"] });
    },
  });
}

export const useSetMaintenance = () => useSiteMutation<{ on: boolean; message?: string; until?: string }>("/api/admin/site/maintenance");

/** Пустой text - убрать баннер. */
export const useSetBanner = () => useSiteMutation<{ text?: string; tone?: "info" | "warn"; until?: string }>("/api/admin/site/banner");
