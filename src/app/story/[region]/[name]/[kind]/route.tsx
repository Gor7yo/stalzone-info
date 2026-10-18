import { ImageResponse } from "next/og";
import { ARCHETYPES, type Archetype } from "@/features/archetypes";
import type { Metric } from "@/features/character";
import { OgFifaCard, ogCardTexts } from "@/lib/og-card";
import { int, OG_ACC, OG_BG, ogAcc, ogFonts, ogText } from "@/lib/og";
import { serverRating, serverRecap } from "@/lib/players-server";
import { isRegion } from "@/lib/regions";

/**
 * Картинки для сторис 1080×1920: /story/ru/<ник>/card — карточка игрока,
 * /story/ru/<ник>/2026-10 — итоги месяца (её же бот присылает 1-го числа).
 */

const SIZE = { width: 1080, height: 1920 };
const MONTH_RE = /^20\d\d-(0[1-9]|1[0-2])$/;
const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const METRIC_LABEL: Record<Metric, string> = {
  kd: "K/D",
  kills: "Убийств",
  damage: "Урон",
  accuracy: "Точность",
  headshots: "Хедшоты",
  streak: "Серия",
  mutants: "Мутантов",
  played: "Часов в игре",
  survival: "Выживаемость",
};
/** «19,5» — дробь по-русски. */
const dec = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
/** картинка меняется не чаще статистики — 10 минут кеша у Vercel и браузера */
const CACHE = { "Cache-Control": "public, max-age=600, s-maxage=600" };

export async function GET(_req: Request, ctx: RouteContext<"/story/[region]/[name]/[kind]">) {
  const { region, name: raw, kind } = await ctx.params;
  if (!isRegion(region)) return new Response("Not found", { status: 404 });
  const name = decodeURIComponent(raw);
  if (kind === "card") return cardStory(region, name);
  if (MONTH_RE.test(kind)) return recapStory(region, name, kind);
  return new Response("Not found", { status: 404 });
}

/** Фон и рамка сторис: подсветка сверху, бренд, адрес снизу. */
function Frame({ glow, children, footer }: { glow: string; children: React.ReactNode; footer: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "90px 80px 80px",
        background: `radial-gradient(80% 45% at 50% 18%, ${glow}40, transparent 70%), ${OG_BG}`,
        color: "#f2f4ee",
        fontFamily: "Manrope",
      }}
    >
      <div style={{ display: "flex", fontSize: 34, fontWeight: 800, letterSpacing: 8, color: OG_ACC }}>STALZONE INFO</div>
      {children}
      <div style={{ display: "flex", marginTop: "auto", fontSize: 34, fontWeight: 600, color: ogText(0.6) }}>{footer}</div>
    </div>
  );
}

function Empty(text: string) {
  return (
    <Frame glow={OG_ACC} footer="stalzone-info.ru">
      <div style={{ display: "flex", marginTop: 700, fontSize: 52, fontWeight: 800, textAlign: "center" }}>{text}</div>
    </Frame>
  );
}

async function cardStory(region: string, name: string) {
  const r = await serverRating(region, name);
  const ready = r?.status === "ready" ? r : null;
  const nick = r?.username ?? name;
  const arch = ready ? ARCHETYPES[ready.archetype as Archetype] : null;
  const top = ready
    ? (Object.entries(ready.percentiles) as [Metric, number][])
        .filter(([m]) => m !== "streak")
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([m, p]) => `${METRIC_LABEL[m]} лучше, чем у ${Math.round(p)}% игроков`)
    : [];
  const footer = "А какая карточка у тебя? stalzone-info.ru";
  const fonts = await ogFonts([
    "STALZONE INFO",
    "КАРТОЧКА ИГРОКА",
    "Карточка появится чуть позже",
    ...ogCardTexts(nick, region),
    arch?.ru ?? "",
    arch?.textRu ?? "",
    ...top,
    footer,
  ]);

  return new ImageResponse(
    ready && arch ? (
      <Frame glow={arch.color} footer={footer}>
        <div style={{ display: "flex", marginTop: 26, fontSize: 30, fontWeight: 800, letterSpacing: 6, color: ogText(0.55) }}>
          КАРТОЧКА ИГРОКА
        </div>
        <div style={{ display: "flex", marginTop: 50 }}>
          <OgFifaCard
            w={600}
            name={nick}
            region={region}
            overall={ready.overall}
            tier={ready.tier}
            archetype={ready.archetype}
            attributes={ready.attributes}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 26,
            marginTop: 60,
            padding: "26px 34px",
            borderRadius: 36,
            border: `2px solid ${arch.color}66`,
            background: `${arch.color}1f`,
            width: "100%",
          }}
        >
          <div style={{ display: "flex", fontSize: 76 }}>{arch.emoji}</div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontSize: 50, fontWeight: 800, color: arch.color }}>{arch.ru}</div>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: ogText(0.75), marginTop: 6 }}>{arch.textRu}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 34, width: "100%" }}>
          {top.map((line) => (
            <div key={line} style={{ display: "flex", fontSize: 34, fontWeight: 700, color: ogText(0.9) }}>
              {/* неоновая точка: в шрифте нет треугольников */}
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  marginRight: 18,
                  alignSelf: "center",
                  background: OG_ACC,
                  boxShadow: `0 0 14px ${OG_ACC}`,
                }}
              />
              {line}
            </div>
          ))}
        </div>
      </Frame>
    ) : (
      Empty("Карточка появится чуть позже")
    ),
    { ...SIZE, fonts, headers: CACHE },
  );
}

async function recapStory(region: string, name: string, month: string) {
  const r = await serverRecap(region, name, month);
  const m = Number(month.slice(5)) - 1;
  const nick = r?.username ?? name;
  const arch = r?.archetype ? ARCHETYPES[r.archetype] : null;
  const title = `Твой ${MONTHS[m]}`;
  const best = r?.bestDay ? `${Number(r.bestDay.day.slice(8))} ${MONTHS_GEN[m]}` : null;
  const since = r && !r.full ? `с ${Number(r.from.slice(8))} ${MONTHS_GEN[m]} - тогда начали следить` : null;
  const rows = r
    ? [
        { value: `+${int(r.kills)}`, label: "убийств", color: OG_ACC },
        { value: `${int(r.hours)} ч`, label: "в игре", color: "#3ee0d0" },
        { value: String(r.activeDays), label: "дней в Зоне", color: "#9b8cff" },
        { value: `+${int(r.mutants)}`, label: "мутантов", color: "#ffb547" },
      ]
    : [];
  const footer = "Свои итоги - в боте @stalzoneinfo_bot";
  const fonts = await ogFonts([
    "STALZONE INFO",
    title,
    "в Зоне",
    nick,
    "За этот месяц данных нет",
    ...rows.flatMap((x) => [x.value, x.label]),
    "Лучший день",
    best ?? "",
    r?.bestDay ? `${int(r.bestDay.kills)} убийств за ${dec(r.bestDay.hours)} ч` : "",
    arch?.ru ?? "",
    "Архетип",
    since ?? "",
    footer,
  ]);

  if (!r) return new ImageResponse(Empty("За этот месяц данных нет"), { ...SIZE, fonts, headers: CACHE });

  return new ImageResponse(
    <Frame glow={arch?.color ?? OG_ACC} footer={footer}>
      <div style={{ display: "flex", marginTop: 70, fontSize: 120, fontWeight: 800, lineHeight: 1 }}>{title}</div>
      <div
        style={{ display: "flex", fontSize: 120, fontWeight: 800, lineHeight: 1.1, color: OG_ACC, textShadow: `0 0 60px ${ogAcc(0.5)}` }}
      >
        в Зоне
      </div>
      <div style={{ display: "flex", marginTop: 26, fontSize: 44, fontWeight: 700, color: ogText(0.75) }}>{nick}</div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", marginTop: 70, width: "100%" }}>
        {rows.map((x) => (
          <div
            key={x.label}
            style={{
              display: "flex",
              flexDirection: "column",
              width: "48%",
              marginBottom: 30,
              padding: "30px 34px",
              borderRadius: 36,
              background: "rgba(255,255,255,0.05)",
              border: `2px solid ${x.color}55`,
            }}
          >
            <div style={{ display: "flex", fontSize: 84, fontWeight: 800, color: x.color, lineHeight: 1 }}>{x.value}</div>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 600, color: ogText(0.7), marginTop: 10 }}>{x.label}</div>
          </div>
        ))}
      </div>

      {r.bestDay && best && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 26,
            width: "100%",
            marginTop: 10,
            padding: "28px 34px",
            borderRadius: 36,
            background: "rgba(255,90,82,0.12)",
            border: "2px solid rgba(255,90,82,0.4)",
          }}
        >
          <div style={{ display: "flex", fontSize: 70 }}>🔥</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 600, color: ogText(0.7) }}>Лучший день</div>
            <div style={{ display: "flex", fontSize: 46, fontWeight: 800 }}>
              {`${best} · ${int(r.bestDay.kills)} убийств за ${dec(r.bestDay.hours)} ч`}
            </div>
          </div>
        </div>
      )}

      {arch && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 26,
            width: "100%",
            marginTop: 30,
            padding: "28px 34px",
            borderRadius: 36,
            background: `${arch.color}1f`,
            border: `2px solid ${arch.color}66`,
          }}
        >
          <div style={{ display: "flex", fontSize: 70 }}>{arch.emoji}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 600, color: ogText(0.7) }}>Архетип</div>
            <div style={{ display: "flex", fontSize: 50, fontWeight: 800, color: arch.color }}>{arch.ru}</div>
          </div>
        </div>
      )}

      {since && <div style={{ display: "flex", marginTop: 30, fontSize: 30, fontWeight: 600, color: ogText(0.5) }}>{since}</div>}
    </Frame>,
    { ...SIZE, fonts, headers: CACHE },
  );
}
