import { allianceOf } from "@/features/alliances";
import { stripMc } from "@/lib/mcText";

export function ClanEmblem({ alliance, tag, size = 46 }: { alliance?: string; tag: string; size?: number }) {
  const a = allianceOf(alliance);
  return (
    <span
      style={{
        display: "grid",
        placeItems: "center",
        width: size,
        height: size,
        flex: "none",
        borderRadius: size * 0.3,
        background: `color-mix(in srgb, ${a.color} 13%, var(--bg-2))`,
        border: `1px solid color-mix(in srgb, ${a.color} 30%, transparent)`,
        color: a.color,
        fontFamily: "var(--font-mono)",
        fontWeight: 800,
        fontSize: size * 0.26,
        overflow: "hidden",
      }}
      title={a.label}
    >
      {a.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.image} alt={a.label} width={size * 0.66} height={size * 0.66} loading="lazy" style={{ objectFit: "contain" }} />
      ) : (
        stripMc(tag).slice(0, 4)
      )}
    </span>
  );
}
