"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Region } from "@/lib/store";
import { ensureWriteAccess, initDataRaw, isTelegram, useIsTelegram } from "@/lib/telegram";
import { tgSession, useTgSession } from "@/lib/tgSession";

/** Алерт «предмет дешевле порога» (уведомление приходит в Telegram-бота). */
export interface PriceAlert {
  id: string;
  region: Region;
  itemId: string;
  itemName: string;
  quality: number | null;
  upgrade: number | null;
  maxPrice: number;
  lastNotifiedAt: string | null;
  createdAt: string;
}

export interface AlertsOverview {
  emission: Region[];
  blocked: boolean;
  price: PriceAlert[];
}

export interface NewPriceAlert {
  region: Region;
  itemId: string;
  itemName: string;
  quality?: number;
  upgrade?: number;
  maxPrice: number;
}

const KEY = ["alerts"] as const;

/**
 * Запрос от имени пользователя Telegram: в мини-приложении — подписанный initData,
 * в браузере — токен сессии, полученный при привязке через бота.
 */
async function authed<T>(path: string, method = "GET", body?: unknown) {
  const initData = initDataRaw();
  const session = initData ? null : tgSession.get();
  if (!initData && !session) throw new Error("Сначала привяжите Telegram");
  try {
    return await api<T>(path, {}, {
      method,
      headers: {
        Authorization: initData ? `tma ${initData}` : `Bearer ${session!.token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    // сессию отозвали (отвязали в другом браузере / истекла) — забываем её
    if (session && error instanceof ApiError && error.status === 401) tgSession.clear();
    throw error;
  }
}

/**
 * Алерты доступны внутри Telegram и в браузере, привязанном к Telegram.
 * linkedAs — кому придут уведомления, если это браузер (в мини-приложении null).
 */
export function useAlerts() {
  const inTelegram = useIsTelegram();
  const session = useTgSession();
  const available = inTelegram || Boolean(session);
  const query = useQuery({
    queryKey: KEY,
    queryFn: () => authed<AlertsOverview>("/api/alerts"),
    enabled: available,
    staleTime: 30_000,
  });
  return { ...query, available, linkedAs: inTelegram ? null : session };
}

/** Перед первым алертом просим у Telegram разрешение боту писать пользователю. */
async function withWriteAccess() {
  // привязка через бота уже означает, что пользователь нажал Start — писать ему можно
  if (!isTelegram()) return;
  if (!(await ensureWriteAccess())) {
    throw new Error("Разрешите боту присылать сообщения — иначе уведомления не дойдут");
  }
}

export function useCreatePriceAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alert: NewPriceAlert) => {
      await withWriteAccess();
      return authed<PriceAlert>("/api/alerts/price", "POST", alert);
    },
    onSuccess: (created) =>
      qc.setQueryData<AlertsOverview>(KEY, (old) => old && { ...old, price: [...old.price, created] }),
  });
}

export function useDeletePriceAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => authed<void>(`/api/alerts/price/${encodeURIComponent(id)}`, "DELETE"),
    onSuccess: (_, id) =>
      qc.setQueryData<AlertsOverview>(KEY, (old) => old && { ...old, price: old.price.filter((a) => a.id !== id) }),
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

// ---------- привязка браузера к Telegram через бота ----------

interface LinkCode {
  code: string;
  url: string;
  expiresAt: string;
}

type ClaimResult =
  | { status: "pending" }
  | { status: "linked"; token: string; user: { firstName: string | null; username: string | null } | null };

export type LinkState =
  | { phase: "idle" }
  | { phase: "waiting"; url: string }
  | { phase: "error"; message: string };

/**
 * «Привязать Telegram»: создаём одноразовый код, открываем бота, ждём подтверждения
 * (опрос раз в 2 с) и сохраняем токен сессии.
 */
export function useTelegramLink() {
  const qc = useQueryClient();
  const [state, setState] = useState<LinkState>({ phase: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const stop = () => clearTimeout(timer.current);
  useEffect(() => stop, []);

  const poll = (link: LinkCode) => {
    timer.current = setTimeout(async () => {
      if (Date.now() > new Date(link.expiresAt).getTime()) {
        setState({ phase: "error", message: "Время вышло — попробуйте ещё раз" });
        return;
      }
      try {
        const res = await api<ClaimResult>(`/api/tg-link/${link.code}/claim`, {}, { method: "POST" });
        if (res.status === "pending") return poll(link);
        tgSession.set({ token: res.token, firstName: res.user?.firstName ?? null, username: res.user?.username ?? null });
        setState({ phase: "idle" });
        qc.invalidateQueries({ queryKey: KEY });
      } catch (error) {
        if (error instanceof ApiError && error.status === 410) {
          setState({ phase: "error", message: error.message });
        } else {
          poll(link); // сеть моргнула — пробуем дальше
        }
      }
    }, 2000);
  };

  const start = async () => {
    stop();
    // окно открываем сразу по клику, иначе браузер заблокирует его как всплывающее
    const tab = window.open("about:blank", "_blank");
    try {
      const link = await api<LinkCode>("/api/tg-link", {}, { method: "POST" });
      if (tab) tab.location.href = link.url;
      setState({ phase: "waiting", url: link.url });
      poll(link);
    } catch (error) {
      tab?.close();
      setState({ phase: "error", message: error instanceof Error ? error.message : "Не удалось начать привязку" });
    }
  };

  const cancel = () => {
    stop();
    setState({ phase: "idle" });
  };

  const unlink = async () => {
    const session = tgSession.get();
    tgSession.clear();
    qc.removeQueries({ queryKey: KEY });
    if (session) {
      await api("/api/tg-link/session", {}, { method: "DELETE", headers: { Authorization: `Bearer ${session.token}` } }).catch(() => {});
    }
  };

  return { state, start, cancel, unlink };
}
