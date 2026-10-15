import type { Metadata } from "next";
import { ItemView } from "./ItemView";

export const metadata: Metadata = { title: "Предмет" };

/**
 * ?q=3&u=5 — сразу открыть с фильтром «качество Редкий, заточка +5» (ссылки из флиппера);
 * ?v=marksman — модуль с ключевой характеристикой «Снайпер».
 */
const level = (value: string | string[] | undefined, max: number) => {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n >= 0 && n <= max ? n : null;
};

const variantParam = (value: string | string[] | undefined) => {
  const v = Array.isArray(value) ? value[0] : value;
  return v && /^[a-z0-9_]{1,64}$/.test(v) ? v : null;
};

export default async function ItemPage({ params, searchParams }: PageProps<"/auction/[itemId]">) {
  const { itemId } = await params;
  const { q, u, v } = await searchParams;
  return <ItemView id={decodeURIComponent(itemId)} quality={level(q, 5)} upgrade={level(u, 15)} variant={variantParam(v)} />;
}
