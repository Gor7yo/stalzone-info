"use client";

import { useMemo, useRef, useState } from "react";
import { useFormat, useT } from "@/i18n/client";
import { haptic } from "@/lib/telegram";
import styles from "./Charts.module.css";

const W = 600;
const H = 220;

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

/**
 * Линейный график нескольких серий одной единицы (бойцы): легенда-переключатели,
 * перекрестие с подсказкой по всем видимым сериям, подписи у концов линий.
 * Одна ось — серии разного масштаба сюда не кладём (для них отдельный график).
 */
export function LineChart({
  times,
  series,
  format,
  emptyText,
}: {
  times: number[];
  series: LineSeries[];
  format: (v: number) => string;
  emptyText?: string;
}) {
  const t = useT().chart;
  const { formatDateTime } = useFormat();
  const boxRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<number | null>(null);
  const visible = useMemo(() => series.filter((s) => !hidden.has(s.key)), [series, hidden]);

  const geo = useMemo(() => {
    const all = visible.flatMap((s) => s.values);
    if (!all.length || times.length < 2) return null;
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const pad = Math.max(1, (hi - lo) * 0.15);
    const min = Math.max(0, lo - pad);
    const max = hi + pad;
    const t0 = times[0];
    const span = times[times.length - 1] - t0 || 1;
    const x = (i: number) => ((times[i] - t0) / span) * W;
    const y = (v: number) => H - ((v - min) / (max - min)) * H;
    const lines = visible.map((s) => ({
      ...s,
      xy: s.values.map((v, i) => [x(i), y(v)] as const),
    }));
    // три горизонтальные линии сетки с подписями
    const ticks = [0.15, 0.5, 0.85].map((f) => {
      const v = min + (max - min) * (1 - f);
      return { y: f * H, v };
    });
    return { lines, ticks, x };
  }, [visible, times]);

  const toggle = (key: string) => {
    haptic.select();
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(key)) next.delete(key);
      // последнюю видимую серию не прячем
      else if (series.length - next.size > 1) next.add(key);
      return next;
    });
  };

  const onMove = (e: React.PointerEvent) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || !geo) return;
    const fx = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    for (let i = 1; i < times.length; i++) {
      if (Math.abs(geo.x(i) - fx) < Math.abs(geo.x(best) - fx)) best = i;
    }
    if (best !== active) {
      haptic.select();
      setActive(best);
    }
  };

  const idx = active ?? times.length - 1;
  const ax = geo ? geo.x(idx) : 0;

  return (
    <div className={styles.card}>
      {series.length > 1 && (
        <div className={styles.legend} role="group" aria-label={t.series}>
          {series.map((s) => (
            <button key={s.key} type="button" className={styles.legendItem} aria-pressed={!hidden.has(s.key)} onClick={() => toggle(s.key)}>
              <span className={styles.swatch} style={{ background: s.color }} />
              {s.label}
              <span className="mono">{format(s.values[idx] ?? 0)}</span>
            </button>
          ))}
        </div>
      )}

      {!geo ? (
        <p className={styles.empty}>{emptyText ?? t.noData}</p>
      ) : (
        <>
          <div
            ref={boxRef}
            className={styles.plot}
            style={{ height: 220 }}
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setActive(null)}
            onPointerCancel={() => setActive(null)}
          >
            {geo.ticks.map((t) => (
              <span key={t.y} className={styles.grid} style={{ top: `${(t.y / H) * 100}%` }}>
                <span className="mono">{format(Math.round(t.v))}</span>
              </span>
            ))}
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={styles.svg} aria-hidden>
              {geo.lines.map((l) => (
                <polyline
                  key={l.key}
                  points={l.xy.map(([px, py]) => `${px},${py}`).join(" ")}
                  className={styles.line}
                  style={{ stroke: l.color }}
                />
              ))}
            </svg>

            {/* подписи у концов линий (вне SVG — без искажения текста) */}
            {geo.lines.length > 1 &&
              geo.lines.map((l) => {
                const [, py] = l.xy[l.xy.length - 1];
                return (
                  <span key={l.key} className={styles.endLabel} style={{ top: `${(py / H) * 100}%` }}>
                    {l.label}
                  </span>
                );
              })}

            {active != null && (
              <>
                <span className={styles.crosshair} style={{ left: `${(ax / W) * 100}%` }} />
                {geo.lines.map((l) => {
                  const [px, py] = l.xy[idx];
                  return (
                    <span
                      key={l.key}
                      className={styles.dot}
                      style={{ left: `${(px / W) * 100}%`, top: `${(py / H) * 100}%`, background: l.color }}
                    />
                  );
                })}
                <div className={styles.tooltip} role="status" data-flip={ax > W * 0.6 || undefined} style={{ left: `${(ax / W) * 100}%` }}>
                  <span className={styles.tooltipTime}>{formatDateTime(times[idx])}</span>
                  {geo.lines.map((l) => (
                    <span key={l.key} className={styles.tooltipRow}>
                      <span className={styles.swatch} style={{ background: l.color }} />
                      {geo.lines.length > 1 && <span>{l.label}</span>}
                      <strong className="mono">{format(l.values[idx])}</strong>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className={styles.axis}>
            <span>{formatDateTime(times[0])}</span>
            <span>{formatDateTime(times[times.length - 1])}</span>
          </div>
        </>
      )}
    </div>
  );
}
