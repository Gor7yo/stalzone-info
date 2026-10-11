"use client";

import Link from "next/link";
import { categoryLabel, rarityOf, type Item } from "@/features/items";
import { actions } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { Icon } from "./Icon";
import { ItemIcon } from "./ui/ItemIcon";

export function ItemRow({ item, aside }: { item: Item; aside?: React.ReactNode }) {
  const rarity = rarityOf(item.rarity);

  return (
    <Link
      href={`/auction/${item.id}`}
      className="list-row"
      onClick={() => {
        haptic.tap();
        actions.pushRecentItem(item.id);
      }}
    >
      <ItemIcon item={item} size={46} />
      <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 2 }}>
        <strong className="truncate" style={{ fontSize: 15 }}>
          {item.name}
        </strong>
        <span className="truncate" style={{ fontSize: 12, fontWeight: 600 }}>
          {item.rarity !== "DEFAULT" && <span style={{ color: rarity.color }}>{rarity.label} · </span>}
          <span className="dim">{categoryLabel(item.category)}</span>
        </span>
      </span>
      {aside ?? <Icon name="chevron" size={18} className="dim" />}
    </Link>
  );
}
