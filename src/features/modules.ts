import type { Additional } from "./auction";
import { MODULE_CONCEPTS } from "./module-concepts";

/**
 * Ключевая характеристика оружейного модуля — последняя в названии, в кавычках («Снайпер»).
 * В лоте EXBO — атрибут additional.attributes с type 2 (без type — приставка, type 1 — суффикс).
 * Цена модуля определяется ей и качеством, поэтому лоты, сделки и флипы считаются по ним отдельно.
 *
 * Названий и эффектов в базе EXBO нет — справочник в module-concepts.ts.
 * Нет в справочнике (новая характеристика) — показываем id без служебного хвоста.
 */
export interface ModuleEffect {
  /** «Отдача»; у особых эффектов может быть пустым */
  label: string;
  /** эффект в плюс (зелёный) или в минус (красный) */
  good: boolean;
  /** значение, % — при 0 очков качества */
  min: number;
  /** значение, % — при MAX_POINTS очков качества */
  max: number;
  /** особый эффект: «Урон увеличивается на {bonus}%…» */
  text?: string;
}

export interface ModuleConcept {
  name: string;
  description: string;
  effects: ModuleEffect[];
}

export const moduleConcept = (id: string): ModuleConcept | undefined => MODULE_CONCEPTS[id];

/**
 * Качество модуля в игре — очки 0…200, ранг (additional.qlt) — ступень по порогам ниже.
 * Эффект растёт линейно: min при 0 очков, max при 190. Точных очков в лоте нет,
 * поэтому для ранга показываем диапазон от его порога до порога следующего.
 */
const QUALITY_POINTS = [0, 18.72, 40.25, 64.58, 91.72, 121.67, 154.43];
const MAX_POINTS = 190;

const valueAt = (e: ModuleEffect, points: number) => e.min + ((e.max - e.min) * points) / MAX_POINTS;

/** Диапазон эффекта для ранга качества (0–5); null — для любого качества (Обычный…Легендарный). */
export function effectRange(e: ModuleEffect, quality: number | null): [number, number] {
  const from = quality === null ? 0 : (QUALITY_POINTS[quality] ?? 0);
  const to = quality === null ? QUALITY_POINTS[5] : (QUALITY_POINTS[quality + 1] ?? MAX_POINTS);
  return [valueAt(e, from), valueAt(e, to)];
}

const pct = (n: number, sign = true) => {
  const digits = Math.abs(n) < 1 ? 2 : 1;
  const s = Math.abs(n).toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return sign ? `${n < 0 ? "−" : "+"}${s}` : s;
};

/** «+6,2…+8,4%» или текст особого эффекта с подставленным диапазоном. */
export function effectText(e: ModuleEffect, quality: number | null): string {
  const [a, b] = effectRange(e, quality);
  if (e.text) return e.text.replaceAll("{bonus}", `${pct(a, false)}…${pct(b, false)}`);
  return `${pct(a)}…${pct(b)}%`;
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
export const variantName = (id: string) => MODULE_CONCEPTS[id]?.name ?? id.replace(/_(aff|op)$/, "").replace(/_/g, " ");

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
