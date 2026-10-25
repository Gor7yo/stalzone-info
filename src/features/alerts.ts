"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tr } from "@/i18n/lang";
import type { Region } from "@/lib/store";
import { ensureWriteAccess, isTelegram } from "@/lib/telegram";
import { authed, useMe } from "./account";

/** Алерт «предмет дешевле порога» (уведомление приходит в Telegram-бота). */
export interface PriceAlert {
  id: string;
  region: Region;
  itemId: string;
  itemName: string;
  /** Старые алерты: одно качество (новые пишут qualities) */
  quality: number | null;
  /** Выбранные качества; пусто — любое */
  qualities: number[];
  /** Старые алерты: один уровень заточки (новые пишут upgrades) */
  upgrade: number | null;
  /** Выбранные уровни заточки; пусто — любая */
  upgrades: number[];
  /** Ключевая характеристика модуля; "" — любая */
  variant: string;
  maxPrice: number;
  lastNotifiedAt: string | null;
  createdAt: string;
}

/** Флип-алерт: бот присылает новые выгодные лоты из ленты флиппера (один на регион). */
export interface FlipAlert {
  id: string;
  region: Region;
  minProfit: number;
  minPct: number;
  minConfidence: "low" | "medium" | "high";
  /** 0 — любой */
  maxBudget: number;
  /** пусто — любые категории */
  groups: string[];
  lastNotifiedAt: string | null;
  createdAt: string;
}

export type FlipAlertInput = Pick<FlipAlert, "region" | "minProfit" | "minConfidence" | "maxBudget" | "groups">;

export interface AlertsOverview {
  emission: Region[];
  /** радар рынка (Pro); нет у старого бэкенда */
  radar?: Region[];
  blocked: boolean;
  price: PriceAlert[];
  flip: FlipAlert[];
}

export interface NewPriceAlert {
  region: Region;
  itemId: string;
  itemName: string;
  qualities?: number[];
  upgrades?: number[];
  variant?: string;
  maxPrice: number;
}

const KEY = ["alerts"] as const;

/**
 * Алерты аккаунта. Уведомления приходят в бота, поэтому нужны вход (available)
 * и привязанный Telegram (telegram). sentTo — кому придут уведомления (на сайте, не в мини-приложении).
 */
export function useAlerts() {
  const { me, loggedIn, pending } = useMe();
  const telegram = Boolean(me?.telegram);
  const query = useQuery({
    queryKey: KEY,
    queryFn: () => authed<AlertsOverview>("/api/alerts"),
    enabled: loggedIn && telegram,
    staleTime: 30_000,
  });
  return {
    ...query,
    available: loggedIn,
    pending,
    telegram,
    sentTo: !isTelegram() && me?.telegram ? me.telegram : null,
  };
}

/** Перед первым алертом просим у Telegram разрешение боту писать пользователю. */
async function withWriteAccess() {
  // привязка через бота уже означает, что пользователь нажал Start — писать ему можно
  if (!isTelegram()) return;
  if (!(await ensureWriteAccess())) {
    throw new Error(
      tr(
        "Разрешите боту присылать сообщения - иначе уведомления не дойдут",
        "Allow the bot to message you - otherwise alerts won't arrive",
      ),
    );
  }
}

export function useCreatePriceAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alert: NewPriceAlert) => {
      await withWriteAccess();
      return authed<PriceAlert>("/api/alerts/price", "POST", alert);
    },
    onSuccess: (created) => qc.setQueryData<AlertsOverview>(KEY, (old) => old && { ...old, price: [...old.price, created] }),
  });
}

export function useDeletePriceAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => authed<void>(`/api/alerts/price/${encodeURIComponent(id)}`, "DELETE"),
    onSuccess: (_, id) => qc.setQueryData<AlertsOverview>(KEY, (old) => old && { ...old, price: old.price.filter((a) => a.id !== id) }),
  });
}

/** Включить флип-алерт региона или обновить его условия. */
export function useSetFlipAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: FlipAlertInput) => {
      await withWriteAccess();
      return authed<FlipAlert>("/api/alerts/flip", "PUT", input);
    },
    onSuccess: (saved) =>
      qc.setQueryData<AlertsOverview>(
        KEY,
        (old) => old && { ...old, flip: [...(old.flip ?? []).filter((f) => f.region !== saved.region), saved] },
      ),
  });
}

export function useDeleteFlipAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (region: Region) => authed<void>(`/api/alerts/flip/${region}`, "DELETE"),
    onSuccess: (_, region) =>
      qc.setQueryData<AlertsOverview>(KEY, (old) => old && { ...old, flip: (old.flip ?? []).filter((f) => f.region !== region) }),
  });
}

export function useToggleEmissionAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ region, enabled }: { region: Region; enabled: boolean }) => {
      if (enabled) await withWriteAccess();
      return authed<{ emission: Region[] }>("/api/alerts/emission", "PUT", { region, enabled });
    },
    onSuccess: ({ emission }) => qc.setQueryData<AlertsOverview>(KEY, (old) => old && { ...old, emission }),
  });
}

/** Радар рынка (Pro): сообщения о резких движениях цен по ходовым предметам региона. */
export function useToggleRadar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ region, enabled }: { region: Region; enabled: boolean }) => {
      if (enabled) await withWriteAccess();
      return authed<{ radar: Region[] }>("/api/alerts/radar", "PUT", { region, enabled });
    },
    onSuccess: ({ radar }) => qc.setQueryData<AlertsOverview>(KEY, (old) => old && { ...old, radar }),
  });
}
