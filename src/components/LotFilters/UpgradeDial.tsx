"use client";

import { useRef } from "react";
import { MAX_UPGRADE } from "@/features/auction";
import { formatShort, plural } from "@/lib/format";
import { haptic } from "@/lib/telegram";
import { Icon } from "../Icon";
import styles from "./UpgradeDial.module.css";

export interface LevelInfo {
  count: number;
  best: number | null;
}

/**
 * Шкала заточки «эквалайзер»: 16 столбиков, высота — лучшая цена уровня.
 * Выбор пальцем (ведёшь по шкале), тапом или стрелками; повторный тап — сброс.
 */
export function UpgradeDial({
  levels,
  value,
  onChange,
}: {
  levels: LevelInfo[];
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ start: number | null; moved: boolean } | null>(null);

  // логарифмическая высота: 20к и 12кк должны уместиться в одну шкалу
  const prices = levels.map((l) => l.best).filter((p): p is number => !!p);
  const lo = Math.log(Math.min(...prices));
  const hi = Math.log(Math.max(...prices));
  const height = (p: number | null) => (!p ? 0 : hi > lo ? 0.3 + ((Math.log(p) - lo) / (hi - lo)) * 0.7 : 0.65);

  const levelAt = (clientX: number) => {
    const box = trackRef.current!.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - box.left, 0), box.width - 1);
    return Math.floor((x / box.width) * (MAX_UPGRADE + 1));
  };

  const set = (next: number | null) => {
    if (next === value) return;
    haptic.select();
    onChange(next);
  };

  const current = value === null ? null : levels[value];

  return (
    <div className={styles.dial}>
      <div className={styles.readout} aria-live="polite">
        <span className={styles.label}>Заточка</span>
        {value === null ? (
          <span className={styles.value}>любая</span>
        ) : (
          <>
            <b className="mono">+{value}</b>
            <span className={styles.value}>
              {current?.best ? `от ${formatShort(current.best)}` : "нет лотов"}
              {current?.count ? ` · ${current.count} ${plural(current.count, ["лот", "лота", "лотов"])}` : ""}
            </span>
            <button type="button" className={styles.reset} aria-label="Любая заточка" onClick={() => set(null)}>
              <Icon name="close" size={13} />
            </button>
          </>
        )}
      </div>

      <div
        ref={trackRef}
        className={styles.track}
        role="slider"
        tabIndex={0}
        aria-label="Уровень заточки"
        aria-valuemin={0}
        aria-valuemax={MAX_UPGRADE}
        aria-valuenow={value ?? undefined}
        aria-valuetext={value === null ? "любая" : `+${value}`}
        data-active={value !== null || undefined}
        onPointerDown={(e) => {
          trackRef.current?.setPointerCapture(e.pointerId);
          drag.current = { start: levelAt(e.clientX), moved: false };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const level = levelAt(e.clientX);
          if (level !== drag.current.start) drag.current.moved = true;
          if (drag.current.moved) set(level);
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (!d || d.moved) return;
          // простой тап: по выбранному — сброс, иначе выбор
          const level = levelAt(e.clientX);
          set(level === value ? null : level);
        }}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") set(Math.min(MAX_UPGRADE, (value ?? -1) + 1));
          else if (e.key === "ArrowLeft") set(value === null || value === 0 ? null : value - 1);
          else if (e.key === "Escape") set(null);
          else return;
          e.preventDefault();
        }}
      >
        {levels.map((l, i) => (
          <span
            key={i}
            className={styles.bar}
            data-empty={!l.count || undefined}
            data-selected={value === i || undefined}
            data-max={i === MAX_UPGRADE || undefined}
            style={{ "--h": height(l.best) } as React.CSSProperties}
          />
        ))}
        {value !== null && (
          <span className={styles.cursor} style={{ "--pos": (value + 0.5) / (MAX_UPGRADE + 1) } as React.CSSProperties} />
        )}
      </div>

      <div className={styles.scale} aria-hidden>
        <span>+0</span>
        <span>+5</span>
        <span>+10</span>
        <span>+15</span>
      </div>
    </div>
  );
}
