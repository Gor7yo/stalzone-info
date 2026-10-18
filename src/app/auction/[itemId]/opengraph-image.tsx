import { ImageResponse } from "next/og";
import { categoryLabel, iconUrl } from "@/features/catalog";
import { serverBestPrice, serverItem } from "@/lib/items-server";

/**
 * Картинка-превью предмета для ссылок (Telegram, Discord, VK): иконка, название и живая цена.
 * Цена — из снимка БД бэкенда (cached=true, квоту EXBO не тратит), картинка пересобирается раз в 10 минут.
 */
export const alt = "Цена предмета на рынке STALZONE";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 600;

const BG = "#07080a";
/** акцент сайта (--acc в globals.css) */
const ACC = "#d4ff3a";
const accA = (a: number) => `rgba(212,255,58,${a})`;

/** «14,8к», «3,5кк» — как на сайте. */
function short(value: number) {
  const fmt = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: n < 100 ? 1 : 0 });
  if (value >= 1_000_000) return `${fmt(value / 1_000_000)}кк`;
  if (value >= 1_000) return `${fmt(value / 1_000)}к`;
  return fmt(value);
}

/**
 * Шрифт сайта (Manrope) с кириллицей — только нужные буквы, через Google Fonts:
 * встроенный шрифт генератора кириллицу не рисует.
 */
async function font(text: string, weight: 600 | 800) {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=Manrope:wght@${weight}&text=${encodeURIComponent(text)}`, {
    next: { revalidate: 86_400 },
  }).then((r) => r.text());
  const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
  if (!url) throw new Error("шрифт не найден");
  return fetch(url).then((r) => r.arrayBuffer());
}

export default async function Image({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const item = serverItem(decodeURIComponent(itemId));
  const name = item?.name ?? "STALZONE INFO";
  const category = item ? categoryLabel(item.category) : "Рынок STALZONE";
  const best = item ? await serverBestPrice(item.id) : null;

  const priceLine = best?.price ? `от ${short(best.price)}` : null;
  const lotsLine = best?.price ? `лучшая цена за шт. · лотов: ${best.total} · RU` : "цены, лоты и история продаж";
  const texts = ["STALZONE INFO", name, category, priceLine ?? "", lotsLine, "stalzone-info.ru"].join("");

  const fonts = await Promise.all([font(texts, 600), font(texts, 800)])
    .then(([regular, bold]) => [
      { name: "Manrope", data: regular, weight: 600 as const, style: "normal" as const },
      { name: "Manrope", data: bold, weight: 800 as const, style: "normal" as const },
    ])
    // нет сети до Google Fonts — без своего шрифта (латиница останется читаемой)
    .catch(() => undefined);

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
