"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { session, useSession } from "@/lib/session";
import type { Region } from "@/lib/store";
import { initDataRaw, useIsTelegram } from "@/lib/telegram";

/** Персонаж из аккаунта EXBO (все регионы). */
export interface ExboCharacter {
  region: Region;
  name: string;
  id: string | null;
  createdAt: string | null;
  clan: { id: string; name: string; tag: string | null; rank: string | null } | null;
}

/** Текущий аккаунт (EXBO): Pro, персонажи, привязанный Telegram. */
export interface Me {
  login: string;
  pro: boolean;
  /** до какого момента действует Pro (ISO); null — не оформлен */
  proUntil: string | null;
  limits: { priceAlerts: number };
  /** можно взять пробный период */
  trialAvailable: boolean;
  characters: ExboCharacter[];
  charactersAt: string | null;
  /** EXBO отозвал доступ - персонажи не обновятся до повторного входа */
  revoked: boolean;
  /** Telegram для алертов; null - не привязан */
  telegram: { firstName: string | null; username: string | null; blocked: boolean } | null;
  /** администратор (видит /admin) */
  admin?: boolean;
}

export const ME_KEY = ["me"] as const;
/** state входа: сверяем на странице возврата, чтобы чужая ссылка входа не залогинила в чужой аккаунт */
const STATE_KEY = "stalzone:exbo-state";
const STATE_TTL_MS = 10 * 60_000;

/** Сервер: нужен вход через EXBO. */
export const isLoginRequired = (error: unknown) => error instanceof ApiError && error.code === "login_required";
/** Сервер: для уведомлений нужен привязанный Telegram. */
export const isTelegramRequired = (error: unknown) => error instanceof ApiError && error.code === "telegram_required";

/**
 * Запрос от имени аккаунта: на сайте — токен сессии после входа через EXBO,
 * в мини-приложении без сессии — подписанный initData (аккаунт привязанного Telegram).
 */
export async function authed<T>(path: string, method = "GET", body?: unknown) {
  const current = session.get();
  const initData = current ? null : initDataRaw();
  if (!current && !initData) throw new ApiError(401, "Войдите через EXBO", "login_required");
  try {
    return await api<T>(
      path,
      {},
      {
        method,
        headers: {
          Authorization: current ? `Bearer ${current.token}` : `tma ${initData}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      },
    );
  } catch (error) {
    // сессию отозвали (вышли в другом браузере / истекла) — забываем её
    if (current && error instanceof ApiError && error.status === 401) session.clear();
    throw error;
  }
}

/**
 * Текущий аккаунт. null - не вошли (в мини-приложении: Telegram не привязан к аккаунту).
 * pending - статус ещё неизвестен: не показываем ни аккаунт, ни «Войти».
 */
export function useMe() {
  const inTelegram = useIsTelegram();
  const current = useSession();
  const possible = inTelegram || Boolean(current);
  const query = useQuery({
    queryKey: [...ME_KEY, current?.token ?? "tma"],
    queryFn: () => authed<Me>("/api/me").catch((error) => (isLoginRequired(error) ? null : Promise.reject(error))),
    enabled: possible,
    staleTime: 60_000,
  });
  const me = possible ? (query.data ?? null) : null;
  return { ...query, me, loggedIn: Boolean(me), pending: possible && query.isLoading };
}

// ---------- вход и выход ----------

/** Вход через EXBO в этой же вкладке. В мини-приложении Telegram привяжется к аккаунту сам. */
export function useLogin() {
  return useMutation({
    mutationFn: async (returnTo?: string) => {
      const initData = initDataRaw();
      const { url, state } = await api<{ url: string; state: string }>(
        "/api/auth/exbo/start",
        {},
        { method: "POST", headers: initData ? { Authorization: `tma ${initData}` } : {} },
      );
      try {
        const back = returnTo ?? window.location.pathname + window.location.search;
        localStorage.setItem(STATE_KEY, JSON.stringify({ state, at: Date.now(), returnTo: back }));
      } catch {
        throw new Error("Браузер не даёт сохранить данные входа - выключите приватный режим");
      }
      window.location.assign(url);
      // страница уходит на EXBO - держим кнопку в состоянии «загрузка»
      await new Promise(() => {});
    },
  });
}

/**
 * Страница возврата из EXBO: сверяем state с сохранённым, получаем сессию.
 * state одноразовый - после попытки стираем его в любом случае. Возвращает, куда вернуться.
 */
export async function completeLogin(code: string, state: string) {
  let saved: { state?: string; at?: number; returnTo?: string } | null = null;
  try {
    saved = JSON.parse(localStorage.getItem(STATE_KEY) ?? "null");
    localStorage.removeItem(STATE_KEY);
  } catch {
    /* нет доступа к localStorage - проверка ниже не пройдёт */
  }
  if (!saved?.state || saved.state !== state || Date.now() - (saved.at ?? 0) > STATE_TTL_MS) {
    throw new Error("Эта ссылка входа начата не здесь или устарела. Нажмите «Войти через EXBO» ещё раз.");
  }
  const { token, login } = await api<{ token: string; login: string }>(
    "/api/auth/exbo/complete",
    {},
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, state }) },
  );
  session.set({ token, login });
  // только свой путь - не уводим на чужой сайт
  const back = saved.returnTo && /^\/(?!\/)/.test(saved.returnTo) ? saved.returnTo : "/account";
  return { login, returnTo: back };
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const current = session.get();
      session.clear();
      if (current) {
        await api("/api/auth/logout", {}, { method: "POST", headers: { Authorization: `Bearer ${current.token}` } }).catch(() => {});
      }
    },
    onSettled: () => qc.removeQueries(),
  });
}

// ---------- персонажи ----------

export function useRefreshCharacters() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authed<Pick<Me, "characters" | "charactersAt" | "revoked">>("/api/me/characters/refresh", "POST"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ME_KEY }),
  });
}

// ---------- Telegram для алертов ----------

export type LinkState = { phase: "idle" } | { phase: "waiting"; url: string } | { phase: "error"; message: string };

/**
 * «Привязать Telegram» на сайте: открываем бота со ссылкой-кодом, пользователь жмёт «Привязать»,
 * а мы раз в 2 с перечитываем аккаунт, пока Telegram не появится.
 */
export function useTelegramLink() {
  const qc = useQueryClient();
  const [state, setState] = useState<LinkState>({ phase: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const stop = () => clearTimeout(timer.current);
  useEffect(() => stop, []);

  const poll = (until: number) => {
    timer.current = setTimeout(async () => {
      if (Date.now() > until) {
        setState({ phase: "error", message: "Время вышло — попробуйте ещё раз" });
        return;
      }
      const me = await authed<Me>("/api/me").catch(() => null);
      if (!me?.telegram) return poll(until);
      setState({ phase: "idle" });
      qc.invalidateQueries({ queryKey: ME_KEY });
      qc.invalidateQueries({ queryKey: ["alerts"] });
    }, 2000);
  };

  const start = async () => {
    stop();
    // окно открываем сразу по клику, иначе браузер заблокирует его как всплывающее
    const tab = window.open("about:blank", "_blank");
    try {
      const link = await authed<{ url: string; expiresAt: string }>("/api/me/telegram", "POST");
      if (tab) tab.location.href = link.url;
      setState({ phase: "waiting", url: link.url });
      poll(new Date(link.expiresAt).getTime());
    } catch (error) {
      tab?.close();
      setState({ phase: "error", message: error instanceof Error ? error.message : "Не удалось начать привязку" });
    }
  };

  const cancel = () => {
    stop();
    setState({ phase: "idle" });
  };

  return { state, start, cancel };
}

export function useUnlinkTelegram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authed<void>("/api/me/telegram", "DELETE"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ME_KEY });
      qc.removeQueries({ queryKey: ["alerts"] });
    },
  });
}
