"use client";

import { useId, useMemo, useRef, useState } from "react";
import { qualities, type ChartPoint } from "@/features/auction";
import { useFormat, useLang, useT } from "@/i18n/client";
import type { Lang } from "@/i18n/lang";
import type { Dict } from "@/i18n/ru";
import { makeFormat } from "@/lib/format";
import { haptic } from "@/lib/telegram";
import styles from "./PriceChart.module.css";
import { smoothPath } from "./smooth";

const W = 600;
const H = 200;

type Point = ChartPoint;

/** «Редкий +15» для сделки, «медиана 12 сделок» для корзины. */
export function describe(p: Point, t: Dict["chart"], lang: Lang) {
  if (p.count !== undefined) {
    return { text: t.bucket(p.count, makeFormat(lang).formatNumber(p.count)), color: undefined };
  }
  const q = p.quality != null ? qualities(lang)[p.quality] : undefined;
  if (!q) return null;
  return { text: `${q.label} +${p.upgrade ?? 0}`, color: q.color };
}

/**
 * График продаж: SVG без библиотек, скраб пальцем, выбросы цены обрезаются по перцентилям.
 * Плавающая подсказка у точки — цена, время, качество и заточка сделки.
 */
export function PriceChart({ points, median }: { points: Point[]; median: number }) {
  const t = useT().chart;
  const lang = useLang();
  const { formatDateTime, formatPrice } = useFormat();
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
    const line = smoothPath(xy);
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
  const tag = describe(point, t, lang);
  // у правого края подсказка разворачивается влево, у верхнего — опускается под точку
  const flipX = ax > W * 0.62;
  const flipY = ay < H * 0.35;

  return (
    <div className={styles.chart}>
      <div className={styles.readout}>
        <span className={styles.value}>
          <strong className="mono">{formatPrice(point.price)}</strong>
          <span>{active != null ? formatDateTime(point.t) : t.lastDeal}</span>
        </span>
        {tag && (
          <span className={styles.tag} style={{ color: tag.color }}>
            {tag.text}
          </span>
        )}
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
          {t.median}
        </span>

        <span
          className={styles.cursor}
          style={
            {
              left: `${(ax / W) * 100}%`,
              "--y": `${(ay / H) * 100}%`,
              ...(tag?.color && { "--dot": tag.color }),
            } as React.CSSProperties
          }
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
            <strong className="mono">{formatPrice(point.price)}</strong>
            {tag && (
              <span className={styles.tooltipTag} style={{ color: tag.color, "--c": tag.color } as React.CSSProperties}>
                {tag.color && <span className="dot" />}
                {tag.text}
              </span>
            )}
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
