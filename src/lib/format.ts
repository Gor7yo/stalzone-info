import type { Lang } from "@/i18n/lang";

/**
 * Форматирование чисел, цен и дат. Всё, что зависит от языка, собрано в makeFormat(lang);
 * в компонентах берите функции из useFormat() (src/i18n/client.tsx), чтобы они переключались вместе с языком.
 * Экспорты верхнего уровня - русские, для сервера и мест вне React.
 */

const pad = (n: number) => String(n).padStart(2, "0");

const UNITS = {
  ru: { k: "к", kk: "кк", d: "д", h: "ч", m: "м", now: "только что" },
  en: { k: "k", kk: "kk", d: "d", h: "h", m: "m", now: "just now" },
};

export function makeFormat(lang: Lang) {
  const locale = lang === "en" ? "en-US" : "ru-RU";
  const u = UNITS[lang];
  const nf = new Intl.NumberFormat(locale);
  const compactNf = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const formatNumber = (value: number | null | undefined) => (value == null || Number.isNaN(value) ? "—" : nf.format(Math.round(value)));

  return {
    lang,
    locale,
    formatNumber,

    formatPrice: (value: number | null | undefined) => (value == null || value <= 0 ? "—" : `${nf.format(Math.round(value))} ₽`),

    formatCompact: (value: number | null | undefined) => (value == null || value <= 0 ? "—" : compactNf.format(value)),

    /** Игровой формат цен: 14 800 → «14,8к», 3 500 000 → «3,5кк» (en: «14.8k», «3.5kk»). */
    formatShort(value: number | null | undefined) {
      if (value == null || value <= 0) return "—";
      const fmt = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: n < 100 ? 1 : 0 });
      if (value >= 1_000_000) return `${fmt(value / 1_000_000)}${u.kk}`;
      if (value >= 1_000) return `${fmt(value / 1_000)}${u.k}`;
      return String(Math.round(value));
    },

    /** 3725000 → «1ч 02м» / «02:05» для коротких интервалов */
    formatDuration(ms: number, withSeconds = false) {
      if (ms < 0) ms = 0;
      const total = Math.floor(ms / 1000);
      const d = Math.floor(total / 86400);
      const h = Math.floor((total % 86400) / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;

      if (d > 0) return `${d}${u.d} ${h}${u.h}`;
      if (h > 0) return withSeconds ? `${h}:${pad(m)}:${pad(s)}` : `${h}${u.h} ${pad(m)}${u.m}`;
      return withSeconds ? `${pad(m)}:${pad(s)}` : `${m}${u.m}`;
    },

    formatRelative(date: string | number | Date, now = Date.now()) {
      const diff = new Date(date).getTime() - now;
      const abs = Math.abs(diff);
      if (abs < 60_000) return u.now;
      if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
      if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), "hour");
      if (abs < 2_592_000_000) return rtf.format(Math.round(diff / 86_400_000), "day");
      if (abs < 31_536_000_000) return rtf.format(Math.round(diff / 2_592_000_000), "month");
      return rtf.format(Math.round(diff / 31_536_000_000), "year");
    },

    formatDate: (date: string | number | Date) =>
      new Date(date).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }),

    formatShortDate: (date: string | number | Date) =>
      new Date(date).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" }),

    formatTime: (date: string | number | Date) => new Date(date).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),

    formatDateTime: (date: string | number | Date) =>
      new Date(date).toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),

    /** Изменение со знаком: «+3», «−2», «0». */
    formatSigned: (n: number) => (n > 0 ? `+${formatNumber(n)}` : n < 0 ? `−${formatNumber(-n)}` : "0"),
  };
}

export type Format = ReturnType<typeof makeFormat>;

const ru = makeFormat("ru");

export const {
  formatNumber,
  formatPrice,
  formatCompact,
  formatShort,
  formatDuration,
  formatRelative,
  formatDate,
  formatShortDate,
  formatTime,
  formatDateTime,
  formatSigned,
} = ru;

/** Русские формы: 1 предмет, 2 предмета, 5 предметов. */
export const plural = (n: number, forms: [string, string, string]) => {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
  return forms[2];
};

/** Английские формы: 1 item, 2 items. */
export const pluralEn = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

/** Ввод цены в игровом формате: «4,5кк», «300к», «1 200 000», «2kk», «1,200,000» → число (или null). */
export function parseGamePrice(input: string): number | null {
  let s = input.toLowerCase().replace(/[\s ₽]/g, "");
  // запятые как разделитель тысяч без суффикса (1,200,000) - убираем, иначе запятая - десятичная
  s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  const m = s.match(/^(\d+(?:\.\d+)?)(кк|kk|к|k|м|m)?$/);
  if (!m) return null;
  const mult = m[2] === "к" || m[2] === "k" ? 1_000 : m[2] ? 1_000_000 : 1;
  const value = Math.round(Number(m[1]) * mult);
  return value > 0 && value <= 2_000_000_000 ? value : null;
}
