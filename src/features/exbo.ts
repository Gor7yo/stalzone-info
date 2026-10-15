"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Region } from "@/lib/store";
import { useIsTelegram } from "@/lib/telegram";
import { useTgSession } from "@/lib/tgSession";
import { authed } from "./alerts";

/** Персонаж из аккаунта EXBO (все регионы). */
export interface ExboCharacter {
  region: Region;
  name: string;
  id: string | null;
  createdAt: string | null;
  clan: { id: string; name: string; tag: string | null; rank: string | null } | null;
}

export interface ExboAccount {
  login: string;
  characters: ExboCharacter[];
  charactersAt: string | null;
  /** EXBO отозвал доступ - нужен повторный вход */
  revoked: boolean;
}

const KEY = ["exbo"] as const;
/** state входа: сверяем на странице возврата, чтобы чужая ссылка входа не привязала чужой EXBO */
const STATE_KEY = "stalzone:exbo-state";
const STATE_TTL_MS = 10 * 60_000;

/** Аккаунт EXBO, привязанный к Telegram пользователя. Без Telegram - недоступно. */
export function useExbo() {
  const inTelegram = useIsTelegram();
  const session = useTgSession();
  const available = inTelegram || Boolean(session);
  const query = useQuery({
    queryKey: KEY,
    queryFn: () => authed<{ account: ExboAccount | null }>("/api/exbo").then((r) => r.account),
    enabled: available,
    staleTime: 60_000,
  });
  return { ...query, available };
}

/** Уходим на вход EXBO в этой же вкладке (в мини-приложении тоже - Telegram вернёт параметры запуска). */
export function useExboLogin() {
  return useMutation({
    mutationFn: async () => {
      const { url, state } = await authed<{ url: string; state: string }>("/api/exbo/link", "POST");
      try {
        localStorage.setItem(STATE_KEY, JSON.stringify({ state, at: Date.now() }));
      } catch {
        throw new Error("Браузер не даёт сохранить данные входа - выключите приватный режим");
      }
      window.location.assign(url);
      // страница уходит на EXBO - держим кнопку в состоянии «загрузка»
      await new Promise(() => {});
    },
  });
}

export function useExboRefresh() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authed<{ account: ExboAccount | null }>("/api/exbo/refresh", "POST"),
    onSuccess: (r) => qc.setQueryData(KEY, r.account),
  });
}

export function useExboUnlink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authed<void>("/api/exbo", "DELETE"),
    onSuccess: () => qc.setQueryData(KEY, null),
  });
}

/**
 * Страница возврата из EXBO: сверяем state с сохранённым и завершаем привязку.
 * state одноразовый - после попытки стираем его в любом случае.
 */
export async function completeExboLogin(code: string, state: string) {
  let saved: { state?: string; at?: number } | null = null;
  try {
    saved = JSON.parse(localStorage.getItem(STATE_KEY) ?? "null");
    localStorage.removeItem(STATE_KEY);
  } catch {
    /* нет доступа к localStorage - проверка ниже не пройдёт */
  }
  if (!saved?.state || saved.state !== state || Date.now() - (saved.at ?? 0) > STATE_TTL_MS) {
    throw new Error("Эта ссылка входа начата не здесь или устарела. Начните привязку EXBO заново со страницы Pro.");
  }
  return api<{ login: string }>(
    "/api/exbo/complete",
    {},
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, state }) },
  );
}
