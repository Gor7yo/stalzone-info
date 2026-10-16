"use client";

import { useState } from "react";
import { useFormat } from "@/i18n/client";
import { haptic } from "@/lib/telegram";
import styles from "./Charts.module.css";

export interface Bar {
  label: string;
  value: number;
  /** подсказка при наведении (по умолчанию — подпись и значение) */
  tip?: string;
  /** свой цвет столбца (группировка); иначе — акцент */
  color?: string;
}

/**
 * Столбчатый график: подсказка при наведении/касании, подписи оси без наложений
 * (при многих столбцах — через одну-пять), максимум над сеткой.
 */
export function BarChart({ bars, format: formatProp, height = 160 }: { bars: Bar[]; format?: (v: number) => string; height?: number }) {
  const { formatNumber } = useFormat();
  const format = formatProp ?? formatNumber;
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.value));
  // подписи оси: при 35 столбцах — 1, 5, 10 … и последний
  const every = bars.length > 20 ? 5 : bars.length > 10 ? 2 : 1;
  const showLabel = (i: number) => bars.length <= 10 || i === 0 || (i + 1) % every === 0 || i === bars.length - 1;

  const pick = (i: number | null) => {
    if (i !== active) {
      if (i != null) haptic.select();
      setActive(i);
    }
  };

  return (
    <div className={styles.barWrap}>
      <div className={styles.bars} style={{ height }} onPointerLeave={() => pick(null)}>
        <span className={styles.grid} style={{ top: 0 }}>
          <span className="mono">{format(max)}</span>
        </span>
        <span className={styles.grid} style={{ top: "50%" }}>
          <span className="mono">{format(Math.round(max / 2))}</span>
        </span>
        {bars.map((b, i) => (
          <button
            key={b.label}
            type="button"
            className={styles.barHit}
            aria-label={b.tip ?? `${b.label}: ${format(b.value)}`}
            data-active={active === i || undefined}
            data-dim={(active != null && active !== i) || undefined}
            onPointerEnter={() => pick(i)}
            onPointerDown={() => pick(i)}
            onFocus={() => pick(i)}
          >
            <span className={styles.bar} style={{ height: `${(b.value / max) * 100}%`, background: b.color ?? "var(--acc)" }} />
            {active === i && (
              <span className={styles.barTip} data-edge={i < 2 ? "left" : i > bars.length - 3 ? "right" : undefined}>
                <strong className="mono">{format(b.value)}</strong>
                <span>{b.tip ?? b.label}</span>
              </span>
            )}
          </button>
        ))}
      </div>
      <div className={styles.barLabels}>
        {bars.map((b, i) => (
          <span key={b.label}>{showLabel(i) ? b.label : ""}</span>
        ))}
      </div>
    </div>
  );
}
