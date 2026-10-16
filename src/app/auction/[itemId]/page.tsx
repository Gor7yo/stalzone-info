import type { Metadata } from "next";
import { serverItem } from "@/lib/items-server";
import { ItemView } from "./ItemView";

/** Заголовок и описание с названием предмета — по ним страницу находят в поиске («Комета цена»). */
export async function generateMetadata({ params }: PageProps<"/auction/[itemId]">): Promise<Metadata> {
  const { itemId } = await params;
  const id = decodeURIComponent(itemId);
  const item = serverItem(id);
  if (!item) return { title: "Предмет" };
  return {
    title: `${item.name} - цена на аукционе`,
    description: `${item.name}: цена на аукционе STALZONE сейчас, лоты, история продаж и график цен по регионам RU, EU, NA и SEA.`,
    alternates: { canonical: `/auction/${id}` },
    openGraph: { title: `${item.name} - цена на аукционе`, url: `/auction/${id}` },
  };
}

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
  const id = decodeURIComponent(itemId);
  return <ItemView id={id} name={serverItem(id)?.name} quality={level(q, 5)} upgrade={level(u, 15)} variant={variantParam(v)} />;
}
