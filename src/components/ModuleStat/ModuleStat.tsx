"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { QUALITY } from "@/features/auction";
import { effectText, moduleConcept, variantLabel, variantName } from "@/features/modules";
import { haptic } from "@/lib/telegram";
import { Icon } from "../Icon";
import styles from "./ModuleStat.module.css";

/** Что даёт ключевая характеристика: описание и эффекты с цифрами для ранга качества (null — для любого). */
export function ModuleStatCard({ id, quality }: { id: string; quality: number | null }) {
  const concept = moduleConcept(id);
  const q = quality === null ? null : QUALITY[quality];
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <b>{variantLabel(id)}</b>
        <span className={styles.cardQuality} style={q ? { color: q.color } : undefined}>
          {q ? q.label : "Обычный…Легендарный"}
        </span>
      </div>
      {concept ? (
        <>
          {concept.description && <p className={styles.description}>{concept.description}</p>}
          <ul className={styles.effects}>
            {concept.effects.map((e, i) => (
              <li key={i} data-good={e.good || undefined}>
                {e.text ? (
                  <span>{effectText(e, quality)}</span>
                ) : (
                  <>
                    <span>{e.label}</span>
                    <b className="mono">{effectText(e, quality)}</b>
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className={styles.description}>Новая характеристика - описания пока нет.</p>
      )}
    </div>
  );
}

interface Pos {
  left: number;
  top?: number;
  bottom?: number;
}

const POP_W = 288;

/**
 * Бейдж «Снайпер» с подсказкой: мышью — по наведению, на телефоне — по тапу,
 * с клавиатуры — по фокусу. Подсказка в портале, чтобы её не обрезали прокручиваемые ряды.
 */
export function ModuleStatBadge({
  id,
  quality,
  size = "sm",
  className,
}: {
  id: string;
  quality: number | null;
  /** sm — в строках лотов, md — рядом с обычными плашками (.pill) */
  size?: "sm" | "md";
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const pointer = useRef("");
  const [pos, setPos] = useState<Pos | null>(null);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - POP_W - 8));
    // снизу не помещается — открываем вверх
    const up = r.bottom + 240 > window.innerHeight && r.top > 240;
    setPos(up ? { left, bottom: window.innerHeight - r.top + 6 } : { left, top: r.bottom + 6 });
  };

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const outside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("pointerdown", outside);
    };
  }, [pos]);

  return (
    <>
      <button
        ref={ref}
        type="button"
        className={`${styles.badge} ${className ?? ""}`}
        data-size={size}
        aria-expanded={Boolean(pos)}
        aria-label={`Ключевая характеристика ${variantName(id)} - что даёт`}
        onPointerDown={(e) => (pointer.current = e.pointerType)}
        onPointerEnter={(e) => e.pointerType === "mouse" && show()}
        onPointerLeave={(e) => e.pointerType === "mouse" && setPos(null)}
        onFocus={(e) => e.currentTarget.matches(":focus-visible") && show()}
        onBlur={() => setPos(null)}
        onClick={(e) => {
          // бейдж бывает внутри ссылки (лента флипов) — не переходим
          e.preventDefault();
          e.stopPropagation();
          if (pointer.current === "mouse") return;
          haptic.tap();
          if (pos) setPos(null);
          else show();
        }}
      >
        {variantLabel(id)}
      </button>
      {pos &&
        createPortal(
          <div role="tooltip" className={styles.pop} style={{ ...pos, width: POP_W }}>
            <ModuleStatCard id={id} quality={quality} />
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * Выдвижное меню выбора ключевой характеристики. Наведение (или фокус) на пункт
 * показывает справа/снизу, что он даёт; без наведения — выбранный.
 */
export function ModuleStatPicker({
  variants,
  counts,
  value,
  quality,
  allowAny = true,
  onChange,
}: {
  /** пункт «Любая» (в помощнике продажи характеристика обязательна) */
  allowAny?: boolean;
  /** характеристики в лотах — самые частые первыми */
  variants: string[];
  counts?: Record<string, number>;
  value: string | null;
  /** ранг качества для цифр; null — диапазон по всем */
  quality: number | null;
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const preview = hover ?? value;

  const pick = (v: string | null) => {
    haptic.select();
    onChange(v);
    setOpen(false);
    setHover(null);
  };

  return (
    <div className={styles.picker} data-open={open || undefined}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        onClick={() => {
          haptic.tap();
          setOpen((o) => !o);
        }}
      >
        <span className={styles.triggerLabel}>Ключевая характеристика</span>
        <b>{value ? variantLabel(value) : "Любая"}</b>
        <span className={styles.chevron}>
          <Icon name="down" size={16} />
        </span>
      </button>

      {open && (
        <div className={styles.menu}>
          <ul className={styles.options} role="listbox" aria-label="Ключевая характеристика модуля" onPointerLeave={() => setHover(null)}>
            {allowAny && (
              <li>
                <button type="button" role="option" aria-selected={value === null} onClick={() => pick(null)}>
                  <span className={styles.optionName}>Любая</span>
                </button>
              </li>
            )}
            {variants.map((v) => (
              <li key={v}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === v}
                  onPointerEnter={(e) => e.pointerType === "mouse" && setHover(v)}
                  onFocus={() => setHover(v)}
                  onClick={() => pick(v)}
                >
                  <span className={styles.optionName}>{variantName(v)}</span>
                  {moduleConcept(v) && <span className={styles.optionHint}>{moduleConcept(v)!.description}</span>}
                  {counts?.[v] ? <span className={`mono ${styles.optionCount}`}>{counts[v]}</span> : null}
                </button>
              </li>
            ))}
          </ul>
          {preview && (
            <div className={styles.preview}>
              <ModuleStatCard id={preview} quality={quality} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
