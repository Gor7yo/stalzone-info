import barter from "../../public/barter.json";
import data from "../../public/items.json";

/**
 * Справочник предметов на сервере — для заголовков страниц и sitemap.
 * JSON импортируется в бандл, а не читается из public: на Vercel файлов public у функции может не быть.
 */
interface ServerItem {
  id: string;
  name: string;
  category: string;
}

type Row = [string, string, string, number, number];

const items: ServerItem[] = (data.items as Row[]).map(([id, name, , , cat]) => ({ id, name, category: data.categories[cat] ?? "" }));
const byId = new Map(items.map((i) => [i.id, i]));
const farm = new Set(barter.farm as string[]);

export const serverItem = (id: string) => byId.get(id);

/**
 * Предметы со страницей рынка для поисковиков: без фармовых ресурсов (их нет на аукционе)
 * и без «other» — мебели и оборудования убежища.
 */
export const marketItems = () => items.filter((i) => !farm.has(i.id) && i.category !== "other" && !i.category.startsWith("other/"));
