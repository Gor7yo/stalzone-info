"use client";

import { useId, useMemo, useRef, useState } from "react";
import { formatDateTime } from "@/lib/format";
import { haptic } from "@/lib/telegram";
// оформление — как у графика цены: та же карточка, подсказка и курсор
import styles from "../PriceChart/PriceChart.module.css";

const W = 600;
const H = 200;

export interface TrendPoint {
  t: number;
  v: number;
}

/**
 * Ступенчатый график целого показателя (бойцы клана): значение держится до следующего
 * изменения, поэтому линия идёт ступеньками, а не сглаживается. Скраб пальцем/мышью.
 */
export function TrendChart({ points, format, caption }: { points: TrendPoint[]; format: (v: number) => string; caption: string }) {
  const gradientId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const geo = useMemo(() => {
    const values = points.map((p) => p.v);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = Math.max(1, (hi - lo) * 0.2);
    const min = Math.max(0, lo - pad);
    const max = hi + pad;
    const t0 = points[0].t;
    const span = points[points.length - 1].t - t0 || 1;
    const x = (t: number) => ((t - t0) / span) * W;
    const y = (v: number) => H - ((v - min) / (max - min)) * H;

    const xy = points.map((p) => [x(p.t), y(p.v)] as const);
    // ступеньки: горизонтально до момента изменения, потом вертикально
    let line = `M${xy[0][0]},${xy[0][1]}`;
    for (let i = 1; i < xy.length; i++) line += `H${xy[i][0]}V${xy[i][1]}`;
    const area = `${line}L${W},${H}L0,${H}Z`;
    return { xy, line, area, min, max };
  }, [points]);

  const onMove = (e: React.PointerEvent) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    const fx = ((e.clientX - box.left) / box.width) * W;
    // значение под курсором — последнее изменение левее него
    let idx = 0;
    for (let i = 0; i < geo.xy.length; i++) if (geo.xy[i][0] <= fx) idx = i;
    if (idx !== active) {
      haptic.select();
      setActive(idx);
    }
  };

  const point = active != null ? points[active] : points[points.length - 1];
  const [ax, ay] = active != null ? geo.xy[active] : geo.xy[geo.xy.length - 1];
  const flipX = ax > W * 0.62;
  const flipY = ay < H * 0.35;

  return (
    <div className={styles.chart}>
      <div className={styles.readout}>
        <span className={styles.value}>
          <strong className="mono">{format(point.v)}</strong>
          <span>{active != null ? formatDateTime(point.t) : caption}</span>
        </span>
      </div>

      <div
        ref={boxRef}
        className={styles.plot}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setActive(null)}
        onPointerCancel={() => setActive(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={styles.svg} aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--acc)" stopOpacity="0.28" />
              <stop offset="1" stopColor="var(--acc)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={geo.area} fill={`url(#${gradientId})`} className={styles.area} />
          <path d={geo.line} className={styles.line} />
        </svg>

        <span
          className={styles.cursor}
          style={{ left: `${(ax / W) * 100}%`, "--y": `${(ay / H) * 100}%` } as React.CSSProperties}
          data-visible={active != null || undefined}
        />

        {active != null && (
          <div
            className={styles.tooltip}
            role="status"
            data-flip-x={flipX || undefined}
            data-flip-y={flipY || undefined}
            style={{ left: `${(ax / W) * 100}%`, top: `${(ay / H) * 100}%` }}
          >
            <strong className="mono">{format(point.v)}</strong>
            <span className={styles.tooltipTime}>{formatDateTime(point.t)}</span>
          </div>
        )}
      </div>

      <div className={styles.axis}>
        <span>{formatDateTime(points[0].t)}</span>
        <span>{formatDateTime(points[points.length - 1].t)}</span>
      </div>
    </div>
  );
}
