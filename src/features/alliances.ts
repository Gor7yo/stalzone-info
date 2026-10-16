export interface AllianceMeta {
  label: string;
  labelEn: string;
  color: string;
  image?: string;
}

const ALLIANCES: Record<string, AllianceMeta> = {
  // EXBO переименовали группировки: Долг → Рубеж, Свобода → Заря (ключи в API прежние)
  duty: { label: "Рубеж", labelEn: "Frontier", color: "#ff5a52", image: "/duty.webp" },
  freedom: { label: "Заря", labelEn: "Dawn", color: "#5fd36f", image: "/freedom.webp" },
  covenant: { label: "Завет", labelEn: "Covenant", color: "#c08bff", image: "/covenant.webp" },
  merc: { label: "Наёмники", labelEn: "Mercenaries", color: "#53a7ff", image: "/merc.webp" },
  mercs: { label: "Наёмники", labelEn: "Mercenaries", color: "#53a7ff", image: "/merc.webp" },
  bandit: { label: "Бандиты", labelEn: "Bandits", color: "#ff9a3c" },
  bandits: { label: "Бандиты", labelEn: "Bandits", color: "#ff9a3c" },
  stalker: { label: "Сталкеры", labelEn: "Stalkers", color: "#e8d36a" },
  stalkers: { label: "Сталкеры", labelEn: "Stalkers", color: "#e8d36a" },
};

export const allianceOf = (alliance?: string | null): AllianceMeta =>
  (alliance && ALLIANCES[alliance.toLowerCase()]) || {
    label: alliance || "Без группировки",
    labelEn: alliance || "No faction",
    color: "#9aa096",
  };

/** Название группировки на языке интерфейса. */
export const allianceName = (a: { label: string; labelEn?: string }, lang: "ru" | "en") =>
  lang === "en" && a.labelEn ? a.labelEn : a.label;

/**
 * Цвета группировок на графиках — в этом порядке. Отличаются от цветов гербов: подобраны
 * так, чтобы линии различались и при дальтонизме (проверено валидатором палитр, тёмный фон).
 * Порядок важен: соседние пары проверены именно так.
 */
export const CHART_ALLIANCES: { key: string; label: string; labelEn: string; color: string }[] = [
  { key: "duty", label: "Рубеж", labelEn: "Frontier", color: "#e04b43" },
  { key: "merc", label: "Наёмники", labelEn: "Mercenaries", color: "#2f7fe0" },
  { key: "freedom", label: "Заря", labelEn: "Dawn", color: "#3aa653" },
  { key: "covenant", label: "Завет", labelEn: "Covenant", color: "#a866e0" },
];

/** «mercs» в старых ответах EXBO — те же «merc» */
export const chartAlliance = (key: string) => CHART_ALLIANCES.find((a) => a.key === key.toLowerCase().replace(/s$/, ""));
