"use client";

import { useQuery } from "@tanstack/react-query";
import { DATA_VERSION } from "@/lib/dataVersion";

/**
 * Индекс предметов из официальной базы EXBO (public/items.json, ~47 КБ gzip).
 * Грузится лениво один раз и живёт в кеше всю сессию.
 */

const DB = "https://raw.githubusercontent.com/EXBO-Studio/stalcraft-database/main/ru";

export type Rarity =
  | "RANK_NEWBIE"
  | "RANK_STALKER"
  | "RANK_VETERAN"
  | "RANK_MASTER"
  | "RANK_LEGEND"
  | "QUEST_ITEM"
  | "DEFAULT";

export const RARITY: Record<string, { label: string; color: string }> = {
  RANK_NEWBIE: { label: "Отмычка", color: "#7ee081" },
  RANK_STALKER: { label: "Сталкер", color: "#5aa9ff" },
  RANK_VETERAN: { label: "Ветеран", color: "#b47cff" },
  RANK_MASTER: { label: "Мастер", color: "#ff5b79" },
  RANK_LEGEND: { label: "Легенда", color: "#ffc94a" },
  QUEST_ITEM: { label: "Квестовый", color: "#48d6c8" },
  DEFAULT: { label: "Обычный", color: "#a3a8a0" },
};

export const rarityOf = (r: string) => RARITY[r] ?? RARITY.DEFAULT;

export interface Item {
  id: string;
  name: string;
  nameEn: string;
  rarity: Rarity;
  category: string;
  group: string;
  /** нормализованная строка для поиска */
  haystack: string;
}

export interface ItemIndex {
  list: Item[];
  byId: Map<string, Item>;
}

/** Группы для фильтра на рынке (порядок = порядок чипов). */
export const GROUPS: { id: string; label: string; icon: string }[] = [
  { id: "artefact", label: "Артефакты", icon: "✺" },
  { id: "weapon", label: "Оружие", icon: "⌖" },
  { id: "armor", label: "Броня", icon: "⛉" },
  { id: "attachment", label: "Обвесы", icon: "⚙" },
  { id: "weapon_modules", label: "Модули", icon: "⬡" },
  { id: "bullet", label: "Патроны", icon: "⁝" },
  { id: "containers", label: "Контейнеры", icon: "▣" },
  { id: "backpacks", label: "Рюкзаки", icon: "◫" },
  { id: "supply", label: "Расходники", icon: "✚" },
  { id: "grenade", label: "Гранаты", icon: "◉" },
  { id: "misc", label: "Разное", icon: "◇" },
  { id: "other", label: "Прочее", icon: "···" },
];

const SUBCATEGORY: Record<string, string> = {
  "artefact/electrophysical": "Электрофизический артефакт",
  "artefact/thermal": "Термический артефакт",
  "artefact/gravity": "Гравитационный артефакт",
  "artefact/biochemical": "Биохимический артефакт",
  "artefact/other_arts": "Артефакт",
  "weapon/assault_rifle": "Штурмовая винтовка",
  "weapon/submachine_gun": "Пистолет-пулемёт",
  "weapon/machine_gun": "Пулемёт",
  "weapon/sniper_rifle": "Снайперская винтовка",
  "weapon/shotgun_rifle": "Дробовик",
  "weapon/pistol": "Пистолет",
  "weapon/heavy": "Тяжёлое оружие",
  "weapon/melee": "Холодное оружие",
  "weapon/device": "Устройство",
  "weapon_modules/weapon_module": "Оружейный модуль",
  "weapon_modules/weapon_module_core": "Ядро модуля",
  "weapon_modules/weapon_module_remover": "Демонтаж модуля",
  "armor/combat": "Боевая броня",
  "armor/combined": "Комбинированная броня",
  "armor/scientist": "Научная броня",
  "armor/clothes": "Одежда",
  "armor/device": "Устройство",
  "attachment/barrel": "Дульное устройство",
  "attachment/collimator_sights": "Прицел",
  "attachment/mag": "Магазин",
  "attachment/forend": "Цевьё",
  "attachment/handgrips": "Рукоять",
  "attachment/pistol_handle": "Пистолетная рукоять",
  "attachment/accessory": "Аксессуар",
  "supply/medicine": "Медицина",
  "supply/food": "Еда",
  "supply/drink": "Напиток",
  bullet: "Патроны",
  containers: "Контейнер",
  backpacks: "Рюкзак",
  grenade: "Граната",
  misc: "Разное",
};

export const categoryLabel = (category: string) =>
  SUBCATEGORY[category] ??
  GROUPS.find((g) => g.id === category.split("/")[0])?.label ??
  "Предмет";

export const iconUrl = (item: Pick<Item, "id" | "category">) =>
  `${DB}/icons/${item.category}/${item.id}.png`;

// ---------- нормализация и «неправильная раскладка» ----------

const EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`";
const RU = "йцукенгшщзхъфывапролджэячсмитьбюё";
const layoutMap = new Map([...EN].map((c, i) => [c, RU[i]]));

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»"'“”„()\-–—_.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** «fhntafrn» → «артефакт»: юзер забыл переключить раскладку */
const fixLayout = (s: string) =>
  [...s.toLowerCase()].map((c) => layoutMap.get(c) ?? c).join("");

// ---------- загрузка ----------

interface RawIndex {
  colors: string[];
  categories: string[];
  items: [string, string, string, number, number][];
}

let pending: Promise<ItemIndex> | null = null;

export function loadItems(): Promise<ItemIndex> {
  pending ??= fetch(`/items.json?v=${DATA_VERSION}`)
    .then((r) => {
      if (!r.ok) throw new Error("items.json");
      return r.json() as Promise<RawIndex>;
    })
    .then(({ colors, categories, items }) => {
      const list = items.map(([id, name, nameEn, c, cat]): Item => {
        const category = categories[cat];
        return {
          id,
          name,
          nameEn,
          rarity: colors[c] as Rarity,
          category,
          group: category.split("/")[0],
          haystack: `${normalize(name)} | ${normalize(nameEn)} | ${id}`,
        };
      });
      return { list, byId: new Map(list.map((i) => [i.id, i])) };
    })
    .catch((error) => {
      pending = null;
      throw error;
    });
  return pending;
}

export const useItems = (enabled = true) =>
  useQuery({
    queryKey: ["items-index"],
    queryFn: loadItems,
    staleTime: Infinity,
    gcTime: Infinity,
    enabled,
  });

export function useItem(id: string) {
  const { data, ...rest } = useItems();
  return { item: data?.byId.get(id), ...rest };
}

// ---------- поиск ----------

function score(item: Item, q: string): number {
  if (item.id === q) return 1000;
  const name = item.haystack.slice(0, item.haystack.indexOf(" | "));
  if (name === q) return 900;
  if (name.startsWith(q)) return 700 - name.length;
  if (name.includes(` ${q}`)) return 500 - name.length;
  const at = item.haystack.indexOf(q);
  if (at !== -1) return 300 - at;

  // нечёткое совпадение: все слова запроса встречаются в названии
  const words = q.split(" ");
  if (words.length > 1 && words.every((w) => item.haystack.includes(w))) return 200;

  // подпоследовательность символов («кмн» → «Комета Новая»)
  if (q.length >= 3) {
    let i = 0;
    for (const ch of name) if (ch === q[i]) i++;
    if (i === q.length) return 50 - name.length / 10;
  }
  return 0;
}

export function searchItems(index: ItemIndex, query: string, group?: string, limit = 40): Item[] {
  const q = normalize(query);
  const pool = group ? index.list.filter((i) => i.group === group) : index.list;
  if (!q) return pool.slice(0, limit);

  const alt = normalize(fixLayout(query));
  const results: [Item, number][] = [];

  for (const item of pool) {
    const s = Math.max(score(item, q), alt !== q ? score(item, alt) * 0.95 : 0);
    if (s > 0) results.push([item, s]);
  }

  return results
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([item]) => item);
}
