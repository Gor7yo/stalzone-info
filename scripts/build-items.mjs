// Собирает компактные справочники из официальной базы EXBO
// (github.com/EXBO-Studio/stalcraft-database):
//   public/items.json — предметы (поиск, иконки, редкость)
//   public/meta.json  — названия статистик и достижений
//   public/barter.json — рецепты бартера, фармовые ресурсы, пересоздание (scripts/packs.mjs)
// Запуск: npm run items
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { PACKS } from "./packs.mjs";

const DB = "https://raw.githubusercontent.com/EXBO-Studio/stalcraft-database/main/ru";

async function load(file) {
  const res = await fetch(`${DB}/${file}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return res.json();
}

const [listing, stats, achievements, barter] = await Promise.all([
  load("listing.json"),
  load("stats.json"),
  load("achievements.json"),
  load("barter_recipes.json"),
]);

const ru = (t) => t?.lines?.ru ?? t?.lines?.en ?? t?.text ?? "";

const colors = [];
const categories = [];
const indexOf = (list, value) => {
  let i = list.indexOf(value);
  if (i === -1) i = list.push(value) - 1;
  return i;
};

// [id, ru, en, colorIdx, categoryIdx]
const items = listing.map((entry) => {
  const parts = entry.data.replace(/^\/items\//, "").replace(/\.json$/, "").split("/");
  const id = parts.pop();
  return [
    id,
    entry.name.lines.ru ?? entry.name.lines.en,
    entry.name.lines.en ?? "",
    indexOf(colors, entry.color),
    indexOf(categories, parts.join("/")),
  ];
});

await writeFile(
  new URL("../public/items.json", import.meta.url),
  JSON.stringify({ colors, categories, items }),
);

// stats: id → [название, категория, тип]; achievements: id → [название, описание, очки]
const meta = {
  stats: Object.fromEntries(
    stats.filter((x) => ru(x.name)).map((x) => [x.id, [ru(x.name), x.category, x.type]]),
  ),
  achievements: Object.fromEntries(
    achievements.map((x) => [x.id, [ru(x.title), ru(x.description), x.points ?? 0]]),
  ),
};

await writeFile(new URL("../public/meta.json", import.meta.url), JSON.stringify(meta));

// settlements: [название]; recipes: [результат, поселение, уровень, [[валюта, цена, [[ингредиент, кол-во]…]]…]]
// В базе есть поселения-двойники («Бар», «Фракции Севера») с теми же рецептами — схлопываем.
const settlements = [];
const seen = new Set();
const recipes = barter.flatMap((settlement) => {
  const s = indexOf(settlements, ru(settlement.settlementTitle));
  return settlement.recipes.map((r) => [
    r.item,
    s,
    r.settlementRequiredLevel ?? 0,
    r.offers.map((o) => [o.currency, o.cost ?? 0, o.requiredItems.map((i) => [i.item, i.amount])]),
  ]);
}).filter((r) => {
  const key = JSON.stringify(r);
  return seen.has(key) ? false : (seen.add(key), true);
});

const byId = new Map(listing.map((e) => [e.data.split("/").pop().replace(".json", ""), e]));
const byName = new Map(listing.map((e) => [ru(e.name), e.data.split("/").pop().replace(".json", "")]));

// Фармовые ресурсы: привязываются при получении → на аукционе их нет
const ingredients = new Set(recipes.flatMap((r) => r[3].flatMap((o) => o[2].map(([id]) => id))));
const farm = [...ingredients].filter((id) => /_ON_GET$/.test(byId.get(id)?.status?.state ?? ""));

// Пересоздание: ресурс → [предмет с аукциона, сколько штук даёт]
const packs = {};
for (const [packName, resName, amount] of PACKS) {
  const pack = byName.get(packName);
  const res = byName.get(resName);
  if (!pack || !res) throw new Error(`packs.mjs: не найден «${pack ? resName : packName}»`);
  packs[res] = [pack, amount];
}

// Цена у скупщика («Базовая цена продажи») для фармовых ресурсов
async function buyerPrice(id) {
  const entry = byId.get(id);
  const data = await load(entry.data.slice(1));
  for (const block of data.infoBlocks ?? []) {
    for (const el of block.elements ?? []) {
      if (ru(el.name) === "Базовая цена продажи") return el.value;
    }
  }
  return null;
}
const buyer = Object.fromEntries(
  (await Promise.all(farm.map(async (id) => [id, await buyerPrice(id)]))).filter(([, p]) => p),
);

await writeFile(
  new URL("../public/barter.json", import.meta.url),
  JSON.stringify({ settlements, recipes, farm, packs, buyer }),
);

console.log(`barter: ${farm.length} фармовых ресурсов, ${Object.keys(packs).length} пересоздаются, ${Object.keys(buyer).length} с ценой скупщика`);
// Версия справочников в URL: после пересборки браузеры не возьмут старый кеш
const hash = createHash("sha1");
for (const f of ["items.json", "meta.json", "barter.json"]) hash.update(await readFile(new URL(`../public/${f}`, import.meta.url)));
await writeFile(
  new URL("../src/lib/dataVersion.ts", import.meta.url),
  `// Генерируется scripts/build-items.mjs — не редактировать вручную
export const DATA_VERSION = "${hash.digest("hex").slice(0, 10)}";
`,
);

console.log(`barter.json: ${recipes.length} рецептов в ${settlements.length} поселениях`);
console.log(`items.json: ${items.length} предметов, ${categories.length} категорий`);
console.log(`meta.json: ${Object.keys(meta.stats).length} статистик, ${Object.keys(meta.achievements).length} достижений`);
