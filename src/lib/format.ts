const nf = new Intl.NumberFormat("ru-RU");
const compactNf = new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 });

export const formatNumber = (value: number | null | undefined) =>
  value == null || Number.isNaN(value) ? "—" : nf.format(Math.round(value));

export const formatPrice = (value: number | null | undefined) =>
  value == null || value <= 0 ? "—" : `${nf.format(Math.round(value))} ₽`;

export const formatCompact = (value: number | null | undefined) =>
  value == null || value <= 0 ? "—" : compactNf.format(value);

/** Игровой формат цен: 14 800 → «14,8к», 3 500 000 → «3,5кк». */
export function formatShort(value: number | null | undefined) {
  if (value == null || value <= 0) return "—";
  const fmt = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: n < 100 ? 1 : 0 });
  if (value >= 1_000_000) return `${fmt(value / 1_000_000)}кк`;
  if (value >= 1_000) return `${fmt(value / 1_000)}к`;
  return String(Math.round(value));
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 3725000 → «1ч 02м» / «02:05» для коротких интервалов */
export function formatDuration(ms: number, withSeconds = false) {
  if (ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (d > 0) return `${d}д ${h}ч`;
  if (h > 0) return withSeconds ? `${h}:${pad(m)}:${pad(s)}` : `${h}ч ${pad(m)}м`;
  return withSeconds ? `${pad(m)}:${pad(s)}` : `${m}м`;
}

const rtf = new Intl.RelativeTimeFormat("ru-RU", { numeric: "auto" });

export function formatRelative(date: string | number | Date, now = Date.now()) {
  const diff = new Date(date).getTime() - now;
  const abs = Math.abs(diff);
  if (abs < 60_000) return "только что";
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), "hour");
  if (abs < 2_592_000_000) return rtf.format(Math.round(diff / 86_400_000), "day");
  if (abs < 31_536_000_000) return rtf.format(Math.round(diff / 2_592_000_000), "month");
  return rtf.format(Math.round(diff / 31_536_000_000), "year");
}

export const formatDate = (date: string | number | Date) =>
  new Date(date).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });

export const formatShortDate = (date: string | number | Date) =>
  new Date(date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

export const formatTime = (date: string | number | Date) =>
  new Date(date).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

export const formatDateTime = (date: string | number | Date) =>
  new Date(date).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export const plural = (n: number, forms: [string, string, string]) => {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
  return forms[2];
};

export const cx = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ");

/** Ввод цены в игровом формате: «4,5кк», «300к», «1 200 000», «2kk» → число (или null). */
export function parseGamePrice(input: string): number | null {
  const m = input
    .toLowerCase()
    .replace(/[\s ₽]/g, "")
    .replace(",", ".")
    .match(/^(\d+(?:\.\d+)?)(кк|kk|к|k|м|m)?$/);
  if (!m) return null;
  const mult = m[2] === "к" || m[2] === "k" ? 1_000 : m[2] ? 1_000_000 : 1;
  const value = Math.round(Number(m[1]) * mult);
  return value > 0 && value <= 2_000_000_000 ? value : null;
}

/** Изменение со знаком: «+3», «−2», «0». */
export const formatSigned = (n: number) => (n > 0 ? `+${formatNumber(n)}` : n < 0 ? `−${formatNumber(-n)}` : "0");
