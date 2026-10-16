/** Язык интерфейса. Общий для сервера и браузера (без "use client"). */

export type Lang = "ru" | "en";

export const LANGS: Lang[] = ["ru", "en"];

export const DEFAULT_LANG: Lang = "ru";

/** cookie, по которой сервер рендерит страницу на нужном языке */
export const LANG_COOKIE = "lang";

export const isLang = (value: unknown): value is Lang => value === "ru" || value === "en";

/** Язык вне React (текст ошибок в коде запросов): берётся из <html lang>, его ставит I18nProvider. */
export const currentLang = (): Lang => (typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "ru");

/** Строка вне React: tr("Не удалось", "Failed"). В компонентах - useT(). */
export const tr = (ru: string, en: string) => (currentLang() === "en" ? en : ru);

/** Выбор между двумя вариантами строки по языку - для данных, где перевод лежит рядом (nameEn, labelEn). */
export const pick = <T>(lang: Lang, ru: T, en: T | null | undefined): T => (lang === "en" && en ? en : ru);
