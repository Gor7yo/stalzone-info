"use client";

import { useRef } from "react";
import { MAX_UPGRADE, upgradeLabel, upgradeRuns } from "@/features/auction";
import { useFormat, useT } from "@/i18n/client";
import { haptic } from "@/lib/telegram";
import { Icon } from "../Icon";
import styles from "./UpgradeDial.module.css";

export interface LevelInfo {
  count: number;
  best: number | null;
}

const between = (a: number, b: number) => Array.from({ length: Math.abs(b - a) + 1 }, (_, i) => Math.min(a, b) + i);
const sorted = (set: Set<number>) => [...set].sort((a, b) => a - b);

/**
 * Шкала заточки «эквалайзер»: 16 столбиков, высота — количество лотов на уровне.
 * Выбирается любой набор уровней:
 * - тап — включить/выключить уровень (+1 и +5 — два тапа);
 * - провёл с зажатой кнопкой/пальцем — закрасить отрезок; если начал с выбранного уровня — стереть;
 * - стрелки ←/→ — один соседний уровень, Shift+стрелка — добавить соседний, Esc — очистить.
 */
export function UpgradeDial({
  levels,
  value,
  onChange,
}: {
  levels: LevelInfo[];
  /** выбранные уровни по возрастанию; пусто — любая заточка */
  value: number[];
  onChange: (value: number[]) => void;
}) {
  const { filters: t, item: tItem } = useT();
  const { formatShort } = useFormat();
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ start: number; base: Set<number>; erase: boolean; moved: boolean } | null>(null);
  const selected = new Set(value);

  // высота — сколько лотов на уровне; корень, чтобы 1 лот рядом с 50 не превращался в ноль
  const maxCount = Math.max(1, ...levels.map((l) => l.count));
  const height = (count: number) => (count ? 0.2 + Math.sqrt(count / maxCount) * 0.8 : 0);

  const levelAt = (clientX: number) => {
    const box = trackRef.current!.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - box.left, 0), box.width - 1);
    return Math.floor((x / box.width) * (MAX_UPGRADE + 1));
  };

  const set = (next: number[]) => {
    if (next.length === value.length && next.every((l, i) => l === value[i])) return;
    haptic.select();
    onChange(next);
  };

  /** Закрасить (или стереть) отрезок от точки нажатия до пальца поверх выбора на момент нажатия. */
  const paint = (to: number) => {
    const d = drag.current!;
    const next = new Set(d.base);
    for (const l of between(d.start, to)) {
      if (d.erase) next.delete(l);
      else next.add(l);
    }
    set(sorted(next));
  };

  const toggle = (level: number) => {
    const next = new Set(selected);
    if (next.has(level)) next.delete(level);
    else next.add(level);
    set(sorted(next));
  };

  // итог по выбранным уровням: сколько лотов и самая низкая цена
  const picked = value.map((l) => levels[l]).filter(Boolean);
  const count = picked.reduce((sum, l) => sum + l.count, 0);
  const prices = picked.map((l) => l.best).filter((p): p is number => p !== null);
  const best = prices.length ? Math.min(...prices) : null;
  const label = upgradeLabel({ upgrade: null, upgrades: value });
  // много разрозненных уровней в строку не влезут — коротко «8 уровней» (какие — видно по подсвеченным столбикам)
  const short = upgradeRuns(value).length > 2 ? t.levels(value.length) : label;

  return (
    <div className={styles.dial}>
      <div className={styles.readout} aria-live="polite">
        {/* слева: «Заточка», под ней — цена и число лотов выбранных уровней */}
        <span className={styles.head}>
          <span className={styles.label}>{t.upgrade}</span>
          {value.length > 0 && (
            <span className={styles.value}>
              {best ? t.from(formatShort(best)) : t.noLots}
              {count ? ` · ${tItem.lots(count, String(count))}` : ""}
            </span>
          )}
        </span>
        {!value.length ? (
          <span className={styles.value}>{t.any}</span>
        ) : (
          <>
            <b className={`mono ${styles.picked}`} title={label}>
              {short}
            </b>
            <button type="button" className={styles.reset} onClick={() => set([])} aria-label={t.clearUpgrade} title={t.clearUpgrade}>
              <Icon name="close" size={12} />
            </button>
          </>
        )}
      </div>

      <div
        ref={trackRef}
        className={styles.track}
        role="group"
        tabIndex={0}
        aria-label={t.levelsAria(label)}
        data-active={value.length > 0 || undefined}
        onPointerDown={(e) => {
          trackRef.current?.setPointerCapture(e.pointerId);
          const start = levelAt(e.clientX);
          drag.current = { start, base: new Set(selected), erase: selected.has(start), moved: false };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const level = levelAt(e.clientX);
          if (level !== drag.current.start) drag.current.moved = true;
          if (drag.current.moved) paint(level);
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (d && !d.moved) toggle(levelAt(e.clientX));
        }}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(e) => {
          const first = value[0] ?? -1;
          const last = value[value.length - 1] ?? -1;
          if (e.key === "ArrowRight") {
            const next = Math.min(MAX_UPGRADE, last + 1);
            set(e.shiftKey ? sorted(new Set([...value, next])) : [next]);
          } else if (e.key === "ArrowLeft") {
            const prev = Math.max(0, first - 1);
            if (e.shiftKey && value.length) set(sorted(new Set([...value, prev])));
            else set(first <= 0 ? [] : [prev]);
          } else if (e.key === "Escape") set([]);
          else return;
          e.preventDefault();
        }}
      >
        {levels.map((l, i) => (
          <span
            key={i}
            className={styles.bar}
            data-empty={!l.count || undefined}
            data-selected={selected.has(i) || undefined}
            data-max={i === MAX_UPGRADE || undefined}
            style={{ "--h": height(l.count) } as React.CSSProperties}
          />
        ))}
        {/* рамка вокруг каждого подряд идущего отрезка выбора */}
        {upgradeRuns(value).map(([from, to]) => (
          <span key={from} className={styles.cursor} style={{ "--from": from, "--n": to - from + 1 } as React.CSSProperties} />
        ))}
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
