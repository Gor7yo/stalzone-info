import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { breadcrumbs, JsonLd } from "@/components/JsonLd";
import { PageHeader } from "@/components/ui/PageHeader";
import { categoryLabel, groupLabel, iconUrl } from "@/features/catalog";
import { getT } from "@/i18n/server";
import { marketGroup, marketGroups } from "@/lib/items-server";
import styles from "./category.module.css";

/**
 * Категория рынка: список предметов ссылками прямо в HTML. Вход из поиска по запросам вида
 * «цены артефактов» и путь для робота ко всем страницам предметов.
 */
export const dynamicParams = false;
/** Состав рынка меняется (что месяц не торговалось - уходит): пересобираем раз в час. */
export const revalidate = 3600;

export async function generateStaticParams() {
  return (await marketGroups()).map((g) => ({ group: g.id }));
}

export async function generateMetadata({ params }: PageProps<"/auction/c/[group]">): Promise<Metadata> {
  const { group } = await params;
  const g = await marketGroup(group);
  if (!g) return {};
  return {
    title: `${g.label} - цены на аукционе STALZONE`,
    description: `${g.label} STALZONE: ${g.items.length} предметов с ценами на аукционе, лотами и историей продаж по регионам RU, EU, NA и SEA.`,
    alternates: { canonical: `/auction/c/${g.id}` },
  };
}

export default async function CategoryPage({ params }: PageProps<"/auction/c/[group]">) {
  const { group } = await params;
  const g = await marketGroup(group);
  if (!g) notFound();
  const groups = await marketGroups();
  // интерфейс - на языке из cookie; JSON-LD и метаданные остаются русскими
  const { t, lang } = await getT();
  const label = groupLabel(g, lang);
  const list = lang === "en" ? [...g.items].sort((a, b) => a.nameEn.localeCompare(b.nameEn, "en")) : g.items;

  return (
    <main className="page">
      <JsonLd
        data={breadcrumbs([
          ["Рынок", "/auction"],
          [g.label, `/auction/c/${g.id}`],
        ])}
      />
      <nav className={styles.crumbs} aria-label={t.item.crumbsAria}>
        <Link href="/auction">{t.item.market}</Link>
        <span aria-hidden>›</span>
        <span>{label}</span>
      </nav>
      <PageHeader eyebrow={t.item.market} title={t.category.title(label)}>
        {t.category.lead(g.items.length)}
      </PageHeader>

      <nav className={styles.groups} aria-label={t.category.groupsAria}>
        {groups.map((x) => (
          <Link key={x.id} href={`/auction/c/${x.id}`} className="chip" aria-current={x.id === g.id ? "page" : undefined}>
            {groupLabel(x, lang)}
          </Link>
        ))}
      </nav>

      <ul className={styles.list}>
        {list.map((item) => (
          <li key={item.id}>
            <Link href={`/auction/${item.id}`} className={`list-row ${styles.item}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- иконки с GitHub EXBO, как в ItemIcon */}
              <img src={iconUrl(item)} alt="" width={40} height={40} loading="lazy" className={styles.icon} />
              <span className={styles.text}>
                <strong className="truncate">{lang === "en" ? item.nameEn : item.name}</strong>
                <span className="dim">{categoryLabel(item.category, lang)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
