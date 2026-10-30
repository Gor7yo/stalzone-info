"use client";

import { useSyncExternalStore } from "react";
import type { Lang } from "@/i18n/lang";
import { isRegion, type Region } from "./regions";
import { cloud } from "./telegram";

/**
 * Глобальное состояние приложения: ~60 строк вместо MobX.
 * Сохраняется в localStorage и (внутри Telegram) в CloudStorage,
 * поэтому избранное переезжает вместе с аккаунтом на любое устройство.
 */

export { REGIONS, isRegion, type Region } from "./regions";

export interface ClanRef {
  region: Region;
  id: string;
  name: string;
  tag: string;
  alliance?: string;
}

export interface CharacterRef {
  region: Region;
  name: string;
  /** группировка и тег клана - для аватарки и тега в списках; обновляются при открытии профиля */
  alliance?: string;
  clanTag?: string;
}

export interface AppState {
  region: Region;
  /** язык интерфейса; не задан - ещё не выбирали (по умолчанию ru или язык Telegram) */
  lang?: Lang;
  favItems: string[];
  favCharacters: CharacterRef[];
  favClans: ClanRef[];
  recentItems: string[];
  recentCharacters: CharacterRef[];
  /** рюкзак: предмет → количество */
  loot: { id: string; amount: number }[];
  /** план крафта: что хотим получить, каким рецептом/вариантом и сколько */
  plan: PlanEntry[];
  /** фильтры флиппера */
  flips: FlipSettings;
}

export interface FlipSettings {
  sort: "profit" | "pct" | "hour" | "fast";
  minConfidence: "low" | "medium" | "high";
  minProfit: number;
  /** 0 — любой */
  budget: number;
  /** категория предметов; null — все */
  group: string | null;
  /** только то, что продастся за сутки (в старых сохранённых настройках поля нет) */
  fastOnly?: boolean;
}

export interface PlanEntry {
  id: string;
  recipe: number;
  offer: number;
  qty: number;
}

const KEY = "stalzone:v2";
const RECENT_LIMIT = 8;

const initial: AppState = {
  region: "ru",
  favItems: [],
  favCharacters: [],
  favClans: [],
  recentItems: [],
  recentCharacters: [],
  loot: [],
  plan: [],
  flips: { sort: "profit", minConfidence: "medium", minProfit: 20_000, budget: 0, group: null },
};

function load(): AppState {
  if (typeof window === "undefined") return initial;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...initial, ...JSON.parse(raw) };

    // миграция со старой версии приложения
    const legacy = localStorage.getItem("stalzone_region");
    const region = legacy === "nea" ? "na" : legacy;
    return isRegion(region) ? { ...initial, region } : initial;
  } catch {
    return initial;
  }
}

let state = load();
const listeners = new Set<() => void>();

function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  const json = JSON.stringify(state);
  try {
    localStorage.setItem(KEY, json);
  } catch {
    /* приватный режим */
  }
  cloud.set(KEY, json);
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Селектор должен возвращать уже существующее значение из state (без создания новых объектов). */
export function useApp<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(initial),
  );
}

export const getApp = () => state;

/** Подтягивает состояние из Telegram CloudStorage (если оно новее локального — берём облако). */
export async function syncFromCloud() {
  const raw = await cloud.get(KEY);
  if (!raw || raw === JSON.stringify(state)) return;
  try {
    setState({ ...initial, ...JSON.parse(raw) });
  } catch {
    /* битые данные в облаке игнорируем */
  }
}

const pushUnique = <T>(list: T[], value: T, same: (a: T, b: T) => boolean) =>
  [value, ...list.filter((x) => !same(x, value))].slice(0, RECENT_LIMIT);

const sameChar = (a: CharacterRef, b: CharacterRef) => a.region === b.region && a.name.toLowerCase() === b.name.toLowerCase();

export const actions = {
  setRegion: (region: Region) => setState({ region }),
  /** только из I18nProvider (useSetLang) - он же пишет cookie */
  setLang: (lang: Lang) => setState({ lang }),

  toggleFavItem: (id: string) =>
    setState((s) => ({
      favItems: s.favItems.includes(id) ? s.favItems.filter((x) => x !== id) : [id, ...s.favItems],
    })),

  toggleFavCharacter: (ref: CharacterRef) =>
    setState((s) => ({
      favCharacters: s.favCharacters.some((x) => sameChar(x, ref))
        ? s.favCharacters.filter((x) => !sameChar(x, ref))
        : [ref, ...s.favCharacters],
    })),

  toggleFavClan: (ref: ClanRef) =>
    setState((s) => ({
      favClans: s.favClans.some((x) => x.id === ref.id) ? s.favClans.filter((x) => x.id !== ref.id) : [ref, ...s.favClans],
    })),

  pushRecentItem: (id: string) => setState((s) => ({ recentItems: pushUnique(s.recentItems, id, (a, b) => a === b) })),

  /** в недавние; заодно освежает группировку и тег клана у того же игрока в избранном */
  pushRecentCharacter: (ref: CharacterRef) =>
    setState((s) => ({
      recentCharacters: pushUnique(s.recentCharacters, ref, sameChar),
      favCharacters: s.favCharacters.map((x) => (sameChar(x, ref) ? { ...x, ...ref } : x)),
    })),

  /** amount <= 0 убирает предмет из рюкзака */
  setLoot: (id: string, amount: number) =>
    setState((s) => {
      const value = Math.min(999_999, Math.floor(amount));
      if (!(value > 0)) return { loot: s.loot.filter((x) => x.id !== id) };
      if (s.loot.some((x) => x.id === id)) {
        return { loot: s.loot.map((x) => (x.id === id ? { id, amount: value } : x)) };
      }
      return { loot: [{ id, amount: value }, ...s.loot] };
    }),
  clearLoot: () => setState({ loot: [] }),

  /** добавляет в план (или увеличивает количество, если такой рецепт уже есть) */
  addToPlan: (entry: Omit<PlanEntry, "qty">, qty = 1) =>
    setState((s) => {
      const same = (p: PlanEntry) => p.id === entry.id && p.recipe === entry.recipe && p.offer === entry.offer;
      return s.plan.some(same)
        ? { plan: s.plan.map((p) => (same(p) ? { ...p, qty: p.qty + qty } : p)) }
        : { plan: [...s.plan, { ...entry, qty }] };
    }),
  updatePlan: (index: number, patch: Partial<PlanEntry>) =>
    setState((s) => ({
      plan: s.plan.map((p, i) => (i === index ? { ...p, ...patch } : p)).filter((p) => p.qty > 0),
    })),
  clearPlan: () => setState({ plan: [] }),

  setFlips: (patch: Partial<FlipSettings>) => setState((s) => ({ flips: { ...s.flips, ...patch } })),

  clearRecentItems: () => setState({ recentItems: [] }),
  clearRecentCharacters: () => setState({ recentCharacters: [] }),
};

export { sameChar };
