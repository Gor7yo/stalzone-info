"use client";

import Link from "next/link";
import { type Item } from "@/features/items";
import { actions } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { ItemIcon } from "./ui/ItemIcon";

/** Компактная плитка предмета: иконка + название (длинное — с «…»). Кладётся в сетку `.item-grid`. */
export function ItemRow({ item, aside }: { item: Item; aside?: React.ReactNode }) {
  return (
    <Link
      href={`/auction/${item.id}`}
      className="item-tile"
      title={item.name}
      onClick={() => {
        haptic.tap();
        actions.pushRecentItem(item.id);
      }}
    >
      <ItemIcon item={item} size={34} />
      <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 1 }}>
        <strong className="truncate" style={{ fontSize: 13 }}>
          {item.name}
        </strong>
        {aside}
      </span>
    </Link>
  );
}
