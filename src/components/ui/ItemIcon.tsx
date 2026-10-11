"use client";

import { useState } from "react";
import { iconUrl, rarityOf, type Item } from "@/features/items";
import styles from "./ui.module.css";

export function ItemIcon({ item, size = 48 }: { item?: Item; size?: number }) {
  const [failed, setFailed] = useState(false);
  const color = item ? rarityOf(item.rarity).color : "var(--text-3)";

  return (
    <span className={styles.itemIcon} style={{ width: size, height: size, "--rarity": color } as React.CSSProperties}>
      {item && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={iconUrl(item)}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={styles.itemIconFallback}>{item?.name.replace(/[«»"]/g, "").slice(0, 1) ?? "?"}</span>
      )}
    </span>
  );
}
