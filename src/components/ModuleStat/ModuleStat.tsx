"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { QUALITY } from "@/features/auction";
import { effectText, formatPercent, moduleAttr, variantLabel, variantName, type ModuleAttr } from "@/features/modules";
import { haptic } from "@/lib/telegram";
import { Icon } from "../Icon";
import styles from "./ModuleStat.module.css";

function Effects({ id, at }: { id: string; at: Parameters<typeof effectText>[1] }) {
  const info = moduleAttr(id);
  if (!info) return <span className={styles.empty}>Данных пока нет</span>;
  return (
    <ul className={styles.effects}>
      {info.effects.map((e, i) => (
        <li key={i} data-good={e.good || undefined}>
          {e.text ? (
            <b>{effectText(e, at)}</b>
          ) : (
            <>
              <span>{e.label}</span>
              <b className="mono">{effectText(e, at)}</b>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

const nameOf = (a: { id: string; slot: string }) => (a.slot === "key" ? variantLabel(a.id) : variantName(a.id));

/**
 * Что даёт модуль. С атрибутами лота — все три (приставка, суффикс, ключевая) с точными процентами,
 * как в игре; без них — только ключевая характеристика с диапазоном для ранга качества (null — для любого).
 */
export function ModuleStatCard({ id, quality, attrs }: { id: string; quality: number | null; attrs?: ModuleAttr[] }) {
  if (attrs?.length) {
    return (
      <div className={styles.card}>
        {attrs.map((a) => {
          const color = QUALITY[a.quality]?.color;
          return (
            <div key={a.slot} className={styles.attr}>
              <div className={styles.cardHead} style={color ? { color } : undefined}>
                <b>{nameOf(a)}</b>
                {a.percent !== null && <span className="mono">{formatPercent(a.percent)}</span>}
              </div>
              <Effects id={a.id} at={a.percent !== null ? { percent: a.percent } : { quality: a.quality }} />
            </div>
          );
        })}
      </div>
    );
  }
  const q = quality === null ? null : QUALITY[quality];
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <b>{variantName(id)}</b>
        {q && <span style={{ color: q.color }}>{q.label}</span>}
      </div>
      <Effects id={id} at={{ quality }} />
    </div>
  );
}

interface Pos {
  left: number;
  top?: number;
  bottom?: number;
}

const POP_W = 290;
const POP_H = 150;

/** Позиция подсказки у элемента: под ним (или над, если снизу тесно), либо справа от него. */
function place(el: Element, side: "below" | "right"): Pos {
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (side === "right" && r.right + 8 + POP_W <= vw - 8) {
    return { left: r.right + 8, top: Math.max(8, Math.min(r.top, vh - POP_H - 8)) };
  }
  const left = Math.max(8, Math.min(r.left, vw - POP_W - 8));
  return r.bottom + POP_H > vh && r.top > POP_H ? { left, bottom: vh - r.top + 6 } : { left, top: r.bottom + 6 };
}

/** Подсказка «что даёт» в портале (её не обрезают прокручиваемые ряды); закрывается при прокрутке и тапе мимо. */
function useStatPopover(anchor: RefObject<HTMLElement | null>) {
  const [state, setState] = useState<{ id: string; pos: Pos } | null>(null);

  useEffect(() => {
    if (!state) return;
    const close = () => setState(null);
    const outside = (e: PointerEvent) => {
      if (!anchor.current?.contains(e.target as Node)) close();
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("pointerdown", outside);
    };
  }, [state, anchor]);

  return {
    openId: state?.id ?? null,
    show: (id: string, el: Element, side: "below" | "right" = "below") => setState({ id, pos: place(el, side) }),
    hide: () => setState(null),
    render: (quality: number | null, attrs?: ModuleAttr[]) =>
      state &&
      createPortal(
        <div role="tooltip" className={styles.pop} style={{ ...state.pos, width: POP_W }}>
          <ModuleStatCard id={state.id} quality={quality} attrs={attrs} />
        </div>,
        document.body,
      ),
  };
}

/**
 * Бейдж модуля с подсказкой: мышью — по наведению, на телефоне — по тапу, с клавиатуры — по фокусу.
 * С атрибутами лота — полное название как в игре («Устойчивый Нестабильный «Снайпер»»),
 * без них — только ключевая характеристика.
 */
export function ModuleStatBadge({
  id,
  quality,
  attrs,
  size = "sm",
}: {
  id: string;
  quality: number | null;
  attrs?: ModuleAttr[];
  /** sm — в строках лотов, md — рядом с обычными плашками (.pill) */
  size?: "sm" | "md";
}) {
  // атрибуты без названия в справочнике не показываем (английский id из EXBO ничего не скажет)
  const known = attrs?.filter((a) => moduleAttr(a.id));
  const pre = known?.find((a) => a.slot === "pre");
  const suf = known?.find((a) => a.slot === "suf");
  const key = moduleAttr(id) ? id : null;
  const ref = useRef<HTMLButtonElement>(null);
  const pointer = useRef("");
  const pop = useStatPopover(ref);
  if (!key && !pre && !suf) return null;

  return (
    <>
      <button
        ref={ref}
        type="button"
        className={styles.badge}
        data-size={size}
        aria-expanded={pop.openId !== null}
        aria-label={`${[pre?.id, suf?.id, key ?? undefined]
          .filter((x): x is string => Boolean(x))
          .map(variantName)
          .join(" ")} - что даёт`}
        onPointerDown={(e) => (pointer.current = e.pointerType)}
        onPointerEnter={(e) => e.pointerType === "mouse" && pop.show(id, e.currentTarget)}
        onPointerLeave={(e) => e.pointerType === "mouse" && pop.hide()}
        onFocus={(e) => e.currentTarget.matches(":focus-visible") && pop.show(id, e.currentTarget)}
        onBlur={pop.hide}
        onClick={(e) => {
          // бейдж бывает внутри ссылки (лента флипов) — не переходим
          e.preventDefault();
          e.stopPropagation();
          if (pointer.current === "mouse") return;
          haptic.tap();
          if (pop.openId) pop.hide();
          else pop.show(id, e.currentTarget);
        }}
      >
        {pre && <span className={styles.pre}>{variantName(pre.id)}</span>}
        {suf && <span className={styles.suf}>{variantName(suf.id)}</span>}
        {key && variantLabel(key)}
      </button>
      {pop.render(quality, known)}
    </>
  );
}

/** Выдвижное меню выбора ключевой характеристики: сетка названий, наведение — подсказка «что даёт». */
export function ModuleStatPicker({
  variants,
  counts,
  value,
  quality,
  allowAny = true,
  onChange,
}: {
  /** характеристики в лотах — самые частые первыми */
  variants: string[];
  counts?: Record<string, number>;
  value: string | null;
  /** ранг качества для цифр; null — диапазон по всем */
  quality: number | null;
  /** пункт «Любая» (в помощнике продажи характеристика обязательна) */
  allowAny?: boolean;
  onChange: (value: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const pop = useStatPopover(ref);
  // только известные характеристики; с числами — без нулевых (кроме выбранной) и по убыванию
  const shown = variants
    .filter((v) => moduleAttr(v) && (!counts || counts[v] || v === value))
    .sort((a, b) => (counts ? (counts[b] ?? 0) - (counts[a] ?? 0) : 0));

  const pick = (v: string | null) => {
    haptic.select();
    onChange(v);
    setOpen(false);
    pop.hide();
  };

  return (
    <div ref={ref} className={styles.picker} data-open={open || undefined}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        onClick={() => {
          haptic.tap();
          setOpen((o) => !o);
        }}
      >
        <span className={styles.triggerLabel}>Характеристика</span>
        <b>{value ? variantName(value) : "Любая"}</b>
        <span className={styles.chevron}>
          <Icon name="down" size={16} />
        </span>
      </button>

      {open && (
        <div className={styles.menu} role="listbox" aria-label="Ключевая характеристика модуля">
          {allowAny && (
            <button type="button" role="option" aria-selected={value === null} onClick={() => pick(null)}>
              Любая
            </button>
          )}
          {shown.map((v) => (
            <button
              key={v}
              type="button"
              role="option"
              aria-selected={value === v}
              onPointerEnter={(e) => e.pointerType === "mouse" && pop.show(v, e.currentTarget, "right")}
              onPointerLeave={(e) => e.pointerType === "mouse" && pop.hide()}
              onClick={() => pick(v)}
            >
              <span className="truncate">{variantName(v)}</span>
              {counts?.[v] ? <span className={`mono ${styles.count}`}>{counts[v]}</span> : null}
            </button>
          ))}
        </div>
      )}
      {pop.render(quality)}
    </div>
  );
}
