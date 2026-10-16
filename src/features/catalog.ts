/**
 * Категории предметов и адрес иконки — без "use client": нужны и браузеру (features/items.ts
 * реэкспортирует), и серверу (заголовки, страницы категорий, sitemap).
 */

const DB = "https://raw.githubusercontent.com/EXBO-Studio/stalcraft-database/main/ru";

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

/** Английские подписи групп и подкатегорий (интерфейс на en; SEO-страницы остаются русскими). */
const GROUP_EN: Record<string, string> = {
  artefact: "Artefacts",
  weapon: "Weapons",
  armor: "Armor",
  attachment: "Attachments",
  weapon_modules: "Modules",
  bullet: "Ammo",
  containers: "Containers",
  backpacks: "Backpacks",
  supply: "Consumables",
  grenade: "Grenades",
  misc: "Misc",
  other: "Other",
};

const SUBCATEGORY_EN: Record<string, string> = {
  "artefact/electrophysical": "Electrophysical artefact",
  "artefact/thermal": "Thermal artefact",
  "artefact/gravity": "Gravity artefact",
  "artefact/biochemical": "Biochemical artefact",
  "artefact/other_arts": "Artefact",
  "weapon/assault_rifle": "Assault rifle",
  "weapon/submachine_gun": "Submachine gun",
  "weapon/machine_gun": "Machine gun",
  "weapon/sniper_rifle": "Sniper rifle",
  "weapon/shotgun_rifle": "Shotgun",
  "weapon/pistol": "Pistol",
  "weapon/heavy": "Heavy weapon",
  "weapon/melee": "Melee weapon",
  "weapon/device": "Device",
  "weapon_modules/weapon_module": "Weapon module",
  "weapon_modules/weapon_module_core": "Module core",
  "weapon_modules/weapon_module_remover": "Module remover",
  "armor/combat": "Combat armor",
  "armor/combined": "Combined armor",
  "armor/scientist": "Scientist armor",
  "armor/clothes": "Clothes",
  "armor/device": "Device",
  "attachment/barrel": "Muzzle device",
  "attachment/collimator_sights": "Sight",
  "attachment/mag": "Magazine",
  "attachment/forend": "Forend",
  "attachment/handgrips": "Grip",
  "attachment/pistol_handle": "Pistol grip",
  "attachment/accessory": "Accessory",
  "supply/medicine": "Medicine",
  "supply/food": "Food",
  "supply/drink": "Drink",
  bullet: "Ammo",
  containers: "Container",
  backpacks: "Backpack",
  grenade: "Grenade",
  misc: "Misc",
};

/** Подпись группы фильтра на языке интерфейса. */
export const groupLabel = (group: { id: string; label: string }, lang: "ru" | "en" = "ru") =>
  lang === "en" ? (GROUP_EN[group.id] ?? group.label) : group.label;

export const categoryLabel = (category: string, lang: "ru" | "en" = "ru") => {
  const group = GROUPS.find((g) => g.id === category.split("/")[0]);
  if (lang === "en") return SUBCATEGORY_EN[category] ?? (group ? groupLabel(group, "en") : "Item");
  return SUBCATEGORY[category] ?? group?.label ?? "Предмет";
};

export const groupOf = (category: string) => category.split("/")[0];

export const iconUrl = (item: { id: string; category: string }) => `${DB}/icons/${item.category}/${item.id}.png`;
