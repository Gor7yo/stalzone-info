import { allianceOf } from "@/features/alliances";
import { Icon } from "./Icon";

/**
 * Аватарка игрока - герб его группировки. У группировок без герба (бандиты, сталкеры)
 * и у неизвестной (старая запись в недавних) - значок игрока в цвете группировки.
 */
export function PlayerAvatar({ alliance, size = 44 }: { alliance?: string; size?: number }) {
  const a = allianceOf(alliance);
  return (
    <span
      style={{
        display: "grid",
        placeItems: "center",
        width: size,
        height: size,
        flex: "none",
        borderRadius: size * 0.32,
        background: `color-mix(in srgb, ${a.color} 13%, var(--bg-2))`,
        border: `1px solid color-mix(in srgb, ${a.color} 30%, transparent)`,
        color: a.color,
      }}
      title={alliance ? a.label : undefined}
    >
      {a.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.image} alt={a.label} width={size * 0.68} height={size * 0.68} loading="lazy" style={{ objectFit: "contain" }} />
      ) : (
        <Icon name="user" size={Math.round(size * 0.45)} />
      )}
    </span>
  );
}
