"use client";

/**
 * Тонкая безопасная обёртка над Telegram Mini Apps SDK.
 *
 * SDK (~20 КБ gzip) подгружается динамически и только внутри Telegram —
 * в обычном браузере это 0 байт. Вне Telegram все функции — no-op,
 * поэтому компоненты могут вызывать их без проверок.
 */

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

const TG_APP_URL = process.env.NEXT_PUBLIC_TG_APP_URL;

const toBase64Url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromBase64Url = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

/** Ссылка, открывающая конкретную страницу приложения прямо в Telegram. */
export function deepLink(path: string) {
  if (!TG_APP_URL) return `${window.location.origin}${path}`;
  // pathname уже percent-encoded, т.е. ASCII — btoa безопасен
  return `${TG_APP_URL}?startapp=${toBase64Url(path)}`;
}

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

/** Делится ссылкой нативно (Telegram → Web Share API → буфер обмена). */
export async function share(url: string, text: string): Promise<"shared" | "copied" | "failed"> {
  if (sdk) {
    const [called] = sdk.shareURL.ifAvailable(url, text);
    if (called) return "shared";
  }

  try {
    if (navigator.share) {
      await navigator.share({ url, text });
      return "shared";
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
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
