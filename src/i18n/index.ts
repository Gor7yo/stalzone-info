import { en } from "./en";
import type { Lang } from "./lang";
import { ru, type Dict } from "./ru";

export * from "./lang";
export type { Dict };

export const dicts: Record<Lang, Dict> = { ru, en };
