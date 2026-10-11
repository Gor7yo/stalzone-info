export interface AllianceMeta {
  label: string;
  color: string;
  image?: string;
}

const ALLIANCES: Record<string, AllianceMeta> = {
  duty: { label: "Долг", color: "#ff5a52", image: "/duty.webp" },
  freedom: { label: "Свобода", color: "#5fd36f", image: "/freedom.webp" },
  covenant: { label: "Завет", color: "#c08bff", image: "/covenant.webp" },
  merc: { label: "Наёмники", color: "#53a7ff", image: "/merc.webp" },
  mercs: { label: "Наёмники", color: "#53a7ff", image: "/merc.webp" },
  bandit: { label: "Бандиты", color: "#ff9a3c" },
  bandits: { label: "Бандиты", color: "#ff9a3c" },
  stalker: { label: "Сталкеры", color: "#e8d36a" },
  stalkers: { label: "Сталкеры", color: "#e8d36a" },
};

export const allianceOf = (alliance?: string | null): AllianceMeta =>
  (alliance && ALLIANCES[alliance.toLowerCase()]) || {
    label: alliance || "Без группировки",
    color: "#9aa096",
  };
