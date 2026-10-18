import { ImageResponse } from "next/og";
import { allianceOf } from "@/features/alliances";
import { stripMc } from "@/lib/mcText";
import { OG_ACC, OG_BG, ogFonts, ogText } from "@/lib/og";
import { serverClan } from "@/lib/players-server";

/**
 * Картинка-превью клана для ссылок: тег, название, уровень, бойцы, лидер и группировка.
 * Пересобирается раз в 10 минут.
 */
export const alt = "Клан STALZONE";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 600;

/** Больше бойцов в клане не бывает (ограничение игры). */
const MAX_MEMBERS = 35;

export default async function Image({ params }: { params: Promise<{ region: string; id: string }> }) {
  const { region, id } = await params;
  const clan = await serverClan(region, decodeURIComponent(id));
  const ally = allianceOf(clan?.alliance);
  const tag = clan ? stripMc(clan.tag) : "";
  const name = clan ? stripMc(clan.name) : "Клан";
  const tiles = clan
    ? [
        { label: "Уровень", value: String(clan.level) },
        { label: "Бойцов", value: `${clan.memberCount}/${MAX_MEMBERS}` },
        { label: "Лидер", value: stripMc(clan.leader) },
      ]
    : [];
  const subtitle = [clan?.alliance ? ally.label : null, region.toUpperCase()].filter(Boolean).join(" · ");

  const fonts = await ogFonts(["STALZONE INFO", tag, name, subtitle, ...tiles.flatMap((t) => [t.label, t.value]), "stalzone-info.ru"]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        padding: "60px 72px",
        gap: 56,
        background: `radial-gradient(70% 90% at 12% 45%, ${ally.color}33, transparent 60%), ${OG_BG}`,
        color: "#f2f4ee",
        fontFamily: "Manrope",
      }}
    >
      {/* тег клана в «гербе» цвета группировки */}
      <div
        style={{
          width: 280,
          height: 280,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 64,
          background: "rgba(255,255,255,0.05)",
          border: `3px solid ${ally.color}99`,
          boxShadow: `0 30px 80px -30px ${ally.color}`,
          fontSize: tag.length > 4 ? 64 : 90,
          fontWeight: 800,
          color: ally.color,
        }}
      >
        {tag || "?"}
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 4, color: OG_ACC }}>STALZONE INFO</div>
        <div style={{ marginTop: 14, fontSize: name.length > 18 ? 56 : 72, fontWeight: 800, lineHeight: 1.05 }}>{name}</div>
        {subtitle && <div style={{ marginTop: 10, fontSize: 28, fontWeight: 600, color: ally.color }}>{subtitle}</div>}

        <div style={{ display: "flex", gap: 18, marginTop: 36 }}>
          {tiles.map((t) => (
            <div
              key={t.label}
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "16px 22px",
                borderRadius: 24,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                maxWidth: 360,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 600, color: ogText(0.6) }}>{t.label}</div>
              <div style={{ fontSize: 42, fontWeight: 800, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                {t.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "auto", paddingTop: 24, fontSize: 24, fontWeight: 600, color: ogText(0.45) }}>stalzone-info.ru</div>
      </div>
    </div>,
    { ...size, fonts },
  );
}
