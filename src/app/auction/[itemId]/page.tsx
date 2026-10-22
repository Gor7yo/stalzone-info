import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { breadcrumbs, JsonLd } from "@/components/JsonLd";
import { GROUPS } from "@/features/catalog";
import { getLang } from "@/i18n/server";
import { serverBestPrice, serverItem } from "@/lib/items-server";
import { formatNumber, formatPrice, plural } from "@/lib/format";
import { ItemView } from "./ItemView";

/**
 * Заголовок и описание с названием предмета — по ним страницу находят в поиске («Комета цена»).
 * В описании — живая цена и число лотов на RU (из снимка бэкенда, кеш 10 минут): такой сниппет кликают чаще.
 */
export async function generateMetadata({ params }: PageProps<"/auction/[itemId]">): Promise<Metadata> {
  const { itemId } = await params;
  const id = decodeURIComponent(itemId);
  const item = serverItem(id);
  if (!item) return { title: "Предмет" };
  const best = await serverBestPrice(id);
  const now =
    best?.price && best.total
      ? `сейчас от ${formatPrice(best.price)} на аукционе RU, ${formatNumber(best.total)} ${plural(best.total, ["лот", "лота", "лотов"])}. `
      : "";
  const title = `${item.name} - цена на аукционе`;
  return {
    title,
    description: `${item.name}: ${now}${now ? "Цены" : "цены"} на аукционе STALZONE, лоты, история продаж и график по регионам RU, EU, NA и SEA.`,
    alternates: { canonical: `/auction/${id}` },
    openGraph: { title, url: `/auction/${id}` },
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
  const item = serverItem(id);
  if (!item) notFound();
  const group = item.group !== "other" ? GROUPS.find((g) => g.id === item.group) : undefined;
  // заголовок в HTML - на языке интерфейса; JSON-LD и метаданные остаются русскими
  const lang = await getLang();
  return (
    <>
      {group && (
        <JsonLd
          data={breadcrumbs([
            ["Рынок", "/auction"],
            [group.label, `/auction/c/${group.id}`],
            [item.name, `/auction/${id}`],
          ])}
        />
      )}
      <ItemView
        id={id}
        name={lang === "en" ? item.nameEn : item.name}
        group={group && { id: group.id, label: group.label }}
        quality={level(q, 5)}
        upgrade={level(u, 15)}
        variant={variantParam(v)}
      />
    </>
  );
}
