"use client";

import { haptic } from "@/lib/telegram";
import styles from "./ui.module.css";

interface Option<T extends string> {
  value: T;
  label: React.ReactNode;
}

/** Сегментированный переключатель со «скользящей» подложкой. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  label,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  label: string;
}) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  return (
    <div
      role="tablist"
      aria-label={label}
      className={`${styles.segmented} ${size === "sm" ? styles.segmentedSm : ""}`}
      style={{ "--count": options.length, "--index": index } as React.CSSProperties}
    >
      <span className={styles.segmentedThumb} aria-hidden />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={styles.segmentedItem}
          onClick={() => {
            if (o.value === value) return;
            haptic.select();
            onChange(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
