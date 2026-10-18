"use client";

/**
 * Тонкая безопасная обёртка над Telegram Mini Apps SDK.
 *
 * SDK (~20 КБ gzip) подгружается динамически и только внутри Telegram —
 * в обычном браузере это 0 байт. Вне Telegram все функции — no-op,
 * поэтому компоненты могут вызывать их без проверок.
 */

import { useEffect, useState } from "react";

type Sdk = typeof import("@telegram-apps/sdk-react");

let sdk: Sdk | null = null;
let starting: Promise<void> | null = null;

const TMA_FLAG = "stalzone:tma";

/** Дешёвая проверка без SDK: Telegram передаёт launch-параметры в hash первой загрузки. */
function maybeTelegram() {
  try {
    if (/tgWebApp/.test(window.location.hash + window.location.search)) {
      sessionStorage.setItem(TMA_FLAG, "1");
      return true;
    }
    return sessionStorage.getItem(TMA_FLAG) === "1" || "TelegramWebviewProxy" in window;
  } catch {
    return false;
  }
}

export function initTelegram(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  starting ??= (async () => {
    if (!maybeTelegram()) return;
    try {
      const mod = await import("@telegram-apps/sdk-react");
      if (!mod.isTMA()) return;
      mod.init();
      sdk = mod;

      mod.backButton.mount.ifAvailable();
      mod.swipeBehavior.mount.ifAvailable();
      mod.swipeBehavior.disableVertical.ifAvailable();

      mod.miniApp.mount.ifAvailable();
      mod.miniApp.setHeaderColor.ifAvailable("#07080a");
      mod.miniApp.setBackgroundColor.ifAvailable("#07080a");
      mod.miniApp.setBottomBarColor.ifAvailable("#07080a");

      const [mounted, mounting] = mod.viewport.mount.ifAvailable();
      if (mounted) {
        Promise.resolve(mounting)
          .then(() => mod.viewport.expand.ifAvailable())
          .catch(() => {});
      }

      mod.miniApp.ready.ifAvailable();
    } catch (error) {
      sdk = null;
      console.warn("[telegram] init skipped:", error);
    }
  })();
  return starting;
}

export const isTelegram = () => sdk !== null;

/** true, когда приложение открыто в Telegram и SDK готов (в браузере — всегда false). */
export function useIsTelegram() {
  const [ready, setReady] = useState(isTelegram);
  useEffect(() => {
    let alive = true;
    initTelegram().then(() => alive && setReady(isTelegram()));
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

type Impact = "light" | "medium" | "heavy" | "rigid" | "soft";

export const haptic = {
  tap(style: Impact = "light") {
    sdk?.hapticFeedback.impactOccurred.ifAvailable(style);
  },
  select() {
    sdk?.hapticFeedback.selectionChanged.ifAvailable();
  },
  notify(type: "success" | "warning" | "error") {
    sdk?.hapticFeedback.notificationOccurred.ifAvailable(type);
  },
};

/** Показывает нативную кнопку «Назад» Telegram. Возвращает функцию очистки. */
export function bindBackButton(onBack: () => void) {
  let off: (() => void) | undefined;
  let cancelled = false;

  initTelegram().then(() => {
    if (cancelled || !sdk) return;
    sdk.backButton.show.ifAvailable();
    [, off] = sdk.backButton.onClick.ifAvailable(onBack);
  });

  return () => {
    cancelled = true;
    off?.();
    sdk?.backButton.hide.ifAvailable();
  };
}

// ---------- диплинки: t.me/<bot>/<app>?startapp=<путь в base64url> ----------
// Сами больше не раздаём («Поделиться» даёт ссылку на сайт), но старые ссылки ещё открываются.

const fromBase64Url = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

/** Путь из startapp-параметра, с которым открыли мини-приложение (один раз за сессию). */
let startConsumed = false;
export function consumeStartPath(): string | null {
  if (!sdk || startConsumed) return null;
  startConsumed = true;
  try {
    const param = sdk.retrieveLaunchParams().tgWebAppStartParam;
    if (!param) return null;
    const path = fromBase64Url(param);
    return /^\/[\w\-/%.]*$/.test(path) ? path : null;
  } catch {
    return null;
  }
}

/**
 * Делится ссылкой: в мини-приложении — окно «переслать» Telegram, на телефоне — системное меню,
 * на компьютере — просто копирует ссылку (системное окно Windows там только мешает).
 */
export async function share(url: string, text: string): Promise<"shared" | "copied" | "failed"> {
  if (sdk) {
    const [called] = sdk.shareURL.ifAvailable(url, text);
    if (called) return "shared";
  }

  try {
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      await navigator.share({ url, text });
      return "shared";
    }
    // только ссылка: мессенджер сам подтянет заголовок и картинку-превью
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}

export const cloud = {
  async get(key: string): Promise<string | null> {
    if (!sdk) return null;
    try {
      const [called, value] = sdk.cloudStorage.getItem.ifAvailable(key);
      return called ? ((await value) as string) || null : null;
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    if (!sdk || value.length > 4096) return;
    try {
      const [called, result] = sdk.cloudStorage.setItem.ifAvailable(key, value);
      if (called) Promise.resolve(result).catch(() => {});
    } catch {
      /* CloudStorage недоступен — данные остаются в localStorage */
    }
  },
};

/** Язык аккаунта Telegram («en», «ru», …). Вне Telegram - null. */
export function telegramLanguage(): string | null {
  if (!sdk) return null;
  try {
    return sdk.retrieveLaunchParams().tgWebAppData?.user?.language_code ?? null;
  } catch {
    return null;
  }
}

// ---------- алерты в боте ----------

/** Подписанная Telegram строка initData — по ней бэкенд узнаёт пользователя. Вне Telegram — null. */
export function initDataRaw(): string | null {
  if (!sdk) return null;
  try {
    return sdk.retrieveRawInitData() || null;
  } catch {
    return null;
  }
}

/**
 * Бот может писать пользователю, только если тот разрешил.
 * Уже разрешено (или нажимал /start) — true; иначе показываем системный запрос Telegram.
 */
export async function ensureWriteAccess(): Promise<boolean> {
  if (!sdk) return false;
  try {
    if (sdk.retrieveLaunchParams().tgWebAppData?.user?.allows_write_to_pm) return true;
    if (!sdk.requestWriteAccess.isAvailable()) return true;
    return (await sdk.requestWriteAccess()) === "allowed";
  } catch {
    return false;
  }
}
