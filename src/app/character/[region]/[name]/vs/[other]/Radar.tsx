"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { haptic } from "@/lib/telegram";
import type { Row } from "./CompareView";
import styles from "./radar.module.css";

/** Геометрия: центр, радиус фигуры и подписей (в единицах viewBox 440×340). */
const CX = 220;
const CY = 170;
const R = 112;
const LABEL_R = 138;
/** Кольца сетки: 25 / 50 / 75 / 100 % */
const RINGS = [0.25, 0.5, 0.75, 1];
/** Совсем маленькое значение всё равно чуть видно — иначе фигура схлопывается в точку. */
const MIN_SHARE = 0.06;

const point = (i: number, n: number, r: number) => {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)] as const;
};
const polygon = (shares: number[]) => shares.map((s, i) => point(i, shares.length, R * s).join(",")).join(" ");

/**
 * Октагон, как сравнение героев в Доте: по каждой оси лучший из двоих — на краю,
 * второй — на своей доле от него. Нажатие на показатель — цифры обоих.
 */
export function Radar({ axes, nameA, nameB }: { axes: Row[]; nameA: string; nameB: string }) {
  const t = useT().player.compare;
  const [active, setActive] = useState<number | null>(null);
  if (axes.length < 3) return null;

  const n = axes.length;
  const share = (v: number, r: Row) => {
    const max = Math.max(r.a, r.b);
    return max > 0 ? Math.max(MIN_SHARE, v / max) : 0;
  };
  const sharesA = axes.map((r) => share(r.a, r));
  const sharesB = axes.map((r) => share(r.b, r));
  const current = active != null ? axes[active] : null;
  // без переключения: на компьютере наведение уже выбрало показатель, клик не должен его снимать
  const pick = (i: number) => {
    haptic.select();
    setActive(i);
  };

  return (
    <section className={`glass ${styles.radar}`}>
      <div className={styles.legend}>
        <span data-side="a">{nameA}</span>
        <span data-side="b">{nameB}</span>
      </div>

      <svg viewBox="0 0 440 340" className={styles.svg} role="img" aria-label={t.radarAria}>
        {/* сетка: кольца-октагоны и лучи */}
        {RINGS.map((k) => (
          <polygon key={k} points={polygon(axes.map(() => k))} className={styles.ring} data-outer={k === 1 || undefined} />
        ))}
        {axes.map((_, i) => {
          const [x, y] = point(i, n, R);
          return <line key={i} x1={CX} y1={CY} x2={x} y2={y} className={styles.spoke} data-active={active === i || undefined} />;
        })}

        {/* фигуры игроков: сначала правый, сверху левый */}
        <polygon points={polygon(sharesB)} className={styles.shape} data-side="b" />
        <polygon points={polygon(sharesA)} className={styles.shape} data-side="a" />
        {[sharesB, sharesA].map((shares, s) =>
          shares.map((v, i) => {
            const [x, y] = point(i, n, R * v);
            return <circle key={`${s}-${i}`} cx={x} cy={y} r={active === i ? 5 : 3.5} className={styles.dot} data-side={s ? "a" : "b"} />;
          }),
        )}

        {/* подписи осей — цветом того, кто впереди; нажатие показывает цифры */}
        {axes.map((r, i) => {
          const [x, y] = point(i, n, LABEL_R);
          const anchor = Math.abs(x - CX) < 4 ? "middle" : x > CX ? "start" : "end";
          const win = r.a === r.b ? undefined : r.a > r.b ? "a" : "b";
          return (
            <text
              key={r.label}
              x={x}
              y={y}
              dy="0.35em"
              textAnchor={anchor}
              className={styles.label}
              data-win={win}
              data-active={active === i || undefined}
              onClick={() => pick(i)}
              onMouseEnter={() => setActive(i)}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && pick(i)}
            >
              {r.label}
            </text>
          );
        })}
      </svg>

      <p className={styles.readout} aria-live="polite">
        {current ? (
          <>
            <b data-side="a" data-win={current.a > current.b || undefined} className="mono">
              {current.format(current.a)}
            </b>
            <span>{current.label}</span>
            <b data-side="b" data-win={current.b > current.a || undefined} className="mono">
              {current.format(current.b)}
            </b>
          </>
        ) : (
          <span>{t.radarHint}</span>
        )}
      </p>
    </section>
  );
}
