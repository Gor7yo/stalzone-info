"use client";

import { useEffect, useState } from "react";
import { BarterSection } from "@/components/Barter/Barter";
import { Icon } from "@/components/Icon";
import { PriceAlertPanel } from "@/components/PriceAlert/PriceAlertPanel";
import { PriceChart } from "@/components/PriceChart/PriceChart";
import { LotFilters, type DealFilter } from "@/components/LotFilters/LotFilters";
import { Tilt } from "@/components/Tilt/Tilt";
import { FavButton, ShareButton } from "@/components/ui/Buttons";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { StatTile } from "@/components/ui/PageHeader";
import { RegionSwitch } from "@/components/ui/RegionSwitch";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/ui/States";
import {
  ALL,
  dealOf,
  lastSale,
  comparableMedian,
  matchesFilter,
  MAX_UPGRADE,
  upgradeOf,
  lotUnitPrice,
  priceStats,
  QUALITY,
  STATS_WINDOW_DAYS,
  qualityOf,
  useBestPrice,
  useHistory,
  useLots,
  type Additional,
  type Lot,
  type LotFilter,
  type LotSort,
  type Sale,
  type SortOrder,
} from "@/features/auction";
import { useAlerts } from "@/features/alerts";
import { useBarter } from "@/features/barter";
import { categoryLabel, rarityOf, useItem } from "@/features/items";
import { formatCompact, formatDuration, formatNumber, formatPrice, formatRelative, plural } from "@/lib/format";
import { actions, useApp } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { useNow } from "@/lib/useNow";
import styles from "./item.module.css";

const SORTS: { value: string; label: string; sort: LotSort; order: SortOrder }[] = [
  { value: "cheap", label: "Дешевле", sort: "buyout_price", order: "asc" },
  { value: "ending", label: "Скоро конец", sort: "time_left", order: "asc" },
  { value: "new", label: "Новые", sort: "time_created", order: "desc" },
];

export function ItemView({ id }: { id: string }) {
  const region = useApp((s) => s.region);
  const isFav = useApp((s) => s.favItems.includes(id));
  const { item, isLoading: itemLoading } = useItem(id);

  const [tab, setTab] = useState<"lots" | "history">("lots");
  const [alertOpen, setAlertOpen] = useState(false);
  const alerts = useAlerts();
  const hasAlert = alerts.data?.price.some((a) => a.itemId === id) ?? false;
  const [sortKey, setSortKey] = useState("cheap");
  const sort = SORTS.find((s) => s.value === sortKey)!;

  // бартерные ресурсы на аукционе не продаются — не дёргаем API зря
  const { data: barter } = useBarter();
  const tradable = barter ? !barter.farm.has(id) : false;

  // у артефактов и модулей у каждого лота своё качество — цены разных качеств несравнимы
  const qualityItem = item?.group === "artefact" || item?.group === "weapon_modules";
  // фильтр «клетки» карты цен: качество × ступень заточки
  // артефакт по умолчанию открывается на «Обычном»: без фильтра график — «пила» из смеси качеств
  const [userFilter, setFilter] = useState<LotFilter | null>(null);
  const filter = userFilter ?? (item?.group === "artefact" ? { quality: 0, upgrade: null } : ALL);
  const [dealFilter, setDealFilter] = useState<DealFilter>("all");
  const filtered = filter.quality !== null || filter.upgrade !== null;
  // у артефакта без выбранного качества медиана и тренд смешивают дешёвые и дорогие варианты
  const mixed = qualityItem && filter.quality === null;

  const history = useHistory(region, id, tradable, qualityItem ? 3 : 1);
  const lots = useLots(region, id, sort.sort, sort.order, tradable, qualityItem ? 200 : undefined);
  const best = useBestPrice(region, id, tradable);

  const sales = history.data?.prices ?? [];
  const stats = history.data ? priceStats(sales, filter) : null;

  useEffect(() => actions.pushRecentItem(id), [id]);

  const rarity = item ? rarityOf(item.rarity) : null;
  // у артефакта подсветка карточки — цвет выбранного качества
  const pickedQuality = qualityItem && filter.quality !== null ? QUALITY[filter.quality] : null;
  const accent = pickedQuality?.color ?? rarity?.color ?? "var(--text-3)";
  const allLots = lots.data?.pages.flatMap((p) => p.lots) ?? [];
  const totalLots = lots.data?.pages[0]?.total ?? 0;
  const hasQuality = qualityItem || allLots.some((l) => qualityOf(l.additional) !== null);

  // лот сравниваем с такими же по качеству и заточке; не с чем сравнить — без оценки
  const medians = new Map<string, number | undefined>();
  const lotMedian = (lot: Lot) => {
    if (!hasQuality) return stats?.median;
    const key = `${qualityOf(lot.additional)}:${upgradeOf(lot.additional)}`;
    if (!medians.has(key)) medians.set(key, comparableMedian(sales, lot.additional));
    return medians.get(key);
  };

  const lotsInFilter = filtered ? allLots.filter((l) => matchesFilter(l.additional, filter)) : allLots;
  const dealKind = (lot: Lot) => dealOf(lot, lotMedian(lot))?.kind;
  const isGood = (lot: Lot) => ["hot", "good"].includes(dealKind(lot) ?? "");
  const isBad = (lot: Lot) => dealKind(lot) === "high";
  const dealCounts = { good: lotsInFilter.filter(isGood).length, bad: lotsInFilter.filter(isBad).length };
  const lotsShown = dealFilter === "good" ? lotsInFilter.filter(isGood) : dealFilter === "bad" ? lotsInFilter.filter(isBad) : lotsInFilter;
  const salesShown = filtered ? sales.filter((s) => matchesFilter(s.additional, filter)) : sales;

  // «лучшая цена» с фильтром считается по загруженным лотам этой клетки
  const cellBest = filtered ? Math.min(...lotsInFilter.map(lotUnitPrice).filter((p) => p > 0)) : null;
  const bestPrice = filtered ? (Number.isFinite(cellBest) ? cellBest : null) : best.data?.price;
  const latest = lastSale(sales, filter);
  const filterLabel = [filter.quality !== null && QUALITY[filter.quality].label, filter.upgrade !== null && `+${filter.upgrade}`]
    .filter(Boolean)
    .join(" ");
  // нет ни лотов, ни свежих сделок — предмет сейчас не торгуется (или вообще не продаётся)
  const inactive = !lots.isLoading && !history.isLoading && !lots.isError && !history.isError && totalLots === 0 && !stats;


  return (
    <main className="page">
      <div className={styles.toolbar}>
        <RegionSwitch />
        <div className="row" style={{ gap: 8 }}>
          {tradable && (
            <button
              type="button"
              className={`icon-btn ${styles.bell}`}
              data-active={hasAlert || alertOpen || undefined}
              aria-pressed={alertOpen}
              aria-label="Уведомить о цене"
              onClick={() => {
                haptic.tap();
                setAlertOpen((v) => !v);
              }}
            >
              <Icon name="bell" size={19} filled={hasAlert} />
            </button>
          )}
          <ShareButton text={`${item?.name ?? "Предмет"} — цены на рынке STALCRAFT`} />
          <FavButton active={isFav} onToggle={() => actions.toggleFavItem(id)} />
        </div>
      </div>

      <Tilt className={`glass ${styles.hero}`} style={{ "--rarity": accent } as React.CSSProperties} max={8}>
        <span className={`${styles.heroIcon} depth`}>
          <ItemIcon item={item} size={72} />
        </span>
        <div className={styles.heroText}>
          {itemLoading ? (
            <span className="skeleton" style={{ height: 26, width: "70%" }} />
          ) : (
            <h1 className="display">{item?.name ?? `Предмет ${id}`}</h1>
          )}
          {item && rarity && (
            <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
              {pickedQuality && (
                <span className="pill" style={{ color: pickedQuality.color }}>
                  <span className="dot" />
                  {pickedQuality.label}
                </span>
              )}
              {item.rarity !== "DEFAULT" && (
                <span className="pill" style={{ color: rarity.color }}>
                  <span className="dot" />
                  {rarity.label}
                </span>
              )}
              <span className="pill dim">{categoryLabel(item.category)}</span>
            </div>
          )}
          {item?.nameEn && <span className="dim" style={{ fontSize: 12, fontWeight: 600 }}>{item.nameEn}</span>}
        </div>
      </Tilt>

      {tradable && alertOpen && (
        <PriceAlertPanel
          itemId={id}
          itemName={item?.name ?? id}
          region={region}
          filter={filter}
          bestPrice={bestPrice}
          median={stats?.median}
        />
      )}

      {tradable && (
        <>
          {hasQuality && allLots.length > 0 && (
            <section style={{ marginTop: 14 }}>
              <LotFilters
                lots={allLots}
                filter={filter}
                onFilter={setFilter}
                deal={dealFilter}
                onDeal={setDealFilter}
                dealCounts={dealCounts}
              />
            </section>
          )}

          {inactive && (
            <section className="section">
              <EmptyState
                icon="market"
                title="Сейчас не торгуется"
                text={
                  latest
                    ? `Лотов нет, сделок за ${STATS_WINDOW_DAYS} дней не было. Последняя продажа — ${formatRelative(latest.t)} за ${formatPrice(latest.price)}.`
                    : "Лотов нет и продаж на аукционе этого региона не было."
                }
              />
            </section>
          )}

          {!inactive && (
            <>
              <section className={`${styles.stats} stagger`}>
                <StatTile
                  label="Лучшая цена"
                  tone="acc"
                  value={best.isLoading ? "…" : formatPrice(bestPrice)}
                  hint={
                    filtered
                      ? `${formatNumber(lotsInFilter.length)} ${plural(lotsInFilter.length, ["лот", "лота", "лотов"])} «${filterLabel}»`
                      : best.data
                        ? `${formatNumber(best.data.total)} лотов`
                        : undefined
                  }
                />
                <StatTile
                  label={`Медиана · ${STATS_WINDOW_DAYS} дн`}
                  value={history.isLoading ? "…" : formatPrice(stats?.median)}
                  hint={mixed ? "смесь качеств — выбери качество" : stats ? `${formatCompact(stats.p25)} – ${formatCompact(stats.p75)}` : undefined}
                />
                <StatTile
                  label="Тренд"
                  tone={stats?.trend == null ? undefined : stats.trend >= 0 ? "up" : "down"}
                  value={stats?.trend == null ? "—" : `${stats.trend > 0 ? "+" : ""}${stats.trend.toFixed(1)}%`}
                  hint={mixed ? "по всем качествам" : "новые vs старые сделки"}
                />
                <StatTile
                  label="Сделок за 24ч"
                  value={stats ? formatNumber(stats.sales24h) : "—"}
                  hint={stats ? `мин ${formatCompact(stats.min)} · макс ${formatCompact(stats.max)}` : undefined}
                />
              </section>

              <section className="section">
                <h2 className="section-title">
                  История цены <small>за штуку</small>
                </h2>
                {history.isLoading ? (
                  <div className="skeleton" style={{ height: 260, borderRadius: 22 }} />
                ) : stats ? (
                  <PriceChart points={stats.points} median={stats.median} />
                ) : (
                  <EmptyState
                    icon="market"
                    title={`Мало сделок за ${STATS_WINDOW_DAYS} дней`}
                    text={
                      latest
                        ? `Последняя продажа${filtered ? ` «${filterLabel}»` : ""} — ${formatRelative(latest.t)} за ${formatPrice(latest.price)}.`
                        : "Продаж не было."
                    }
                  />
                )}
              </section>
            </>
          )}
        </>
      )}

      <BarterSection itemId={id} region={region} marketPrice={best.data?.price} />

      {tradable && !(inactive && !latest) && (
        <>
          <section className="section">
            <Segmented
              label="Раздел"
              value={tab}
              onChange={setTab}
              options={[
                {
                  value: "lots",
                  label: `Лоты${filtered || dealFilter !== "all" ? ` · ${formatNumber(lotsShown.length)}` : totalLots ? ` · ${formatNumber(totalLots)}` : ""}`,
                },
                { value: "history", label: "Продажи" },
              ]}
            />

            {tab === "lots" ? (
              <div style={{ marginTop: 12 }}>
                <div className="chips" style={{ marginBottom: 12 }}>
                  {SORTS.map((s) => (
                    <button key={s.value} type="button" className="chip" aria-pressed={s.value === sortKey} onClick={() => setSortKey(s.value)}>
                      {s.label}
                    </button>
                  ))}
                </div>

                {lots.isError ? (
                  <ErrorState onRetry={() => lots.refetch()} />
                ) : lots.isLoading ? (
                  <RowSkeleton count={5} />
                ) : lotsShown.length ? (
                  <>
                    <div className="stack" style={{ gap: 8, opacity: lots.isPlaceholderData ? 0.5 : 1, transition: "opacity 200ms" }}>
                      {lotsShown.map((lot, i) => (
                        <LotRow key={`${lot.startTime}-${lot.buyoutPrice}-${i}`} lot={lot} median={lotMedian(lot)} />
                      ))}
                    </div>
                    {lots.hasNextPage && (
                      <button
                        type="button"
                        className="btn"
                        style={{ width: "100%", marginTop: 12 }}
                        disabled={lots.isFetchingNextPage}
                        onClick={() => lots.fetchNextPage()}
                      >
                        {lots.isFetchingNextPage ? "Загрузка…" : `Ещё лоты · осталось ${formatNumber(totalLots - allLots.length)}`}
                      </button>
                    )}
                  </>
                ) : (
                  <EmptyState
                    icon="market"
                    title="Лотов нет"
                    text={
                      dealFilter !== "all"
                        ? dealFilter === "good"
                          ? "Выгодных лотов сейчас нет."
                          : "Дорогих лотов нет."
                        : filtered
                          ? `Лотов «${filterLabel}» сейчас нет.`
                          : "Сейчас этот предмет никто не продаёт. Загляните позже."
                    }
                  />
                )}
              </div>
            ) : (
              <div className="stack" style={{ gap: 8, marginTop: 12 }}>
                {history.isError ? (
                  <ErrorState onRetry={() => history.refetch()} />
                ) : history.isLoading ? (
                  <RowSkeleton count={5} />
                ) : salesShown.length ? (
                  salesShown.slice(0, 60).map((sale, i) => <SaleRow key={`${sale.time}-${i}`} sale={sale} />)
                ) : (
                  <EmptyState icon="clock" title="Продаж не было" />
                )}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function Quality({ additional }: { additional?: Additional }) {
  if (!additional) return null;
  const qi = qualityOf(additional);
  const q = qi === null ? undefined : QUALITY[qi];
  if (!q) return null;
  const up = upgradeOf(additional);
  return (
    <>
      <span className="pill" style={{ color: q.color, height: 22, fontSize: 11 }}>
        {q.label}
      </span>
      <span
        className={styles.upgrade}
        data-max={up === MAX_UPGRADE || undefined}
        style={{ "--up": up / MAX_UPGRADE } as React.CSSProperties}
        title={`Заточка +${up} из +${MAX_UPGRADE}`}
      >
        +{up}
      </span>
    </>
  );
}

const DEAL_LABEL = { hot: "Огонь", good: "Выгодно", fair: "По рынку", high: "Дорого" } as const;

function LotRow({ lot, median }: { lot: Lot; median?: number }) {
  const now = useNow(1000);
  const left = new Date(lot.endTime).getTime() - now;
  const deal = dealOf(lot, median);
  const unit = lotUnitPrice(lot);
  const bid = lot.currentPrice || lot.startPrice;

  return (
    <article className={`list-row ${styles.lot}`} data-deal={deal?.kind}>
      <div className={styles.lotMain}>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <span className="pill mono" style={{ height: 22, fontSize: 11 }}>×{formatNumber(lot.amount)}</span>
          <Quality additional={lot.additional} />
          {deal && deal.kind !== "fair" && (
            <span className={styles.deal} data-kind={deal.kind}>
              {DEAL_LABEL[deal.kind]} {deal.diff > 0 ? "+" : ""}
              {deal.diff.toFixed(0)}%
            </span>
          )}
        </div>
        <span className={styles.lotMeta}>
          {bid > 0 ? `ставка ${formatPrice(bid)}` : "без ставок"}
          {now > 0 && (
            <>
              {" · "}
              <span style={{ color: left < 3_600_000 ? "var(--ember)" : undefined }}>
                {left > 0 ? `${formatDuration(left, left < 3_600_000)} осталось` : "завершён"}
              </span>
            </>
          )}
        </span>
      </div>
      <div className={styles.lotPrice}>
        <strong className="mono">{unit ? formatPrice(unit) : "—"}</strong>
        {lot.amount > 1 && lot.buyoutPrice > 0 && <span className="mono dim">{formatPrice(lot.buyoutPrice)} всего</span>}
        {!lot.buyoutPrice && <span className="dim">без выкупа</span>}
      </div>
    </article>
  );
}

function SaleRow({ sale }: { sale: Sale }) {
  const now = useNow(60_000);
  const amount = Number(sale.amount) || 1;
  return (
    <article className="list-row">
      <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 4 }}>
        <div className="row" style={{ gap: 6 }}>
          <span className="pill mono" style={{ height: 22, fontSize: 11 }}>×{formatNumber(amount)}</span>
          <Quality additional={sale.additional} />
        </div>
        <span className="dim" style={{ fontSize: 12, fontWeight: 600 }}>
          {now ? formatRelative(sale.time, now) : "…"}
        </span>
      </div>
      <div className={styles.lotPrice}>
        <strong className="mono">{formatPrice(sale.price / amount)}</strong>
        {amount > 1 && <span className="mono dim">{formatPrice(sale.price)} всего</span>}
      </div>
    </article>
  );
}
