"use client";

import { useEffect, useMemo, useState } from "react";
import { BarterSection } from "@/components/Barter/Barter";
import { CRAFT_ENABLED } from "@/lib/flags";
import { Icon } from "@/components/Icon";
import { ModuleStatBadge } from "@/components/ModuleStat/ModuleStat";
import { PriceAlertPanel } from "@/components/PriceAlert/PriceAlertPanel";
import { PriceChart } from "@/components/PriceChart/PriceChart";
import { SellHelper } from "@/components/SellHelper/SellHelper";
import { SwipePager } from "@/components/Pager/SwipePager";
import { LotFilters, type DealFilter } from "@/components/LotFilters/LotFilters";
import { Tilt } from "@/components/Tilt/Tilt";
import { FavButton, RefreshButton, ShareButton } from "@/components/ui/Buttons";
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
  hasUpgradeFilter,
  pickedQualities,
  qualityLabel,
  upgradeLabel,
  upgradeOf,
  lotUnitPrice,
  priceStats,
  QUALITY,
  bucketPoints,
  PERIODS,
  periodInfo,
  type HistoryPeriod,
  qualityOf,
  requestFresh,
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
import { ProTeaser } from "@/components/Pro/Pro";
import { useAlerts } from "@/features/alerts";
import { usePro } from "@/features/pro";
import { useBarter } from "@/features/barter";
import { categoryLabel, rarityOf, useItem } from "@/features/items";
import { moduleAttr, moduleAttrs, variantLabel, variantOf, variantsOf } from "@/features/modules";
import { formatCompact, formatDuration, formatNumber, formatPrice, formatRelative, plural } from "@/lib/format";
import { actions, useApp } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { useNow } from "@/lib/useNow";
import { useUndoable } from "@/lib/useUndoable";
import styles from "./item.module.css";

const SORTS: {
  value: string;
  label: string;
  sort: LotSort;
  order: SortOrder;
}[] = [
  { value: "cheap", label: "Дешевле", sort: "buyout_price", order: "asc" },
  { value: "ending", label: "Скоро конец", sort: "time_left", order: "asc" },
  { value: "new", label: "Новые", sort: "time_created", order: "desc" },
];

const LOTS_PAGE = 10;
/** Сколько лотов предмета с качеством грузим целиком (столько же снимает сборщик: 5 страниц по 200). */
const QUALITY_LOTS_MAX = 1000;
/** Модулей на рынке ~4 тыс., редкие с нужной характеристикой — в самом конце по цене */
const MODULE_LOTS_MAX = 5000;

/**
 * quality / upgrade — открыть сразу с фильтром по ним (переход из флиппера);
 * null — без фильтра (у артефакта по умолчанию «Обычный»).
 */
export function ItemView({
  id,
  quality = null,
  upgrade = null,
  variant = null,
}: {
  id: string;
  quality?: number | null;
  upgrade?: number | null;
  /** ключевая характеристика модуля (?v=) */
  variant?: string | null;
}) {
  const region = useApp((s) => s.region);
  const isFav = useApp((s) => s.favItems.includes(id));
  const { item, isLoading: itemLoading } = useItem(id);

  const linked: LotFilter | null =
    quality !== null || upgrade !== null || variant !== null
      ? {
          quality: null,
          qualities: quality !== null ? [quality] : null,
          upgrade: null,
          upgrades: upgrade !== null ? [upgrade] : null,
          variant,
        }
      : null;

  // всё, что меняет пользователь на экране, — с историей: кнопка «Отменить» / Ctrl+Z
  const view = useUndoable({
    tab: "lots" as "lots" | "history",
    sortKey: "cheap",
    filter: linked,
    deal: "all" as DealFilter,
    page: 0,
    period: "week" as HistoryPeriod,
  });
  const { tab, sortKey, filter: userFilter } = view.value;
  // бесплатная версия: без графика (история продаж за месяц), без фильтров качества, заточки и «выгодно / дорого»
  const { isPro } = usePro();
  const period: HistoryPeriod = isPro ? view.value.period : "month";
  const dealFilter: DealFilter = isPro ? view.value.deal : "all";
  const periodMeta = periodInfo(period);
  const [alertOpen, setAlertOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const alerts = useAlerts();
  const hasAlert = alerts.data?.price.some((a) => a.itemId === id) ?? false;
  const sort = SORTS.find((s) => s.value === sortKey)!;

  // бартерные ресурсы на аукционе не продаются — не дёргаем API зря
  const { data: barter } = useBarter();
  const tradable = barter ? !barter.farm.has(id) : false;

  // у артефактов и модулей у каждого лота своё качество — цены разных качеств несравнимы
  const qualityItem = item?.group === "artefact" || item?.group === "weapon_modules";
  // фильтр «клетки» карты цен: качество × ступень заточки
  // артефакт по умолчанию открывается на «Обычном»: без фильтра график — «пила» из смеси качеств
  const filter = !isPro ? ALL : (userFilter ?? (item?.group === "artefact" ? { quality: null, qualities: [0], upgrade: null } : ALL));
  const qualities = pickedQualities(filter);
  const filtered = qualities.length > 0 || hasUpgradeFilter(filter) || filter.variant != null;
  // у модуля цена зависит от ключевой характеристики («Снайпер») так же сильно, как от качества
  const variantItem = item?.group === "weapon_modules";
  // у артефакта без одного выбранного качества медиана и тренд смешивают дешёвые и дорогие варианты
  const mixed = qualityItem && (qualities.length !== 1 || (variantItem && filter.variant == null));

  const history = useHistory(region, id, period, tradable);
  // У артефактов и модулей грузим весь рынок (для фильтра качества) один раз «по выкупу» и сортируем
  // на месте — смена «Дешевле / Скоро конец / Новые» мгновенная. Остальные — сортировка сервером
  // и догрузка по мере листания. Модули: ~4 тыс. лотов из снимка сборщика, по 1000 за запрос.
  const localSort = qualityItem;
  const lots = useLots(
    region,
    id,
    localSort ? "buyout_price" : sort.sort,
    localSort ? "asc" : sort.order,
    tradable,
    variantItem ? 1000 : qualityItem ? 200 : undefined,
  );
  // артефакт и модуль и так грузят лоты по возрастанию выкупа — лучшая цена считается из них
  const bestFromLots = qualityItem;
  const bestQuery = useBestPrice(region, id, tradable && !bestFromLots);
  const lotsBest = useMemo(() => {
    if (!bestFromLots || !lots.data) return undefined;
    const prices = lots.data.pages
      .flatMap((p) => p.lots)
      .map(lotUnitPrice)
      .filter((p) => p > 0);
    return {
      price: prices.length ? Math.min(...prices) : null,
      total: lots.data.pages[0]?.total ?? 0,
    };
  }, [bestFromLots, lots.data]);
  const best = bestFromLots ? { data: lotsBest, isLoading: lots.isLoading, refetch: lots.refetch } : bestQuery;

  const sales = history.data?.prices ?? [];
  const stats = history.data ? priceStats(sales, filter, periodMeta.days) : null;

  useEffect(() => actions.pushRecentItem(id), [id]);

  const rarity = item ? rarityOf(item.rarity) : null;
  // у артефакта подсветка карточки — цвет выбранного качества (из нескольких — самого высокого)
  const pickedQualityList = qualityItem ? qualities.map((q) => QUALITY[q]).filter(Boolean) : [];
  const accent = pickedQualityList[pickedQualityList.length - 1]?.color ?? rarity?.color ?? "var(--text-3)";
  const allLots = useMemo(() => {
    const list = lots.data?.pages.flatMap((p) => p.lots) ?? [];
    if (!localSort || (sort.sort === "buyout_price" && sort.order === "asc")) return list;
    const key: Record<LotSort, (l: Lot) => number> = {
      buyout_price: (l) => l.buyoutPrice,
      current_price: (l) => l.currentPrice || l.startPrice,
      time_created: (l) => new Date(l.startTime).getTime(),
      time_left: (l) => new Date(l.endTime).getTime(),
    };
    const k = key[sort.sort];
    const dir = sort.order === "desc" ? -1 : 1;
    return [...list].sort((a, b) => (k(a) - k(b)) * dir);
  }, [lots.data, localSort, sort.sort, sort.order]);
  const totalLots = lots.data?.pages[0]?.total ?? 0;
  const hasQuality = qualityItem || allLots.some((l) => qualityOf(l.additional) !== null);

  // лот сравниваем с такими же по качеству и заточке; не с чем сравнить — без оценки
  const medians = new Map<string, number | undefined>();
  const lotMedian = (lot: Lot) => {
    if (!hasQuality) return stats?.median;
    const key = `${qualityOf(lot.additional)}:${upgradeOf(lot.additional)}:${variantOf(lot.additional)}`;
    if (!medians.has(key)) medians.set(key, comparableMedian(sales, lot.additional));
    return medians.get(key);
  };

  const lotsInFilter = filtered ? allLots.filter((l) => matchesFilter(l.additional, filter)) : allLots;
  const dealKind = (lot: Lot) => dealOf(lot, lotMedian(lot))?.kind;
  const isGood = (lot: Lot) => ["hot", "good"].includes(dealKind(lot) ?? "");
  const isBad = (lot: Lot) => dealKind(lot) === "high";
  const dealCounts = {
    good: lotsInFilter.filter(isGood).length,
    bad: lotsInFilter.filter(isBad).length,
  };
  const lotsShown = dealFilter === "good" ? lotsInFilter.filter(isGood) : dealFilter === "bad" ? lotsInFilter.filter(isBad) : lotsInFilter;
  // пагинация лотов: по LOTS_PAGE на страницу, листается свайпом
  const narrowed = filtered || dealFilter !== "all";
  const pages = Math.max(1, Math.ceil((narrowed ? lotsShown.length : Math.max(totalLots, lotsShown.length)) / LOTS_PAGE));
  const page = Math.min(view.value.page, pages - 1);
  const pageLots = lotsShown.slice(page * LOTS_PAGE, (page + 1) * LOTS_PAGE);
  // без фильтра страниц столько, сколько лотов на рынке — недостающие догружаем.
  // У предметов с качеством догружаем весь рынок (до QUALITY_LOTS_MAX): дорогие редкие и легендарные
  // лоты лежат после 200 самых дешёвых, иначе фильтр качества их не видит
  const needMore =
    (qualityItem && allLots.length < Math.min(totalLots, variantItem ? MODULE_LOTS_MAX : QUALITY_LOTS_MAX)) ||
    (!narrowed && pageLots.length < LOTS_PAGE && allLots.length < totalLots);
  useEffect(() => {
    if (needMore && lots.hasNextPage && !lots.isFetchingNextPage) lots.fetchNextPage();
  }, [needMore, lots]);

  const salesShown = filtered ? sales.filter((s) => matchesFilter(s.additional, filter)) : sales;

  // «лучшая цена» с фильтром считается по загруженным лотам этой клетки
  const cellBest = filtered ? Math.min(...lotsInFilter.map(lotUnitPrice).filter((p) => p > 0)) : null;
  const bestPrice = filtered ? (Number.isFinite(cellBest) ? cellBest : null) : best.data?.price;
  const latest = lastSale(sales, filter);
  const filterLabel = [qualityLabel(filter), upgradeLabel(filter), filter.variant ? variantLabel(filter.variant) : ""]
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
              data-active={sellOpen || undefined}
              aria-pressed={sellOpen}
              aria-label="По какой цене продать"
              title="По какой цене продать"
              onClick={() => {
                haptic.tap();
                setSellOpen((v) => !v);
                setAlertOpen(false);
              }}
            >
              <Icon name="tag" size={19} />
            </button>
          )}
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
                setSellOpen(false);
              }}
            >
              <Icon name="bell" size={19} filled={hasAlert} />
            </button>
          )}
          <ShareButton text={`${item?.name ?? "Предмет"} — цены на рынке STALZONE`} />
          <FavButton active={isFav} onToggle={() => actions.toggleFavItem(id)} />
        </div>
      </div>

      <div className="desk-split">
        <div className="desk-main">
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
                  {pickedQualityList.map((q) => (
                    <span key={q.label} className="pill" style={{ color: q.color }}>
                      <span className="dot" />
                      {q.label}
                    </span>
                  ))}
                  {filter.variant && (
                    <ModuleStatBadge id={filter.variant} quality={qualities.length === 1 ? qualities[0] : null} size="md" />
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
              {item?.nameEn && (
                <span className="dim" style={{ fontSize: 12, fontWeight: 600 }}>
                  {item.nameEn}
                </span>
              )}
            </div>
          </Tilt>

          {tradable && alertOpen && (
            <PriceAlertPanel
              itemId={id}
              itemName={item?.name ?? id}
              region={region}
              filter={filter}
              variantItem={variantItem}
              bestPrice={bestPrice}
              median={stats?.median}
            />
          )}

          {tradable && sellOpen && (
            <SellHelper
              itemId={id}
              region={region}
              hasQuality={qualityItem}
              hasUpgrade={hasQuality || allLots.some((l) => upgradeOf(l.additional) > 0)}
              stackable={allLots.some((l) => l.amount > 1)}
              initialQuality={qualities.length === 1 ? qualities[0] : null}
              initialUpgrade={filter.upgrades?.length === 1 ? filter.upgrades[0] : (filter.upgrade ?? null)}
              variants={variantItem ? variantsOf(allLots, sales).filter((v) => moduleAttr(v)) : []}
              initialVariant={filter.variant ?? null}
            />
          )}

          {tradable && (
            <>
              {isPro && hasQuality && allLots.length > 0 && (
                <section style={{ marginTop: 14 }}>
                  <LotFilters
                    lots={allLots}
                    filter={filter}
                    onFilter={(f) => view.set({ filter: f, page: 0 })}
                    deal={dealFilter}
                    onDeal={(d) => view.set({ deal: d, page: 0 })}
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
                        ? `Лотов нет, сделок ${periodMeta.title} не было. Последняя продажа — ${formatRelative(latest.t)} за ${formatPrice(latest.price)}.`
                        : "Лотов нет и продаж на аукционе этого региона не было."
                    }
                  />
                </section>
              )}

              {!inactive && (
                <>
                  {isPro && (
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
                        label={`Медиана · ${periodMeta.title}`}
                        value={history.isLoading ? "…" : formatPrice(stats?.median)}
                        hint={
                          mixed
                            ? isPro
                              ? variantItem
                                ? "смесь модулей — выбери качество и характеристику"
                                : "смесь качеств — выбери качество"
                              : "все качества вместе"
                            : stats
                              ? `${formatCompact(stats.p25)} – ${formatCompact(stats.p75)}`
                              : undefined
                        }
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
                  )}

                  {!isPro && (
                    <ProTeaser
                      compact
                      title="Аналитика цены"
                      text={
                        hasQuality
                          ? "Лучшая цена, медиана, тренд, сделки за сутки, график, фильтр по качеству и заточке, оценка «выгодно / дорого»"
                          : "Лучшая цена, медиана, тренд, сделки за сутки и график цены за день и неделю"
                      }
                    />
                  )}

                  {isPro && (
                    <section className="section">
                      <div className={styles.chartHead}>
                        <h2 className="section-title">
                          История цены <small>за штуку</small>
                        </h2>
                      </div>
                      <div className={styles.periodBar}>
                        <Segmented
                          size="sm"
                          label="Период истории"
                          value={period}
                          onChange={(p) => view.set({ period: p })}
                          options={PERIODS.map((p) => ({
                            value: p.value,
                            label: p.label,
                          }))}
                        />
                        {history.data?.sampled && (
                          <span className={styles.sampled} title="Сделок за период слишком много — график и медиана по равномерной выборке">
                            выборка · ≈{formatCompact(history.data.total)} сделок
                          </span>
                        )}
                      </div>
                      {history.isLoading ? (
                        <div className="skeleton" style={{ height: 260, borderRadius: 22 }} />
                      ) : stats ? (
                        <div
                          style={{
                            opacity: history.isPlaceholderData ? 0.5 : 1,
                            transition: "opacity 200ms",
                          }}
                        >
                          <PriceChart points={bucketPoints(stats.points, periodMeta.bucketMs)} median={stats.median} />
                        </div>
                      ) : (
                        <EmptyState
                          icon="market"
                          title={`Мало сделок ${periodMeta.title}`}
                          text={
                            latest
                              ? `Последняя продажа${filtered ? ` «${filterLabel}»` : ""} — ${formatRelative(latest.t)} за ${formatPrice(latest.price)}.`
                              : "Продаж не было."
                          }
                        />
                      )}
                    </section>
                  )}
                </>
              )}
            </>
          )}

          {CRAFT_ENABLED && <BarterSection itemId={id} region={region} marketPrice={best.data?.price} />}
        </div>
        <div className="desk-side">
          {tradable && !(inactive && !latest) && (
            <>
              <section className="section">
                <Segmented
                  label="Раздел"
                  value={tab}
                  onChange={(t) => view.set({ tab: t })}
                  options={[
                    {
                      value: "lots",
                      label: `Лоты${filtered || dealFilter !== "all" ? ` · ${formatNumber(lotsShown.length)}` : totalLots ? ` · ${formatNumber(totalLots)}` : ""}`,
                    },
                    {
                      value: "history",
                      label: isPro ? "Продажи" : "Продажи · месяц",
                    },
                  ]}
                />

                {tab === "lots" ? (
                  <div style={{ marginTop: 12 }}>
                    <div className={styles.lotsBar}>
                      <div className={`chips ${styles.sorts}`}>
                        {SORTS.map((s) => (
                          <button
                            key={s.value}
                            type="button"
                            className="chip"
                            aria-pressed={s.value === sortKey}
                            onClick={() => view.set({ sortKey: s.value, page: 0 })}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                      {view.canUndo && (
                        <button
                          type="button"
                          className={`icon-btn ${styles.undo}`}
                          aria-label="Отменить (Ctrl+Z)"
                          title="Отменить (Ctrl+Z)"
                          onClick={() => {
                            haptic.tap();
                            view.undo();
                          }}
                        >
                          <Icon name="undo" size={18} />
                        </button>
                      )}
                      <RefreshButton
                        onRefresh={() => {
                          requestFresh(region, id);
                          return Promise.all([lots.refetch(), history.refetch(), best.refetch()]);
                        }}
                      />
                    </div>

                    {lots.isError ? (
                      <ErrorState onRetry={() => lots.refetch()} />
                    ) : lots.isLoading ? (
                      <RowSkeleton count={5} />
                    ) : lotsShown.length ? (
                      <>
                        <SwipePager page={page} pages={pages} onPage={(p) => view.set({ page: p })}>
                          {pageLots.length ? (
                            <div
                              className="stack"
                              style={{
                                gap: 8,
                                opacity: lots.isPlaceholderData ? 0.5 : 1,
                                transition: "opacity 200ms",
                              }}
                            >
                              {pageLots.map((lot, i) => (
                                <LotRow
                                  key={`${lot.startTime}-${lot.buyoutPrice}-${i}`}
                                  lot={lot}
                                  median={isPro ? lotMedian(lot) : undefined}
                                />
                              ))}
                            </div>
                          ) : (
                            <RowSkeleton count={5} />
                          )}
                        </SwipePager>
                        {narrowed && page === pages - 1 && lots.hasNextPage && (
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
        </div>
      </div>
    </main>
  );
}

/** Класс и цвет подсветки строки по качеству (у предметов без качества — без подсветки). */
function tint(additional?: Additional) {
  const qi = qualityOf(additional);
  const color = qi === null ? undefined : QUALITY[qi]?.color;
  return color
    ? {
        className: styles.tinted,
        style: { "--q": color } as React.CSSProperties,
      }
    : { className: "", style: undefined };
}

function Quality({ additional }: { additional?: Additional }) {
  if (!additional) return null;
  const qi = qualityOf(additional);
  const q = qi === null ? undefined : QUALITY[qi];
  if (!q) return null;
  const up = upgradeOf(additional);
  // у модуля вместо заточки — ключевая характеристика («Снайпер»), от неё и зависит цена
  const variant = variantOf(additional);
  return (
    <>
      {/* характеристика первой: от неё цена модуля зависит сильнее всего */}
      {variant && <ModuleStatBadge id={variant} quality={qi} attrs={moduleAttrs(additional)} />}
      <span className={`pill ${styles.qualityPill}`} style={{ color: q.color, height: 22, fontSize: 11 }}>
        {q.label}
      </span>
      {!variant && (
        <span
          className={styles.upgrade}
          data-max={up === MAX_UPGRADE || undefined}
          style={{ "--up": up / MAX_UPGRADE } as React.CSSProperties}
          title={`Заточка +${up} из +${MAX_UPGRADE}`}
        >
          +{up}
        </span>
      )}
    </>
  );
}

const DEAL_LABEL = {
  hot: "Огонь",
  good: "Выгодно",
  fair: "По рынку",
  high: "Дорого",
} as const;

function LotRow({ lot, median }: { lot: Lot; median?: number }) {
  const now = useNow(1000);
  const left = new Date(lot.endTime).getTime() - now;
  const deal = dealOf(lot, median);
  const unit = lotUnitPrice(lot);
  const bid = lot.currentPrice || lot.startPrice;
  const t = tint(lot.additional);

  return (
    <article className={`list-row ${styles.lot} ${t.className}`} style={t.style} data-deal={deal?.kind}>
      <div className={styles.lotMain}>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <span className="pill mono" style={{ height: 22, fontSize: 11 }}>
            ×{formatNumber(lot.amount)}
          </span>
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
  const t = tint(sale.additional);
  return (
    <article className={`list-row ${t.className}`} style={t.style}>
      <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 4 }}>
        <div className="row" style={{ gap: 6 }}>
          <span className="pill mono" style={{ height: 22, fontSize: 11 }}>
            ×{formatNumber(amount)}
          </span>
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
