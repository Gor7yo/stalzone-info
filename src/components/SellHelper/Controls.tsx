"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_UPGRADE, qualities } from "@/features/auction";
import { useLang, useT } from "@/i18n/client";
import { haptic } from "@/lib/telegram";
import styles from "./Controls.module.css";

/** «Качество: ● Редкий ▾» — по нажатию список с цветными кружками. */
export function QualityPicker({ value, onChange }: { value: number; onChange: (q: number) => void }) {
  const t = useT().sell;
  const list = qualities(useLang());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = list[value] ?? list[0];

  // закрыть по клику мимо и по Escape
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className={styles.quality} ref={ref}>
      <button
        type="button"
        className={styles.qualityBtn}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          haptic.tap();
          setOpen((v) => !v);
        }}
      >
        <span className={styles.label}>{t.qualityLabel}</span>
        <span className={styles.dot} style={{ "--q": current.color } as React.CSSProperties} />
        <strong>{current.label}</strong>
        <span className={styles.caret} aria-hidden data-open={open || undefined}>
          ▾
        </span>
      </button>
      {open && (
        <ul className={styles.menu} role="listbox" aria-label={t.qualityAria}>
          {list.map((q, i) => (
            <li key={q.color}>
              <button
                type="button"
                role="option"
                aria-selected={i === value}
                className={styles.option}
                onClick={() => {
                  haptic.select();
                  onChange(i);
                  setOpen(false);
                }}
              >
                <span className={styles.dot} style={{ "--q": q.color } as React.CSSProperties} />
                {q.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Заточка +0…+15 — одна строка: подпись, ползунок с подсвеченной заполненной частью, значение. */
export function UpgradeSlider({ value, onChange }: { value: number; onChange: (u: number) => void }) {
  const t = useT().sell;
  return (
    <label className={styles.upgrade}>
      <span className={styles.label}>{t.upgradeLabel}</span>
      <span className={styles.track} style={{ "--f": value / MAX_UPGRADE } as React.CSSProperties}>
        <input
          type="range"
          min={0}
          max={MAX_UPGRADE}
          step={1}
          value={value}
          aria-label={t.upgradeAria}
          onChange={(e) => {
            haptic.select();
            onChange(Number(e.target.value));
          }}
        />
      </span>
      <strong className="mono">+{value}</strong>
    </label>
  );
}
