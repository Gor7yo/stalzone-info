"use client";

import { useId, useMemo, useRef, useState } from "react";
import { formatDateTime, formatPrice } from "@/lib/format";
import { haptic } from "@/lib/telegram";
import styles from "./PriceChart.module.css";

const W = 600;
const H = 200;

interface Point {
  t: number;
  price: number;
}

/** График продаж: SVG без библиотек, скраб пальцем, выбросы цены обрезаются по перцентилям. */
export function PriceChart({ points, median }: { points: Point[]; median: number }) {
  const gradientId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const geo = useMemo(() => {
    const prices = points.map((p) => p.price).sort((a, b) => a - b);
    const lo = prices[Math.floor(prices.length * 0.04)];
    const hi = prices[Math.ceil(prices.length * 0.96) - 1];
    const pad = (hi - lo) * 0.15 || hi * 0.1 || 1;
    const min = Math.max(0, lo - pad);
    const max = hi + pad;
    const t0 = points[0].t;
    const t1 = points[points.length - 1].t;
    const span = t1 - t0 || 1;

    const x = (t: number) => ((t - t0) / span) * W;
    const y = (v: number) => H - ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * H;

    const xy = points.map((p) => [x(p.t), y(p.price)] as const);
    const line = xy.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join("");
    const area = `${line}L${W},${H}L0,${H}Z`;

    return { xy, line, area, medianY: y(median), max, min };
  }, [points, median]);

  const onMove = (e: React.PointerEvent) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    const fx = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    for (let i = 1; i < geo.xy.length; i++) {
      if (Math.abs(geo.xy[i][0] - fx) < Math.abs(geo.xy[best][0] - fx)) best = i;
    }
    if (best !== active) {
      haptic.select();
      setActive(best);
    }
  };

  const point = active != null ? points[active] : points[points.length - 1];
  const [ax, ay] = active != null ? geo.xy[active] : geo.xy[geo.xy.length - 1];

  return (
    <div className={styles.chart}>
      <div className={styles.readout}>
        <strong className="mono">{formatPrice(point.price)}</strong>
        <span>{active != null ? formatDateTime(point.t) : "последняя сделка"}</span>
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
              <stop offset="0" stopColor="var(--acc)" stopOpacity="0.32" />
              <stop offset="1" stopColor="var(--acc)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={geo.area} fill={`url(#${gradientId})`} className={styles.area} />
          <line x1="0" x2={W} y1={geo.medianY} y2={geo.medianY} className={styles.median} />
          <path d={geo.line} className={styles.line} />
        </svg>

        <span className={styles.medianLabel} style={{ top: `${(geo.medianY / H) * 100}%` }}>
          медиана
        </span>

        <span
          className={styles.cursor}
          style={{ left: `${(ax / W) * 100}%`, "--y": `${(ay / H) * 100}%` } as React.CSSProperties}
          data-visible={active != null || undefined}
        />
      </div>

      <div className={styles.axis}>
        <span>{formatDateTime(points[0].t)}</span>
        <span>{formatDateTime(points[points.length - 1].t)}</span>
      </div>
    </div>
  );
}
