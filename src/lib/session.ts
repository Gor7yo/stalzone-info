"use client";

import { useSyncExternalStore } from "react";

/**
 * Сессия сайта после входа через EXBO. Токен живёт только в localStorage этого браузера.
 * В мини-приложении она тоже сохраняется, но там аккаунт узнаётся и по привязанному Telegram.
 */
export interface Session {
  token: string;
  login: string;
}

const KEY = "stalzone:session";
/** До 10.2026 сайт входил через привязку Telegram - та сессия больше не работает */
const LEGACY_KEY = "stalzone:tg-session";
const listeners = new Set<() => void>();
let cached: Session | null | undefined;

function read(): Session | null {
  if (cached !== undefined) return cached;
  try {
    localStorage.removeItem(LEGACY_KEY);
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "null") as Session | null;
    cached = parsed?.token ? parsed : null;
  } catch {
    cached = null;
  }
  return cached;
}

function write(value: Session | null) {
  cached = value;
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value));
    else localStorage.removeItem(KEY);
  } catch {
    /* приватный режим — сессия живёт до перезагрузки */
  }
  listeners.forEach((l) => l());
}

export const session = {
  get: read,
  set: (value: Session) => write(value),
  clear: () => write(null),
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  // вошли/вышли в другой вкладке
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

export function useSession() {
  return useSyncExternalStore(subscribe, read, () => null);
}
