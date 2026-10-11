"use client";

import { useRef, useState } from "react";
import { haptic } from "@/lib/telegram";
import { Icon } from "../Icon";
import styles from "./SwipePager.module.css";

interface Props {
  page: number;
  pages: number;
  onPage: (page: number) => void;
  children: React.ReactNode;
}

/** Порог свайпа: короче — считаем, что палец просто дрогнул. */
const SWIPE_PX = 60;

/**
 * Страницы листаются свайпом влево/вправо (или стрелками).
 * Вертикальная прокрутка не мешает: жест засчитывается, только если он скорее горизонтальный.
 */
export function SwipePager({ page, pages, onPage, children }: Props) {
  const start = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);
  const [dx, setDx] = useState(0);
  const [enter, setEnter] = useState<"left" | "right" | null>(null);

  const go = (next: number) => {
    if (next < 0 || next >= pages || next === page) return;
    haptic.select();
    setEnter(next > page ? "right" : "left");
    onPage(next);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY, horizontal: null };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const s = start.current;
    if (!s) return;
    const t = e.touches[0];
    const mx = t.clientX - s.x;
    const my = t.clientY - s.y;
    if (s.horizontal === null && Math.hypot(mx, my) > 8) s.horizontal = Math.abs(mx) > Math.abs(my) * 1.3;
    if (!s.horizontal) return;
    // у края списка — «резиновое» сопротивление
    const edge = (mx > 0 && page === 0) || (mx < 0 && page === pages - 1);
    setDx(edge ? mx / 4 : mx);
  };

  const onTouchEnd = () => {
    if (start.current?.horizontal) {
      if (dx <= -SWIPE_PX) go(page + 1);
      else if (dx >= SWIPE_PX) go(page - 1);
    }
    start.current = null;
    setDx(0);
  };

  return (
    <div className={styles.pager}>
      <div
        key={page}
        className={styles.track}
        data-enter={enter ?? undefined}
        data-dragging={dx !== 0 || undefined}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, touchAction: "pan-y" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {children}
      </div>

      {pages > 1 && (
        <nav className={styles.nav} aria-label="Страницы">
          <button type="button" className="icon-btn" aria-label="Предыдущая страница" disabled={page === 0} onClick={() => go(page - 1)}>
            <Icon name="back" size={18} />
          </button>
          <div className={styles.dots}>
            <span className="mono">
              {page + 1} <span className="dim">/ {pages}</span>
            </span>
            <span className={styles.bar} aria-hidden>
              <span style={{ width: `${((page + 1) / pages) * 100}%` }} />
            </span>
          </div>
          <button type="button" className="icon-btn" aria-label="Следующая страница" disabled={page >= pages - 1} onClick={() => go(page + 1)}>
            <Icon name="chevron" size={18} />
          </button>
        </nav>
      )}
    </div>
  );
}
