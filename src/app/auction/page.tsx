"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { Icon } from "@/components/Icon";
import { ItemRow } from "@/components/ItemRow";
import { ProBadge } from "@/components/Pro/Pro";
import { PageHeader } from "@/components/ui/PageHeader";
import { RegionSwitch } from "@/components/ui/RegionSwitch";
import { SearchField } from "@/components/ui/SearchField";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/ui/States";
import { useBestPrice } from "@/features/auction";
import { CRAFT_ENABLED, LOOT_ENABLED } from "@/lib/flags";
import { GROUPS, searchItems, useItems, type Item } from "@/features/items";
import { formatShort } from "@/lib/format";
import { actions, useApp, type Region } from "@/lib/store";
import { haptic } from "@/lib/telegram";

const STEP = 40;

export default function AuctionPage() {
  const region = useApp((s) => s.region);
  const favItems = useApp((s) => s.favItems);
  const recentItems = useApp((s) => s.recentItems);

  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | undefined>();
  const [limit, setLimit] = useState(STEP);
  const deferred = useDeferredValue(query);

  const { data: index, isLoading, isError, refetch } = useItems();
  const browsing = deferred.trim().length > 0 || group !== undefined;
  const results = index && browsing ? searchItems(index, deferred, group, limit + 1) : [];

  const pick = (id?: string) => {
    haptic.select();
    setGroup(id);
    setLimit(STEP);
  };

  return (
    <main className="page">
      <PageHeader eyebrow="Аукцион" title="Рынок" aside={<RegionSwitch />}>
        {index ? `${index.list.length.toLocaleString("ru-RU")} предметов. ` : ""}Ищите по-русски или по-английски — даже в неправильной
        раскладке.
      </PageHeader>

      <SearchField
        value={query}
        onChange={(v) => {
          setQuery(v);
          setLimit(STEP);
        }}
        placeholder="Например, «Сердце» или «AK-74»"
        aria-label="Поиск предмета"
      />

      <Link href="/flips" className="list-row" style={{ marginTop: 12 }} onClick={() => haptic.tap()}>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 40,
            height: 40,
            borderRadius: 13,
            background: "rgb(78 224 138 / 0.12)",
            color: "var(--green)",
            flex: "none",
          }}
        >
          <Icon name="bolt" size={20} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ fontSize: 14 }}>
            Флиппер <ProBadge />
          </strong>
          <span className="dim" style={{ display: "block", fontSize: 12, fontWeight: 600 }}>
            Лоты дешевле рынка — выкупить и перепродать
          </span>
        </span>
        <Icon name="chevron" size={18} className="dim" />
      </Link>

      {CRAFT_ENABLED && (
        <Link href="/craft" className="list-row" style={{ marginTop: 8 }} onClick={() => haptic.tap()}>
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 40,
              height: 40,
              borderRadius: 13,
              background: "rgb(var(--acc-rgb) / 0.12)",
              color: "var(--acc)",
              flex: "none",
            }}
          >
            <Icon name="sparkle" size={20} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ fontSize: 14 }}>Планировщик крафта</strong>
            <span className="dim" style={{ display: "block", fontSize: 12, fontWeight: 600 }}>
              Что нафармить, что докупить блоками
            </span>
          </span>
          <Icon name="chevron" size={18} className="dim" />
        </Link>
      )}

      {LOOT_ENABLED && (
        <Link href="/loot" className="list-row" style={{ marginTop: 8 }} onClick={() => haptic.tap()}>
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 40,
              height: 40,
              borderRadius: 13,
              background: "rgb(255 201 74 / 0.12)",
              color: "#ffc94a",
              flex: "none",
            }}
          >
            <Icon name="bag" size={20} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ fontSize: 14 }}>Рюкзак</strong>
            <span className="dim" style={{ display: "block", fontSize: 12, fontWeight: 600 }}>
              Оценить лут после вылазки
            </span>
          </span>
          <Icon name="chevron" size={18} className="dim" />
        </Link>
      )}

      <div className="chips" style={{ marginTop: 12 }}>
        <button type="button" className="chip" aria-pressed={!group} onClick={() => pick(undefined)}>
          Все
        </button>
        {GROUPS.map((g) => (
          <button key={g.id} type="button" className="chip" aria-pressed={group === g.id} onClick={() => pick(g.id)}>
            <span aria-hidden>{g.icon}</span> {g.label}
          </button>
        ))}
      </div>

      <div className="section" style={{ marginTop: 18 }}>
        {isError ? (
          <ErrorState onRetry={() => refetch()} text="Не удалось загрузить базу предметов." />
        ) : isLoading || !index ? (
          <RowSkeleton />
        ) : browsing ? (
          results.length ? (
            <>
              <div className="item-grid">
                {results.slice(0, limit).map((item) => (
                  <ItemRow key={item.id} item={item} />
                ))}
              </div>
              {results.length > limit && (
                <button type="button" className="btn" style={{ width: "100%", marginTop: 12 }} onClick={() => setLimit((l) => l + STEP)}>
                  Показать ещё
                </button>
              )}
            </>
          ) : (
            <EmptyState title="Ничего не найдено" text="Проверьте название или попробуйте другую категорию." />
          )
        ) : (
          <Shortcuts index={index.byId} favItems={favItems} recentItems={recentItems} region={region} />
        )}
      </div>
    </main>
  );
}

function Shortcuts({
  index,
  favItems,
  recentItems,
  region,
}: {
  index: Map<string, Item>;
  favItems: string[];
  recentItems: string[];
  region: Region;
}) {
  const favs = favItems.map((id) => index.get(id)).filter((i): i is Item => !!i);
  const recents = recentItems.map((id) => index.get(id)).filter((i): i is Item => !!i && !favItems.includes(i.id));

  if (!favs.length && !recents.length) {
    return (
      <EmptyState
        icon="sparkle"
        title="Что ищем?"
        text="Введите название предмета. Добавляйте предметы в избранное ★ — их цены появятся на главной."
      />
    );
  }

  return (
    <>
      {favs.length > 0 && (
        <>
          <h2 className="section-title">
            Избранное <small>лучшая цена · {region.toUpperCase()}</small>
          </h2>
          <div className="item-grid">
            {favs.map((item) => (
              <ItemRow key={item.id} item={item} aside={<BestPrice id={item.id} region={region} />} />
            ))}
          </div>
        </>
      )}
      {recents.length > 0 && (
        <div className={favs.length ? "section" : undefined}>
          <h2 className="section-title">
            Недавние
            <button type="button" onClick={actions.clearRecentItems}>
              Очистить
            </button>
          </h2>
          <div className="item-grid">
            {recents.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function BestPrice({ id, region }: { id: string; region: Region }) {
  const { data, isLoading } = useBestPrice(region, id);
  if (isLoading) return <span className="skeleton" style={{ width: 60, height: 12 }} />;
  return (
    <span className="mono truncate" style={{ fontSize: 11, fontWeight: 700, color: data?.price ? "var(--acc)" : "var(--text-3)" }}>
      {data?.price ? formatShort(data.price) : "—"}
    </span>
  );
}
