"use client";

import { useQuery } from "@tanstack/react-query";
import { useLang } from "@/i18n/client";
import { api } from "@/lib/api";
import { pick, type Lang } from "@/i18n/lang";
import { DATA_VERSION } from "@/lib/dataVersion";

/**
 * Индекс предметов из официальной базы EXBO (public/items.json, ~47 КБ gzip).
 * Грузится лениво один раз и живёт в кеше всю сессию.
 */

export type Rarity = "RANK_NEWBIE" | "RANK_STALKER" | "RANK_VETERAN" | "RANK_MASTER" | "RANK_LEGEND" | "QUEST_ITEM" | "DEFAULT";

export const RARITY: Record<string, { label: string; labelEn: string; color: string }> = {
  RANK_NEWBIE: { label: "Отмычка", labelEn: "Newbie", color: "#7ee081" },
  RANK_STALKER: { label: "Сталкер", labelEn: "Stalker", color: "#5aa9ff" },
  RANK_VETERAN: { label: "Ветеран", labelEn: "Veteran", color: "#b47cff" },
  RANK_MASTER: { label: "Мастер", labelEn: "Master", color: "#ff5b79" },
  RANK_LEGEND: { label: "Легенда", labelEn: "Legend", color: "#ffc94a" },
  QUEST_ITEM: { label: "Квестовый", labelEn: "Quest", color: "#48d6c8" },
  DEFAULT: { label: "Обычный", labelEn: "Common", color: "#a3a8a0" },
};

export const rarityOf = (r: string) => RARITY[r] ?? RARITY.DEFAULT;

export const rarityLabel = (r: string, lang: Lang) => pick(lang, rarityOf(r).label, rarityOf(r).labelEn);

export interface Item {
  id: string;
  /** название на языке интерфейса (useItems подменяет на английское) */
  name: string;
  /** русское название - для SEO и подписи-перевода под заголовком */
  nameRu: string;
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

// категории и иконка — в catalog.ts (без "use client", нужны и серверу)
export { categoryLabel, groupLabel, GROUPS, iconUrl } from "./catalog";

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
const fixLayout = (s: string) => [...s.toLowerCase()].map((c) => layoutMap.get(c) ?? c).join("");

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
          nameRu: name,
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

/** Тот же индекс с английскими названиями (поиск понимает оба языка, но английский - первым). */
const englishIndex = new WeakMap<ItemIndex, ItemIndex>();
function toEnglish(index: ItemIndex): ItemIndex {
  let en = englishIndex.get(index);
  if (!en) {
    const list = index.list.map((i): Item => {
      const name = i.nameEn || i.nameRu;
      return { ...i, name, haystack: `${normalize(name)} | ${normalize(i.nameRu)} | ${i.id}` };
    });
    en = { list, byId: new Map(list.map((i) => [i.id, i])) };
    englishIndex.set(index, en);
  }
  return en;
}

export const useItems = (enabled = true) => {
  const lang = useLang();
  return useQuery({
    queryKey: ["items-index"],
    queryFn: loadItems,
    select: lang === "en" ? toEnglish : undefined,
    staleTime: Infinity,
    gcTime: Infinity,
    enabled,
  });
};

/**
 * Предметы, которые за 30 дней были на аукционе (бэкенд обходит справочник раз в сутки) -
 * рынок показывает только их. null - бэкенд ещё не обошёл справочник: не фильтруем.
 */
export const useActiveItems = () =>
  useQuery({
    queryKey: ["market-active"],
    queryFn: () => api<{ ready: boolean; items: string[] }>("/api/market/active"),
    select: (d) => (d.ready ? new Set(d.items) : null),
    staleTime: 3_600_000,
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

/**
 * Подходит ли предмет под запрос - для фильтра списков (лента флипов): совпадение в названии,
 * в том числе в неправильной раскладке, без нечёткого «по буквам» (score подпоследовательности < 50).
 * Пустой запрос - null, фильтр не нужен.
 */
export function itemMatcher(query: string): ((item: Item) => boolean) | null {
  const q = normalize(query);
  if (!q) return null;
  const alt = normalize(fixLayout(query));
  return (item) => score(item, q) > 60 || (alt !== q && score(item, alt) > 60);
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
