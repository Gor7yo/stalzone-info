"use client";

import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useMemo, useState } from "react";
import { makeFormat } from "@/lib/format";
import { actions, getApp, useApp } from "@/lib/store";
import { initTelegram, telegramLanguage } from "@/lib/telegram";
import { DEFAULT_LANG, dicts, LANG_COOKIE, type Lang } from "./index";

/**
 * Язык интерфейса: сервер берёт его из cookie (рендер сразу на нужном языке),
 * браузер держит в контексте и дублирует в сторе - так выбор уезжает в Telegram CloudStorage.
 */

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nValue>({ lang: DEFAULT_LANG, setLang: () => {} });

function writeCookie(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = lang;
}

const readCookie = () => document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=(\\w+)`))?.[1];

/** saved - язык из cookie (null, если пользователь ещё не выбирал). */
export function I18nProvider({ saved, children }: { saved: Lang | null; children: React.ReactNode }) {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>(saved ?? DEFAULT_LANG);
  const stored = useApp((s) => s.lang);

  // выбор из стора (localStorage / облако Telegram) главнее: cookie могла потеряться
  const [seen, setSeen] = useState(stored);
  if (stored !== seen) {
    setSeen(stored);
    if (stored && stored !== lang) setLangState(stored);
  }

  useEffect(() => {
    if (!stored || readCookie() === stored) return;
    writeCookie(stored);
    // язык пришёл не из переключателя (облако, Telegram) - догоняем серверные компоненты
    router.refresh();
  }, [stored, router]);

  // первый запуск в Telegram: берём язык аккаунта, если он английский
  useEffect(() => {
    if (saved) return;
    let alive = true;
    initTelegram().then(() => {
      if (!alive || getApp().lang) return;
      if (telegramLanguage()?.startsWith("en")) actions.setLang("en");
    });
    return () => {
      alive = false;
    };
  }, [saved]);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang: (next) => {
        if (next === lang) return;
        setLangState(next);
        writeCookie(next);
        actions.setLang(next);
        // серверные компоненты (категории, 404) перерисуются с новой cookie, клиентское состояние сохранится
        router.refresh();
      },
    }),
    [lang, router],
  );

  return <I18nContext value={value}>{children}</I18nContext>;
}

export const useLang = () => use(I18nContext).lang;

export const useSetLang = () => use(I18nContext).setLang;

/** Словарь текущего языка: `const t = useT(); t.common.back` */
export const useT = () => dicts[useLang()];

const formats = { ru: makeFormat("ru"), en: makeFormat("en") };

/** Функции форматирования для текущего языка: `const { formatShort } = useFormat()` */
export const useFormat = () => formats[useLang()];
