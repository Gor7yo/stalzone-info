import type { Additional } from "./auction";
import { MODULE_ATTRS } from "./module-attrs";

/**
 * Оружейный модуль — три атрибута в additional.attributes, как в названии в игре
 * («Устойчивый Нестабильный «Снайпер»»):
 * - без type — приставка (pre), небольшой баф;
 * - type 1 — суффикс (suf), дебаф;
 * - type 2 — ключевая характеристика (key), уникальный баф. От неё сильнее всего зависит цена,
 *   поэтому лоты, сделки и флипы считаются по ней отдельно (variant).
 *
 * Названий и эффектов в базе EXBO нет — справочник в module-attrs.ts.
 * Нет в справочнике (новый id) — показываем id без служебного хвоста.
 */
export type ModuleSlot = "pre" | "suf" | "key";

export interface ModuleEffect {
  /** «Отдача»; у особых эффектов может быть пустым */
  label: string;
  /** эффект в плюс (зелёный) или в минус (красный) */
  good: boolean;
  /** значение, % — при 0% качества атрибута */
  min: number;
  /** значение, % — при MAX_PERCENT */
  max: number;
  /** особый эффект: «Урон увеличивается на {bonus}%…» */
  text?: string;
}

export interface ModuleAttrInfo {
  name: string;
  slot: ModuleSlot;
  effects: ModuleEffect[];
}

export const moduleAttr = (id: string): ModuleAttrInfo | undefined => MODULE_ATTRS[id];

/**
 * У каждого атрибута свой процент качества (в игре — «91,72%»): ранг attributes[].quality задаёт
 * ступень по порогам ниже, statsRandom — место внутри неё: процент = порог + ширина × (0,5 + r/4),
 * не выходя за ступень. Сверено с игрой: Особый, r = −0,128 → 51,63%; r = 1,70 → 62,75%;
 * Редкий, r = 2,41 → упирается в 91,72%.
 * Эффект растёт с процентом линейно: min при 0%, max при 190%.
 */
const QUALITY_PERCENT = [0, 18.72, 40.25, 64.58, 91.72, 121.67, 154.43, 190];
const MAX_PERCENT = 190;

export function attrPercent(quality: number, statsRandom: number): number {
  const q = Math.max(0, Math.min(QUALITY_PERCENT.length - 2, quality));
  const from = QUALITY_PERCENT[q];
  const to = QUALITY_PERCENT[q + 1];
  return Math.max(from, Math.min(to, from + (to - from) * (0.5 + statsRandom / 4)));
}

const valueAt = (e: ModuleEffect, percent: number) => e.min + ((e.max - e.min) * percent) / MAX_PERCENT;

const pct = (n: number, sign = true) => {
  const digits = Math.abs(n) < 1 ? 2 : 1;
  const s = Math.abs(n).toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return sign ? `${n < 0 ? "−" : "+"}${s}` : s;
};

export const formatPercent = (p: number) => `${p.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

/**
 * Значение эффекта: при известном проценте качества — точное («−4,95%»),
 * иначе — диапазон ранга качества («+12,5…+15,1%»; null — по всем рангам).
 */
export function effectText(e: ModuleEffect, at: { percent: number } | { quality: number | null }): string {
  let a: number, b: number;
  if ("percent" in at) {
    a = b = valueAt(e, at.percent);
  } else {
    const q = at.quality;
    a = valueAt(e, q === null ? 0 : (QUALITY_PERCENT[q] ?? 0));
    b = valueAt(e, q === null ? QUALITY_PERCENT[6] : (QUALITY_PERCENT[q + 1] ?? MAX_PERCENT));
  }
  const one = Math.abs(a - b) < 1e-9;
  if (e.text) return e.text.replaceAll("{bonus}", one ? pct(a, false) : `${pct(a, false)}…${pct(b, false)}`);
  return one ? `${pct(a)}%` : `${pct(a)}…${pct(b)}%`;
}

/** Атрибут конкретного модуля из лота: процент — если в лоте есть statsRandom. */
export interface ModuleAttr {
  id: string;
  slot: ModuleSlot;
  quality: number;
  percent: number | null;
}

const SLOT_ORDER: ModuleSlot[] = ["pre", "suf", "key"];

/** Атрибуты модуля по порядку названия: приставка, суффикс, ключевая. Не модуль — []. */
export function moduleAttrs(additional?: Additional): ModuleAttr[] {
  const attributes = additional?.attributes;
  if (!Array.isArray(attributes)) return [];
  const out: ModuleAttr[] = [];
  for (const a of attributes as unknown[]) {
    if (!a || typeof a !== "object") continue;
    const { type, definitionId, quality, statsRandom } = a as Record<string, unknown>;
    if (typeof definitionId !== "string" || !ID_RE.test(definitionId)) continue;
    const slot: ModuleSlot = type === 2 ? "key" : type === 1 ? "suf" : "pre";
    const q = typeof quality === "number" ? quality : 0;
    out.push({
      id: definitionId,
      slot,
      quality: q,
      percent: typeof statsRandom === "number" && Number.isFinite(statsRandom) ? attrPercent(q, statsRandom) : null,
    });
  }
  return out.sort((x, y) => SLOT_ORDER.indexOf(x.slot) - SLOT_ORDER.indexOf(y.slot));
}

const ID_RE = /^[a-z0-9_]{1,64}$/;

/** Ключевая характеристика лота/сделки; "" — у предмета её нет. */
export function variantOf(additional?: Additional): string {
  const attributes = additional?.attributes;
  if (!Array.isArray(attributes)) return "";
  for (const a of attributes as unknown[]) {
    if (!a || typeof a !== "object") continue;
    const { type, definitionId } = a as { type?: unknown; definitionId?: unknown };
    if (type === 2 && typeof definitionId === "string" && ID_RE.test(definitionId)) return definitionId;
  }
  return "";
}

/** Название характеристики для показа: из справочника или id без служебного хвоста («hip_spread_aff» → «hip spread»). */
export const variantName = (id: string) => MODULE_ATTRS[id]?.name ?? id.replace(/_(aff|op|pre|suf)$/, "").replace(/_/g, " ");

/** «Снайпер» — в кавычках, как в игре */
export const variantLabel = (id: string) => `«${variantName(id)}»`;

/** Характеристики, которые встречаются в лотах и сделках, — самые частые первыми. */
export function variantsOf(...lists: { additional?: Additional }[][]): string[] {
  const count = new Map<string, number>();
  for (const list of lists) {
    for (const x of list) {
      const v = variantOf(x.additional);
      if (v) count.set(v, (count.get(v) ?? 0) + 1);
    }
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
}
