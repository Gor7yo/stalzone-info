import type { BarterIndex } from "./barter";
import type { Item, ItemIndex } from "./items";

/**
 * Древо бартера, как в игре: предметы одной категории, связанные улучшениями
 * (M1A → M1A FA → Mk 14 EBR). Колонка = глубина в цепочке, строка — раскладка
 * «дерева»: лист за листом, родитель по центру своих детей.
 */

export interface TreeNode {
  id: string;
  item?: Item;
  col: number;
  row: number;
  /** предмет из другой категории, от которого идёт ветка (АКМ «Тишина» → ВСС) */
  ghost?: boolean;
  /** минимальный уровень репутации среди рецептов */
  level?: number;
}

export interface BarterTree {
  nodes: TreeNode[];
  edges: [from: string, to: string][];
  cols: number;
  rows: number;
}

/** Категории, где есть хотя бы одно улучшение «предмет → предмет той же категории». */
export function treeCategories(barter: BarterIndex, index: ItemIndex) {
  const count = new Map<string, number>();
  for (const [result, recipes] of barter.byResult) {
    const cat = index.byId.get(result)?.category;
    if (!cat) continue;
    const linked = recipes.some((r) => r.offers.some((o) => o.items.some((i) => index.byId.get(i.id)?.category === cat)));
    if (linked) count.set(cat, (count.get(cat) ?? 0) + 1);
  }
  return [...count].filter(([, n]) => n >= 2).map(([cat]) => cat);
}

export function buildTree(barter: BarterIndex, index: ItemIndex, category: string): BarterTree {
  const group = category.split("/")[0];
  const members = new Set<string>();
  for (const id of barter.byResult.keys()) if (index.byId.get(id)?.category === category) members.add(id);

  // родители: ингредиенты той же категории; если таких нет — бартерный предмет той же группы (ghost)
  const parents = new Map<string, string[]>();
  const ghosts = new Set<string>();
  const level = new Map<string, number>();
  for (const id of members) {
    const recipes = barter.byResult.get(id) ?? [];
    level.set(id, Math.min(...recipes.map((r) => r.level)));
    const ingredients = new Set(recipes.flatMap((r) => r.offers.flatMap((o) => o.items.map((i) => i.id))));
    let ps = [...ingredients].filter((i) => index.byId.get(i)?.category === category);
    if (!ps.length) {
      ps = [...ingredients].filter((i) => index.byId.get(i)?.group === group && barter.byResult.has(i));
      ps.forEach((p) => ghosts.add(p));
    }
    parents.set(id, ps);
  }
  // и предметы категории, которые сами не бартерятся, но открывают ветку (Карабин Мосина)
  for (const ps of parents.values()) for (const p of ps) if (!ghosts.has(p)) members.add(p);

  const all = new Set([...members, ...ghosts]);
  const children = new Map<string, string[]>();
  const edges: [string, string][] = [];
  for (const [id, ps] of parents)
    for (const p of ps) {
      edges.push([p, id]);
      children.set(p, [...(children.get(p) ?? []), id]);
    }

  // колонка — длина самого длинного пути от корня
  const col = new Map<string, number>();
  const depth = (id: string, seen = new Set<string>()): number => {
    const known = col.get(id);
    if (known != null) return known;
    if (seen.has(id)) return 0;
    seen.add(id);
    const ps = parents.get(id) ?? [];
    const d = ps.length ? Math.max(...ps.map((p) => depth(p, seen) + 1)) : 0;
    col.set(id, d);
    return d;
  };
  all.forEach((id) => depth(id));

  // строки: обход в глубину от корней, лист получает следующую строку, родитель — середину детей
  const name = (id: string) => index.byId.get(id)?.name ?? id;
  const byLevel = (a: string, b: string) => (level.get(a) ?? 0) - (level.get(b) ?? 0) || name(a).localeCompare(name(b), "ru");
  const row = new Map<string, number>();
  let next = 0;
  const place = (id: string): number => {
    const known = row.get(id);
    if (known != null) return known;
    row.set(id, -1); // защита от циклов
    const kids = (children.get(id) ?? []).filter((k) => !row.has(k)).sort(byLevel);
    const placed = kids.map(place).filter((r) => r >= 0);
    const r = placed.length ? (Math.min(...placed) + Math.max(...placed)) / 2 : next++;
    row.set(id, r);
    return r;
  };
  const roots = [...all].filter((id) => !(parents.get(id) ?? []).length).sort(byLevel);
  roots.forEach(place);
  all.forEach((id) => place(id));

  const nodes = [...all].map((id) => ({
    id,
    item: index.byId.get(id),
    col: col.get(id) ?? 0,
    row: row.get(id) ?? 0,
    ghost: ghosts.has(id) || undefined,
    level: level.get(id),
  }));
  return {
    nodes,
    edges,
    cols: Math.max(0, ...nodes.map((n) => n.col)) + 1,
    rows: next,
  };
}
