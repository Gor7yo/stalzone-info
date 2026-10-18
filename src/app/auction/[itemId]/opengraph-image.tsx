import { ImageResponse } from "next/og";
import { categoryLabel, iconUrl } from "@/features/catalog";
import { serverBestPrice, serverItem } from "@/lib/items-server";
import { OG_ACC, OG_BG, ogAcc, ogFonts, short } from "@/lib/og";

/**
 * Картинка-превью предмета для ссылок (Telegram, Discord, VK): иконка, название и живая цена.
 * Цена — из снимка БД бэкенда (cached=true, квоту EXBO не тратит), картинка пересобирается раз в 10 минут.
 */
export const alt = "Цена предмета на рынке STALZONE";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 600;

const BG = OG_BG;
const ACC = OG_ACC;
const accA = ogAcc;

export default async function Image({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const item = serverItem(decodeURIComponent(itemId));
  const name = item?.name ?? "STALZONE INFO";
  const category = item ? categoryLabel(item.category) : "Рынок STALZONE";
  const best = item ? await serverBestPrice(item.id) : null;

  const priceLine = best?.price ? `от ${short(best.price)}` : null;
  const lotsLine = best?.price ? `лучшая цена за шт. · лотов: ${best.total} · RU` : "цены, лоты и история продаж";
  const fonts = await ogFonts(["STALZONE INFO", name, category, priceLine ?? "", lotsLine, "stalzone-info.ru"]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        padding: "64px 72px",
        gap: 56,
        background: `radial-gradient(70% 90% at 15% 50%, ${accA(0.18)}, transparent 60%), ${BG}`,
        color: "#f2f4ee",
        fontFamily: "Manrope",
      }}
    >
      {/* иконка предмета в «стеклянной» плашке */}
      <div
        style={{
          width: 330,
          height: 330,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 48,
          background: "rgba(255,255,255,0.05)",
          border: `2px solid ${accA(0.35)}`,
          boxShadow: `0 30px 80px -30px ${accA(0.6)}`,
        }}
      >
        {item ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl(item)} width={260} height={260} alt="" style={{ objectFit: "contain" }} />
        ) : (
          <div style={{ fontSize: 120, fontWeight: 800, color: ACC }}>S</div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 4, color: ACC }}>STALZONE INFO</div>
        <div
          style={{
            marginTop: 18,
            fontSize: name.length > 22 ? 58 : 72,
            fontWeight: 800,
            lineHeight: 1.05,
          }}
        >
          {name}
        </div>
        <div style={{ marginTop: 14, fontSize: 30, fontWeight: 600, color: "rgba(242,244,238,0.6)" }}>{category}</div>

        {priceLine && <div style={{ marginTop: 40, fontSize: 84, fontWeight: 800, color: ACC, lineHeight: 1 }}>{priceLine}</div>}
        <div style={{ marginTop: priceLine ? 14 : 40, fontSize: 28, fontWeight: 600, color: "rgba(242,244,238,0.75)" }}>{lotsLine}</div>

        <div style={{ marginTop: "auto", paddingTop: 30, fontSize: 24, fontWeight: 600, color: "rgba(242,244,238,0.45)" }}>
          stalzone-info.ru
        </div>
      </div>
    </div>,
    { ...size, fonts },
  );
}
