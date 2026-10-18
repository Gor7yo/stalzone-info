import { ARCHETYPES, ATTRIBUTE_SHORT, ATTRIBUTES, TIERS, type Archetype, type Attribute, type Tier } from "@/features/archetypes";

/**
 * Карточка игрока в стиле FIFA для генератора картинок (превью ссылки на профиль).
 * Вёрстка под satori: у каждого блока с несколькими детьми — display: flex.
 * w — ширина карточки в пикселях, всё остальное масштабируется от неё.
 */
export function OgFifaCard({
  w,
  name,
  region,
  overall,
  tier,
  archetype,
  attributes,
}: {
  w: number;
  name: string;
  region: string;
  overall: number;
  tier: Tier;
  archetype: Archetype;
  attributes: Record<Attribute, number>;
}) {
  const k = w / 260;
  const c = TIERS[tier];
  const px = (n: number) => Math.round(n * k);
  return (
    <div
      style={{
        width: w,
        // ниже, чем на сайте: на картинке характеристики мельче и снизу оставалась пустота
        height: px(345),
        display: "flex",
        flexDirection: "column",
        padding: `${px(18)}px ${px(18)}px ${px(16)}px`,
        borderRadius: `${px(28)}px ${px(28)}px ${px(34)}px ${px(34)}px`,
        border: `${px(2)}px solid ${c.edge}`,
        background: `radial-gradient(120% 70% at 50% 0%, ${c.edge}59, transparent 60%), linear-gradient(160deg, ${c.from}, ${c.to})`,
        boxShadow: `0 0 0 ${px(4)}px ${c.edge}2e, 0 ${px(26)}px ${px(60)}px -${px(22)}px ${c.glow}`,
        color: c.text,
        fontFamily: "Manrope",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
          <div style={{ display: "flex", fontSize: px(58), fontWeight: 800, textShadow: `0 0 ${px(22)}px ${c.edge}99` }}>{overall}</div>
          <div style={{ display: "flex", fontSize: px(26), marginTop: px(4) }}>{ARCHETYPES[archetype].emoji}</div>
          <div style={{ display: "flex", fontSize: px(12), fontWeight: 800, letterSpacing: px(1), marginTop: px(6), opacity: 0.75 }}>
            {region.toUpperCase()}
          </div>
        </div>
        <div
          style={{
            width: px(130),
            height: px(130),
            borderRadius: px(65),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `radial-gradient(circle, ${c.edge}4d, transparent 70%)`,
            fontSize: px(72),
            fontWeight: 800,
          }}
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          margin: `${px(10)}px 0 ${px(8)}px`,
          paddingBottom: px(8),
          borderBottom: `${Math.max(1, px(1))}px solid ${c.edge}73`,
          fontSize: px(name.length > 14 ? 16 : 19),
          fontWeight: 800,
          letterSpacing: px(0.5),
        }}
      >
        {name.toUpperCase()}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", padding: `0 ${px(8)}px` }}>
        {ATTRIBUTES.map((a) => (
          <div key={a} style={{ display: "flex", alignItems: "baseline", width: "50%", marginBottom: px(6) }}>
            <div style={{ display: "flex", fontSize: px(22), fontWeight: 800, width: px(34) }}>{attributes[a]}</div>
            <div style={{ display: "flex", fontSize: px(14), fontWeight: 600, opacity: 0.8 }}>{ATTRIBUTE_SHORT[a].ru}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Все буквы карточки — для подгрузки шрифта с кириллицей. */
export const ogCardTexts = (name: string, region: string) => [
  name.toUpperCase(),
  region.toUpperCase(),
  "0123456789",
  ...ATTRIBUTES.map((a) => ATTRIBUTE_SHORT[a].ru),
];
