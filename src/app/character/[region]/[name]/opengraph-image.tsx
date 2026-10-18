import { ImageResponse } from "next/og";
import { allianceOf } from "@/features/alliances";
import { playerStats } from "@/features/compare";
import { stripMc } from "@/lib/mcText";
import { int, OG_ACC, OG_BG, ogFonts, ogText } from "@/lib/og";
import { OgFifaCard, ogCardTexts } from "@/lib/og-card";
import { serverCharacter, serverProgress, serverRating } from "@/lib/players-server";
import { ARCHETYPES } from "@/features/archetypes";

/**
 * Картинка-превью профиля для ссылок (Telegram, Discord, VK): ник, группировка, клан,
 * K/D, убийства, часы в игре и прирост за неделю. Пересобирается раз в 10 минут.
 */
export const alt = "Профиль игрока STALZONE";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 600;

const HOUR = 3_600_000;

export default async function Image({ params }: { params: Promise<{ region: string; name: string }> }) {
  const { region, name: raw } = await params;
  const name = decodeURIComponent(raw);
  const [c, p, r] = await Promise.all([serverCharacter(region, name), serverProgress(region, name), serverRating(region, name)]);
  const rating = r?.status === "ready" ? r : null;
  const arch = rating ? ARCHETYPES[rating.archetype] : null;
  const archLine = rating && arch ? `${arch.emoji} ${arch.ru} · рейтинг ${rating.overall}` : null;

  const nick = c?.username ?? name;
  const ally = allianceOf(c?.alliance);
  const clan = c?.clan?.info ? `[${stripMc(c.clan.info.tag)}] ${stripMc(c.clan.info.name)}` : null;
  const s = c ? playerStats(c) : null;
  const tiles = s
    ? [
        { label: "K/D", value: s.kd.toFixed(2) },
        { label: "Убийств", value: int(s.kills) },
        { label: "В игре", value: `${int(s.played)} ч` },
      ]
    : [];
  const weekKills = p?.from ? (p.deltas.kil ?? 0) : 0;
  const weekHours = p?.from ? (p.deltas["pla-tim"] ?? 0) / HOUR : 0;
  const week = weekKills || weekHours >= 1 ? `За неделю: +${int(weekKills)} убийств · +${int(weekHours)} ч в игре` : null;
  const subtitle = [ally.label, clan, region.toUpperCase()].filter(Boolean).join(" · ");

  const fonts = await ogFonts([
    "STALZONE INFO",
    nick,
    subtitle,
    ...tiles.flatMap((t) => [t.label, t.value]),
    week ?? "",
    archLine ?? "",
    ...ogCardTexts(nick, region),
    "профиль, статистика и прогресс",
    "stalzone-info.ru",
  ]);

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
      {/* карточка FIFA, если рейтинг посчитан; иначе — буква ника в цвете группировки */}
      {rating ? (
        <div style={{ display: "flex", flexShrink: 0 }}>
          <OgFifaCard
            w={330}
            name={nick}
            region={region}
            overall={rating.overall}
            tier={rating.tier}
            archetype={rating.archetype}
            attributes={rating.attributes}
          />
        </div>
      ) : (
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
            fontSize: 150,
            fontWeight: 800,
            color: ally.color,
          }}
        >
          {nick.slice(0, 1).toUpperCase()}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 4, color: OG_ACC }}>STALZONE INFO</div>
        <div style={{ marginTop: 14, fontSize: nick.length > 16 ? 60 : 76, fontWeight: 800, lineHeight: 1.05 }}>{nick}</div>
        <div style={{ marginTop: 10, fontSize: 28, fontWeight: 600, color: ally.color }}>{subtitle}</div>
        {archLine && arch && (
          <div style={{ display: "flex", marginTop: 12, fontSize: 32, fontWeight: 800, color: arch.color }}>{archLine}</div>
        )}

        {tiles.length > 0 ? (
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
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 600, color: ogText(0.6) }}>{t.label}</div>
                <div style={{ fontSize: 46, fontWeight: 800 }}>{t.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 36, fontSize: 30, fontWeight: 600, color: ogText(0.7) }}>профиль, статистика и прогресс</div>
        )}

        {week && <div style={{ marginTop: 22, fontSize: 28, fontWeight: 800, color: OG_ACC }}>{week}</div>}

        <div style={{ marginTop: "auto", paddingTop: 24, fontSize: 24, fontWeight: 600, color: ogText(0.45) }}>stalzone-info.ru</div>
      </div>
    </div>,
    { ...size, fonts },
  );
}
