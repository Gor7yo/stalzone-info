"use client";

import { useSyncExternalStore } from "react";

/**
 * Сессия сайта, привязанного к Telegram через бота (для алертов в обычном браузере).
 * Токен живёт только в localStorage этого браузера; в CloudStorage не синхронизируется.
 */
export interface TgSession {
  token: string;
  firstName: string | null;
  username: string | null;
}

const KEY = "stalzone:tg-session";
const listeners = new Set<() => void>();
let cached: TgSession | null | undefined;

function read(): TgSession | null {
  if (cached !== undefined) return cached;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "null") as TgSession | null;
    cached = parsed?.token ? parsed : null;
  } catch {
    cached = null;
  }
  return cached;
}

function write(session: TgSession | null) {
  cached = session;
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  } catch {
    /* приватный режим — сессия живёт до перезагрузки */
  }
  listeners.forEach((l) => l());
}

export const tgSession = {
  get: read,
  set: (session: TgSession) => write(session),
  clear: () => write(null),
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  // привязали/отвязали в другой вкладке
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cached = undefined;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTgSession() {
  return useSyncExternalStore(subscribe, read, () => null);
}
