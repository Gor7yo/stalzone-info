import type { Additional } from "./auction";

/**
 * Ключевая характеристика оружейного модуля — последняя в названии, в кавычках («Снайпер»).
 * В лоте EXBO — атрибут additional.attributes с type 2 (без type — приставка, type 1 — суффикс).
 * Цена модуля определяется ей и качеством, поэтому лоты, сделки и флипы считаются по ним отдельно.
 *
 * Русских названий в базе EXBO нет — заполняются вручную (id из EXBO → название в игре).
 * Нет в справочнике — показываем id «как есть».
 */
export const MODULE_STATS: Record<string, string> = {
  // marksman: "Снайпер",
};

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
export const variantName = (id: string) => MODULE_STATS[id] ?? id.replace(/_(aff|op)$/, "").replace(/_/g, " ");

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
