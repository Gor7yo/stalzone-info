"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { LOOT_ENABLED } from "@/lib/flags";
import { useDeferredValue, useState } from "react";
import { Icon } from "@/components/Icon";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { PageHeader } from "@/components/ui/PageHeader";
import { RegionSwitch } from "@/components/ui/RegionSwitch";
import { SearchField } from "@/components/ui/SearchField";
import { EmptyState } from "@/components/ui/States";
import { useBarter, useBestPrices } from "@/features/barter";
import { searchItems, useItems, type Item } from "@/features/items";
import { formatPrice, plural } from "@/lib/format";
import { actions, useApp } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import styles from "./loot.module.css";

export default function LootPage() {
  if (!LOOT_ENABLED) notFound();
  return <LootView />;
}

function LootView() {
  const region = useApp((s) => s.region);
  const loot = useApp((s) => s.loot);
  const { data: index } = useItems();
  const { data: barter } = useBarter();

  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim());

  const { prices, isLoading } = useBestPrices(region, loot.map((l) => l.id));

  const rows = loot
    .map((l) => {
      const price = prices.get(l.id) ?? null;
      return { ...l, item: index?.byId.get(l.id), price, value: price ? price * l.amount : 0 };
    })
    .sort((a, b) => b.value - a.value);
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  const unpriced = rows.filter((r) => !r.price && !isLoading).length;

  // самые ходовые ресурсы бартера — для добавления в один тап
  const popular =
    index && barter
      ? [...barter.byIngredient]
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, 12)
          .map(([id]) => index.byId.get(id))
          .filter((i): i is Item => !!i && !loot.some((l) => l.id === i.id))
      : [];

  const results = index && q.length >= 2 ? searchItems(index, q, undefined, 6) : [];

  const add = (id: string) => {
    haptic.tap("medium");
    actions.setLoot(id, (loot.find((l) => l.id === id)?.amount ?? 0) + 1);
    setQuery("");
  };

  return (
    <main className="page">
      <PageHeader eyebrow="Оценка лута" title="Рюкзак" aside={<RegionSwitch />}>
        Вернулся с вылазки? Закинь добычу — посчитаем, сколько она стоит на аукционе и что продавать первым.
      </PageHeader>

      <section className={`glass ${styles.total}`}>
        <span className={styles.totalLabel}>Рюкзак стоит</span>
        <strong className={`mono ${styles.totalValue}`}>{isLoading && loot.length ? "…" : total ? formatPrice(total) : "0 ₽"}</strong>
        <span className="dim" style={{ fontSize: 12, fontWeight: 600 }}>
          {loot.length
            ? `${loot.length} ${plural(loot.length, ["позиция", "позиции", "позиций"])} · лучшие цены ${region.toUpperCase()}${unpriced ? ` · ${unpriced} без лотов` : ""}`
            : "пока пусто"}
        </span>
      </section>

      <div className={styles.search}>
        <SearchField value={query} onChange={setQuery} placeholder="Добавить предмет" aria-label="Добавить предмет в рюкзак" onSubmit={() => results[0] && add(results[0].id)} />
        {results.length > 0 && (
          <div className={`stack ${styles.results}`}>
            {results.map((item) => (
              <button key={item.id} type="button" className="list-row" onClick={() => add(item.id)}>
                <ItemIcon item={item} size={36} />
                <strong className="truncate" style={{ flex: 1, textAlign: "left", fontSize: 14 }}>
                  {item.name}
                </strong>
                <span className={styles.plus}>+</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {popular.length > 0 && (
        <div className="chips" style={{ marginTop: 12 }}>
          {popular.map((item) => (
            <button key={item.id} type="button" className="chip" onClick={() => add(item.id)}>
              <ItemIcon item={item} size={22} /> {item.name}
            </button>
          ))}
        </div>
      )}

      <section className="section">
        {rows.length ? (
          <>
            <h2 className="section-title">
              Содержимое <small>дороже — выше</small>
              <button type="button" onClick={() => (haptic.notify("warning"), actions.clearLoot())}>
                Очистить
              </button>
            </h2>
            <div className="stack" style={{ gap: 8 }}>
              {rows.map((r, i) => (
                <LootRow
                  key={r.id}
                  item={r.item}
                  id={r.id}
                  amount={r.amount}
                  price={r.price}
                  value={r.value}
                  share={total ? r.value / total : 0}
                  top={i === 0 && r.value > 0}
                  uses={barter?.byIngredient.get(r.id)?.length ?? 0}
                  loading={isLoading && r.price === null}
                />
              ))}
            </div>
          </>
        ) : (
          <EmptyState icon="sparkle" title="Рюкзак пуст" text="Найдите предмет через поиск или нажмите на ходовой ресурс выше." />
        )}
      </section>
    </main>
  );
}

function LootRow({
  item,
  id,
  amount,
  price,
  value,
  share,
  top,
  uses,
  loading,
}: {
  item?: Item;
  id: string;
  amount: number;
  price: number | null;
  value: number;
  share: number;
  top: boolean;
  uses: number;
  loading: boolean;
}) {
  return (
    <article className={styles.row} data-top={top || undefined} style={{ "--share": `${Math.round(share * 100)}%` } as React.CSSProperties}>
      <Link href={`/auction/${id}`} className={styles.rowMain}>
        <ItemIcon item={item} size={44} />
        <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 2 }}>
          <strong className="truncate" style={{ fontSize: 14 }}>
            {item?.name ?? id}
          </strong>
          <span className="dim truncate" style={{ fontSize: 12, fontWeight: 600 }}>
            {loading ? "…" : price ? `${formatPrice(price)} / шт` : "нет лотов"}
            {uses > 0 && ` · в ${uses} ${plural(uses, ["бартере", "бартерах", "бартерах"])}`}
          </span>
        </span>
        <strong className="mono" style={{ fontSize: 15, whiteSpace: "nowrap", color: top ? "var(--acc)" : undefined }}>
          {value ? formatPrice(value) : "—"}
        </strong>
      </Link>

      <div className={styles.stepper}>
        {top && (
          <span className={styles.badge}>
            <Icon name="bolt" size={12} /> продавай первым
          </span>
        )}
        <button type="button" aria-label="Меньше" onClick={() => (haptic.select(), actions.setLoot(id, amount - 1))}>
          −
        </button>
        <input
          className="mono"
          inputMode="numeric"
          aria-label="Количество"
          value={amount}
          onChange={(e) => actions.setLoot(id, Number(e.target.value.replace(/\D/g, "")) || 0)}
        />
        <button type="button" aria-label="Больше" onClick={() => (haptic.select(), actions.setLoot(id, amount + 1))}>
          +
        </button>
        <button type="button" aria-label="Убрать" className={styles.remove} onClick={() => (haptic.notify("warning"), actions.setLoot(id, 0))}>
          <Icon name="close" size={14} />
        </button>
      </div>
    </article>
  );
}
