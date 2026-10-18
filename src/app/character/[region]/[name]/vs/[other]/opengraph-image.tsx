import { ImageResponse } from "next/og";
import { compareStats, playerStats, score } from "@/features/compare";
import { int, OG_ACC, OG_BG, ogAcc, ogFonts, ogText } from "@/lib/og";
import { serverCharacter } from "@/lib/players-server";

/**
 * Картинка-превью сравнения «A vs B»: ники, K/D, убийства и общий счёт по показателям.
 * Пересобирается раз в 10 минут.
 */
export const alt = "Сравнение игроков STALZONE";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 600;

/** цвета сторон — как на странице сравнения */
const SIDE = { a: "#3ee0d0", b: "#ff7ab6" };

export default async function Image({ params }: { params: Promise<{ region: string; name: string; other: string }> }) {
  const { region, name, other } = await params;
  const [a, b] = await Promise.all([serverCharacter(region, decodeURIComponent(name)), serverCharacter(region, decodeURIComponent(other))]);
  const nickA = a?.username ?? decodeURIComponent(name);
  const nickB = b?.username ?? decodeURIComponent(other);
  const sa = a ? playerStats(a) : null;
  const sb = b ? playerStats(b) : null;
  const total = a && b ? score(compareStats(a, b).filter((r) => r.a || r.b)) : null;
  const verdict = total ? (total.a === total.b ? "Ничья" : `Впереди ${total.a > total.b ? nickA : nickB}`) : "Кто сильнее?";

  const lines = (s: ReturnType<typeof playerStats> | null) =>
    s ? [`K/D ${s.kd.toFixed(2)}`, `${int(s.kills)} убийств`, `${int(s.played)} ч в игре`] : [];

  const fonts = await ogFonts([
    "STALZONE INFO",
    "СРАВНЕНИЕ ИГРОКОВ",
    nickA,
    nickB,
    "VS",
    verdict,
    ...lines(sa),
    ...lines(sb),
    "0123456789:",
    region.toUpperCase(),
    "stalzone-info.ru",
  ]);

  const side = (nick: string, s: ReturnType<typeof playerStats> | null, color: string, align: "flex-start" | "flex-end") => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align, flex: 1, minWidth: 0, gap: 10 }}>
      <div
        style={{
          // ник целиком в половину картинки (~380px): 16 символов — 38px, короткие — до 66px
          fontSize: Math.min(66, Math.floor(380 / (nick.length * 0.62))),
          fontWeight: 800,
          color,
          textShadow: `0 0 40px ${color}88`,
        }}
      >
        {nick}
      </div>
      {lines(s).map((l) => (
        <div key={l} style={{ fontSize: 30, fontWeight: 600, color: ogText(0.8) }}>
          {l}
        </div>
      ))}
    </div>
  );

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "56px 72px",
        background: `radial-gradient(55% 80% at 0% 50%, ${SIDE.a}2e, transparent 60%), radial-gradient(55% 80% at 100% 50%, ${SIDE.b}2e, transparent 60%), ${OG_BG}`,
        color: "#f2f4ee",
        fontFamily: "Manrope",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, fontWeight: 800, letterSpacing: 4 }}>
        <span style={{ color: OG_ACC }}>STALZONE INFO</span>
        <span style={{ color: ogText(0.5) }}>СРАВНЕНИЕ ИГРОКОВ · {region.toUpperCase()}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 70 }}>
        {side(nickA, sa, SIDE.a, "flex-start")}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 96, fontWeight: 800, color: OG_ACC, textShadow: `0 0 50px ${ogAcc(0.6)}` }}>VS</div>
          {total && (
            <div style={{ display: "flex", fontSize: 44, fontWeight: 800 }}>
              <span style={{ color: SIDE.a }}>{total.a}</span>
              <span style={{ color: ogText(0.4), margin: "0 8px" }}>:</span>
              <span style={{ color: SIDE.b }}>{total.b}</span>
            </div>
          )}
        </div>
        {side(nickB, sb, SIDE.b, "flex-end")}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto" }}>
        <span style={{ fontSize: 34, fontWeight: 800 }}>{verdict}</span>
        <span style={{ fontSize: 24, fontWeight: 600, color: ogText(0.45) }}>stalzone-info.ru</span>
      </div>
    </div>,
    { ...size, fonts },
  );
}
