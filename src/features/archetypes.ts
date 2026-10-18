/**
 * Архетипы «кто ты в Зоне», уровни карточки и подписи характеристик — без "use client":
 * нужны и странице, и картинкам-превью (сервер).
 */

export type Archetype = "kamikaze" | "tourist" | "allrounder" | "pvp" | "stormer" | "sniper" | "survivor" | "hunter" | "veteran";

export type Tier = "bronze" | "silver" | "gold" | "neon";

export type Attribute = "pvp" | "shooting" | "accuracy" | "survival" | "mutants" | "experience";

export const ATTRIBUTES: Attribute[] = ["pvp", "shooting", "accuracy", "survival", "mutants", "experience"];

interface ArchetypeMeta {
  emoji: string;
  ru: string;
  en: string;
  textRu: string;
  textEn: string;
  /** цвет значка */
  color: string;
}

export const ARCHETYPES: Record<Archetype, ArchetypeMeta> = {
  kamikaze: {
    emoji: "💣",
    ru: "Камикадзе",
    en: "Kamikaze",
    textRu: "Лезет в самое пекло: часто умирает, но и забирает многих с собой.",
    textEn: "Charges into the thick of it: dies often, but takes plenty down too.",
    color: "#ff6b4a",
  },
  tourist: {
    emoji: "🎒",
    ru: "Турист",
    en: "Tourist",
    textRu: "Много часов в Зоне, а стреляет редко: гуляет, собирает, любуется видами.",
    textEn: "Lots of hours in the Zone, few shots fired: wanders, loots, enjoys the view.",
    color: "#e8d36a",
  },
  allrounder: {
    emoji: "🧭",
    ru: "Универсал",
    en: "All-rounder",
    textRu: "Всё на уровне: и в бою, и на выживании, и с мутантами.",
    textEn: "Solid at everything: combat, survival and mutants.",
    color: "#9b8cff",
  },
  pvp: {
    emoji: "⚔️",
    ru: "ПвП-машина",
    en: "PvP machine",
    textRu: "Живёт ради перестрелок с игроками - и выходит из них живым.",
    textEn: "Lives for player fights - and walks away alive.",
    color: "#ff5a52",
  },
  stormer: {
    emoji: "💥",
    ru: "Штурмовик",
    en: "Stormer",
    textRu: "Много урона и длинные серии: врывается первым.",
    textEn: "Huge damage and long streaks: first one through the door.",
    color: "#ffb547",
  },
  sniper: {
    emoji: "🎯",
    ru: "Снайпер",
    en: "Sniper",
    textRu: "Меткость и выстрелы в голову - главное оружие.",
    textEn: "Accuracy and headshots are the weapon of choice.",
    color: "#3ee0d0",
  },
  survivor: {
    emoji: "🛡️",
    ru: "Выживальщик",
    en: "Survivor",
    textRu: "Умирает реже всех: осторожен и терпелив.",
    textEn: "Dies less than anyone: careful and patient.",
    color: "#5fd36f",
  },
  hunter: {
    emoji: "🐺",
    ru: "Охотник на мутантов",
    en: "Mutant hunter",
    textRu: "Мутанты Зоны знают его в лицо.",
    textEn: "The Zone's mutants know this face.",
    color: "#c08bff",
  },
  veteran: {
    emoji: "🎖️",
    ru: "Ветеран",
    en: "Veteran",
    textRu: "Провёл в Зоне больше времени, чем почти кто-либо.",
    textEn: "Has spent more time in the Zone than almost anyone.",
    color: "#53a7ff",
  },
};

export const archetypeLabel = (a: Archetype, lang: "ru" | "en") => (lang === "en" ? ARCHETYPES[a].en : ARCHETYPES[a].ru);
export const archetypeText = (a: Archetype, lang: "ru" | "en") => (lang === "en" ? ARCHETYPES[a].textEn : ARCHETYPES[a].textRu);

/** Короткие подписи характеристик, как на карточке FIFA. */
export const ATTRIBUTE_SHORT: Record<Attribute, { ru: string; en: string; nameRu: string; nameEn: string }> = {
  pvp: { ru: "ПВП", en: "PVP", nameRu: "ПвП: K/D и убийства", nameEn: "PvP: K/D and kills" },
  shooting: { ru: "СТР", en: "SHO", nameRu: "Стрельба: урон и серии", nameEn: "Shooting: damage and streaks" },
  accuracy: { ru: "ТОЧ", en: "ACC", nameRu: "Точность и хедшоты", nameEn: "Accuracy and headshots" },
  survival: { ru: "ВЫЖ", en: "SUR", nameRu: "Выживание: часов на смерть", nameEn: "Survival: hours per death" },
  mutants: { ru: "МУТ", en: "MUT", nameRu: "Мутанты", nameEn: "Mutants" },
  experience: { ru: "ОПТ", en: "EXP", nameRu: "Опыт: часы в игре", nameEn: "Experience: hours played" },
};

/** Цвета карточки по уровню: фон-градиент, рамка, текст. */
export const TIERS: Record<Tier, { from: string; to: string; edge: string; text: string; glow: string }> = {
  bronze: { from: "#5a3a22", to: "#2a1a10", edge: "#c98b52", text: "#ffd9b0", glow: "#c98b52" },
  silver: { from: "#4a5058", to: "#1e2226", edge: "#c9d2dc", text: "#eef3f8", glow: "#b8c4d0" },
  gold: { from: "#6b5214", to: "#2a1f06", edge: "#f2c84b", text: "#fff1c2", glow: "#f2c84b" },
  neon: { from: "#1d3a12", to: "#07140a", edge: "#d4ff3a", text: "#f4ffd0", glow: "#d4ff3a" },
};
