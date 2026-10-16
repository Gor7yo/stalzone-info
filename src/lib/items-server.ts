import barter from "../../public/barter.json";
import data from "../../public/items.json";
import { GROUPS, groupOf } from "@/features/catalog";

/**
 * Справочник предметов на сервере — для заголовков страниц, страниц категорий и sitemap.
 * JSON импортируется в бандл, а не читается из public: на Vercel файлов public у функции может не быть.
 */
export interface ServerItem {
  id: string;
  name: string;
  /** английское название - для интерфейса на en (SEO-метаданные берут name) */
  nameEn: string;
  category: string;
  group: string;
}

type Row = [string, string, string, number, number];

const items: ServerItem[] = (data.items as Row[]).map(([id, name, nameEn, , cat]) => {
  const category = data.categories[cat] ?? "";
  return { id, name, nameEn: nameEn || name, category, group: groupOf(category) };
});
const byId = new Map(items.map((i) => [i.id, i]));
const farm = new Set(barter.farm as string[]);

export const serverItem = (id: string) => byId.get(id);

/**
 * Предметы со страницей рынка для поисковиков: без фармовых ресурсов (их нет на аукционе)
 * и без «other» — мебели и оборудования убежища.
 */
const market = items.filter((i) => !farm.has(i.id) && i.group !== "other");
export const marketItems = () => market;

/** Категории со страницей (`/auction/c/[group]`): у которых есть предметы на рынке. */
export const marketGroups = () =>
  GROUPS.filter((g) => g.id !== "other")
    .map((g) => ({ ...g, items: market.filter((i) => i.group === g.id).sort((a, b) => a.name.localeCompare(b.name, "ru")) }))
    .filter((g) => g.items.length > 0);

export const marketGroup = (id: string) => marketGroups().find((g) => g.id === id);

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.stalzone-info.ru";

/**
 * Лучшая цена за штуку и число лотов на RU — для описания страницы в поиске.
 * cached=true: только снимок из БД бэкенда — роботы, обходящие тысячи страниц, не тратят квоту EXBO.
 * Кеш 10 минут; нет снимка или не ответили за 2 с — без цены (страница от этого не ломается).
 */
export async function serverBestPrice(id: string): Promise<{ price: number | null; total: number } | null> {
  try {
    const url = `${API_URL}/api/auction/lots?region=ru&item=${encodeURIComponent(id)}&limit=200&offset=0&sort=buyout_price&order=asc&cached=true`;
    const res = await fetch(url, { next: { revalidate: 600 }, signal: AbortSignal.timeout(2000) });
    if (!res.ok) return null;
    const body = (await res.json()) as { total: number; lots: { amount: number; buyoutPrice: number }[] };
    const prices = body.lots.map((l) => (l.buyoutPrice > 0 ? l.buyoutPrice / Math.max(1, l.amount) : 0)).filter((p) => p > 0);
    return { price: prices.length ? Math.min(...prices) : null, total: body.total };
  } catch {
    return null;
  }
}
