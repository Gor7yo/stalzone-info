import { ImageResponse } from "next/og";
import { ARCHETYPES } from "@/features/archetypes";
import { int, OG_ACC, OG_BG, ogAcc, ogFonts, ogText } from "@/lib/og";
import { serverRecap } from "@/lib/players-server";

/**
 * Итоги месяца картинкой 1200×630: превью ссылки на страницу итогов, её же 1-го числа присылает бот.
 * Слева заголовок и ник, справа четыре цифры, лучший день и архетип. Пересобирается раз в 10 минут.
 */
export const alt = "Итоги месяца в Зоне";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 600;

const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
/** «19,5» — дробь по-русски. */
const dec = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 1 });

export default async function Image({ params }: { params: Promise<{ region: string; name: string; month: string }> }) {
  const { region, name: raw, month } = await params;
  const name = decodeURIComponent(raw);
  const r = /^20\d\d-(0[1-9]|1[0-2])$/.test(month) ? await serverRecap(region, name, month) : null;
  const m = Number(month.slice(5)) - 1;
  const nick = r?.username ?? name;
  const arch = r?.archetype ? ARCHETYPES[r.archetype] : null;
  const title = `Твой ${MONTHS[m] ?? "месяц"}`;
  const best = r?.bestDay
    ? `${Number(r.bestDay.day.slice(8))} ${MONTHS_GEN[m]} · ${int(r.bestDay.kills)} убийств за ${dec(r.bestDay.hours)} ч`
    : null;
  const since = r && !r.full ? `с ${Number(r.from.slice(8))} ${MONTHS_GEN[m]} - тогда начали следить` : null;
  const tiles = r
    ? [
        { value: `+${int(r.kills)}`, label: "убийств", color: OG_ACC },
        { value: `${int(r.hours)} ч`, label: "в игре", color: "#3ee0d0" },
        { value: String(r.activeDays), label: "дней в Зоне", color: "#9b8cff" },
        { value: `+${int(r.mutants)}`, label: "мутантов", color: "#ffb547" },
      ]
    : [];

  const fonts = await ogFonts([
    "STALZONE INFO",
    title,
    "в Зоне",
    nick,
    region.toUpperCase(),
    "За этот месяц данных пока нет",
    ...tiles.flatMap((x) => [x.value, x.label]),
    "Лучший день",
    best ?? "",
    "Архетип",
    arch?.ru ?? "",
    since ?? "",
    "stalzone-info.ru",
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        gap: 48,
        padding: "56px 64px",
        background: `radial-gradient(60% 90% at 10% 30%, ${ogAcc(0.16)}, transparent 60%), ${OG_BG}`,
        color: "#f2f4ee",
        fontFamily: "Manrope",
      }}
    >
      {/* слева: заголовок, ник, пометка о неполном месяце */}
      <div style={{ display: "flex", flexDirection: "column", width: 400, flexShrink: 0 }}>
        <div style={{ display: "flex", fontSize: 24, fontWeight: 800, letterSpacing: 4, color: OG_ACC }}>STALZONE INFO</div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 66, fontWeight: 800, lineHeight: 1.05 }}>{title}</div>
        <div
          style={{ display: "flex", fontSize: 66, fontWeight: 800, lineHeight: 1.1, color: OG_ACC, textShadow: `0 0 40px ${ogAcc(0.5)}` }}
        >
          в Зоне
        </div>
        <div style={{ display: "flex", marginTop: 22, fontSize: nick.length > 16 ? 26 : 32, fontWeight: 700, color: ogText(0.8) }}>
          {nick}
        </div>
        <div style={{ display: "flex", marginTop: 6, fontSize: 22, fontWeight: 600, color: ogText(0.45) }}>{region.toUpperCase()}</div>
        {since && <div style={{ display: "flex", marginTop: "auto", fontSize: 20, fontWeight: 600, color: ogText(0.5) }}>{since}</div>}
        <div style={{ display: "flex", marginTop: since ? 10 : "auto", fontSize: 22, fontWeight: 600, color: ogText(0.45) }}>
          stalzone-info.ru
        </div>
      </div>

      {/* справа: четыре цифры, лучший день, архетип */}
      {r ? (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 14 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", rowGap: 14 }}>
            {tiles.map((x) => (
              <div
                key={x.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "48.5%",
                  padding: "18px 22px",
                  borderRadius: 24,
                  background: "rgba(255,255,255,0.05)",
                  border: `2px solid ${x.color}55`,
                }}
              >
                <div style={{ display: "flex", fontSize: 48, fontWeight: 800, color: x.color, lineHeight: 1 }}>{x.value}</div>
                <div style={{ display: "flex", fontSize: 22, fontWeight: 600, color: ogText(0.7), marginTop: 6 }}>{x.label}</div>
              </div>
            ))}
          </div>
          {best && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "14px 22px",
                borderRadius: 24,
                background: "rgba(255,90,82,0.12)",
                border: "2px solid rgba(255,90,82,0.4)",
              }}
            >
              <div style={{ display: "flex", fontSize: 40 }}>🔥</div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 18, fontWeight: 600, color: ogText(0.65) }}>Лучший день</div>
                <div style={{ display: "flex", fontSize: 26, fontWeight: 800 }}>{best}</div>
              </div>
            </div>
          )}
          {arch && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "14px 22px",
                borderRadius: 24,
                background: `${arch.color}1f`,
                border: `2px solid ${arch.color}66`,
              }}
            >
              <div style={{ display: "flex", fontSize: 40 }}>{arch.emoji}</div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 18, fontWeight: 600, color: ogText(0.65) }}>Архетип</div>
                <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: arch.color }}>{arch.ru}</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flex: 1, alignItems: "center", fontSize: 40, fontWeight: 800, color: ogText(0.7) }}>
          За этот месяц данных пока нет
        </div>
      )}
    </div>,
    { ...size, fonts },
  );
}
