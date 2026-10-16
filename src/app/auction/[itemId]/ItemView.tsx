"use client";

import Link from "next/link";
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
  qualities,
  bucketPoints,
  PERIODS,
  periodInfo,
  localizePeriod,
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
import { categoryLabel, groupLabel, rarityLabel, rarityOf, useItem } from "@/features/items";
import { moduleAttr, moduleAttrs, variantLabel, variantOf, variantsOf } from "@/features/modules";
import { useFormat, useLang, useT } from "@/i18n/client";
import { actions, useApp } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { useNow } from "@/lib/useNow";
import { useUndoable } from "@/lib/useUndoable";
import styles from "./item.module.css";

const SORTS: {
  value: "cheap" | "ending" | "new";
  sort: LotSort;
  order: SortOrder;
}[] = [
  { value: "cheap", sort: "buyout_price", order: "asc" },
  { value: "ending", sort: "time_left", order: "asc" },
  { value: "new", sort: "time_created", order: "desc" },
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
  name,
  group,
  quality = null,
  upgrade = null,
  variant = null,
}: {
  id: string;
  /** название из справочника на сервере — заголовок есть в HTML до загрузки items.json */
  name?: string;
  /** категория для «Рынок › Артефакты» (с сервера — ссылка есть в HTML для поисковиков) */
  group?: { id: string; label: string };
  quality?: number | null;
  upgrade?: number | null;
  /** ключевая характеристика модуля (?v=) */
  variant?: string | null;
}) {
  const t = useT().item;
  const lang = useLang();
  const QUALITY = qualities(lang);
  const { formatCompact, formatNumber, formatPrice, formatRelative } = useFormat();
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
    sortKey: "cheap" as (typeof SORTS)[number]["value"],
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
  const periodMeta = periodInfo(period, lang);
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
  const picked = pickedQualities(filter);
  const filtered = picked.length > 0 || hasUpgradeFilter(filter) || filter.variant != null;
  // у модуля цена зависит от ключевой характеристики («Снайпер») так же сильно, как от качества
  const variantItem = item?.group === "weapon_modules";
  // у артефакта без одного выбранного качества медиана и тренд смешивают дешёвые и дорогие варианты
  const mixed = qualityItem && (picked.length !== 1 || (variantItem && filter.variant == null));

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
  const pickedQualityList = qualityItem ? picked.map((q) => QUALITY[q]).filter(Boolean) : [];
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
  const filterLabel = [qualityLabel(filter, lang), upgradeLabel(filter), filter.variant ? variantLabel(filter.variant, lang) : ""]
    .filter(Boolean)
    .join(" ");
  // нет ни лотов, ни свежих сделок — предмет сейчас не торгуется (или вообще не продаётся)
  const inactive = !lots.isLoading && !history.isLoading && !lots.isError && !history.isError && totalLots === 0 && !stats;

  return (
    <main className="page">
      {group && (
        <nav className={styles.crumbs} aria-label={t.crumbsAria}>
          <Link href="/auction">{t.market}</Link>
          <span aria-hidden>›</span>
          <Link href={`/auction/c/${group.id}`}>{groupLabel(group, lang)}</Link>
        </nav>
      )}
      <div className={styles.toolbar}>
        <RegionSwitch />
        <div className="row" style={{ gap: 8 }}>
          {tradable && (
            <button
              type="button"
              className={`icon-btn ${styles.bell}`}
              data-active={sellOpen || undefined}
              aria-pressed={sellOpen}
              aria-label={t.sellAt}
              title={t.sellAt}
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
              aria-label={t.notify}
              onClick={() => {
                haptic.tap();
                setAlertOpen((v) => !v);
                setSellOpen(false);
              }}
            >
              <Icon name="bell" size={19} filled={hasAlert} />
            </button>
          )}
          <ShareButton text={t.shareText(item?.name ?? t.itemFallback)} />
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
              {/* название с сервера — сразу в HTML (для поисковиков), без заглушки */}
              {itemLoading && !name ? (
                <span className="skeleton" style={{ height: 26, width: "70%" }} />
              ) : (
                <h1 className="display">{item?.name ?? name ?? `${t.itemFallback} ${id}`}</h1>
              )}
              {item && rarity && (
                <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                  {pickedQualityList.map((q) => (
                    <span key={q.label} className="pill" style={{ color: q.color }}>
                      <span className="dot" />
                      {q.label}
                    </span>
                  ))}
                  {filter.variant && <ModuleStatBadge id={filter.variant} quality={picked.length === 1 ? picked[0] : null} size="md" />}
                  {item.rarity !== "DEFAULT" && (
                    <span className="pill" style={{ color: rarity.color }}>
                      <span className="dot" />
                      {rarityLabel(item.rarity, lang)}
                    </span>
                  )}
                  <span className="pill dim">{categoryLabel(item.category, lang)}</span>
                </div>
              )}
              {/* второе название - на другом языке (в игре предмет могут искать и так) */}
              {item && (lang === "en" ? item.nameRu : item.nameEn) && item.name !== (lang === "en" ? item.nameRu : item.nameEn) && (
                <span className="dim" style={{ fontSize: 12, fontWeight: 600 }}>
                  {lang === "en" ? item.nameRu : item.nameEn}
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
              initialQuality={picked.length === 1 ? picked[0] : null}
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
                    title={t.inactiveTitle}
                    text={latest ? t.inactiveLast(periodMeta.title, formatRelative(latest.t), formatPrice(latest.price)) : t.inactiveNever}
                  />
                </section>
              )}

              {!inactive && (
                <>
                  {isPro && (
                    <section className={`${styles.stats} stagger`}>
                      <StatTile
                        label={t.bestPrice}
                        tone="acc"
                        value={best.isLoading ? "…" : formatPrice(bestPrice)}
                        hint={
                          filtered
                            ? `${t.lots(lotsInFilter.length, formatNumber(lotsInFilter.length))} «${filterLabel}»`
                            : best.data
                              ? t.lots(best.data.total, formatNumber(best.data.total))
                              : undefined
                        }
                      />
                      <StatTile
                        label={`${t.median} · ${periodMeta.title}`}
                        value={history.isLoading ? "…" : formatPrice(stats?.median)}
                        hint={
                          mixed
                            ? isPro
                              ? variantItem
                                ? t.mixedModules
                                : t.mixedQualities
                              : t.allQualities
                            : stats
                              ? `${formatCompact(stats.p25)} – ${formatCompact(stats.p75)}`
                              : undefined
                        }
                      />
                      <StatTile
                        label={t.trend}
                        tone={stats?.trend == null ? undefined : stats.trend >= 0 ? "up" : "down"}
                        value={stats?.trend == null ? "—" : `${stats.trend > 0 ? "+" : ""}${stats.trend.toFixed(1)}%`}
                        hint={mixed ? t.trendMixed : t.trendHint}
                      />
                      <StatTile
                        label={t.deals24h}
                        value={stats ? formatNumber(stats.sales24h) : "—"}
                        hint={stats ? t.minMax(formatCompact(stats.min), formatCompact(stats.max)) : undefined}
                      />
                    </section>
                  )}

                  {!isPro && <ProTeaser compact title={t.proTitle} text={hasQuality ? t.proTextQuality : t.proText} />}

                  {isPro && (
                    <section className="section">
                      <div className={styles.chartHead}>
                        <h2 className="section-title">
                          {t.priceHistory} <small>{t.perUnit}</small>
                        </h2>
                      </div>
                      <div className={styles.periodBar}>
                        <Segmented
                          size="sm"
                          label={t.periodAria}
                          value={period}
                          onChange={(p) => view.set({ period: p })}
                          options={PERIODS.map((p) => ({
                            value: p.value,
                            label: localizePeriod(p, lang).label,
                          }))}
                        />
                        {history.data?.sampled && (
                          <span className={styles.sampled} title={t.sampledHint}>
                            {t.sampled(formatCompact(history.data.total))}
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
                          title={t.fewDeals(periodMeta.title)}
                          text={
                            latest
                              ? t.lastSale(filtered ? filterLabel : "", formatRelative(latest.t), formatPrice(latest.price))
                              : t.noSalesText
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
                  label={t.sectionAria}
                  value={tab}
                  onChange={(v) => view.set({ tab: v })}
                  options={[
                    {
                      value: "lots",
                      label: `${t.lotsTab}${filtered || dealFilter !== "all" ? ` · ${formatNumber(lotsShown.length)}` : totalLots ? ` · ${formatNumber(totalLots)}` : ""}`,
                    },
                    {
                      value: "history",
                      label: isPro ? t.salesTab : t.salesTabMonth,
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
                            {t.sorts[s.value]}
                          </button>
                        ))}
                      </div>
                      {view.canUndo && (
                        <button
                          type="button"
                          className={`icon-btn ${styles.undo}`}
                          aria-label={t.undo}
                          title={t.undo}
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
                            {lots.isFetchingNextPage ? t.loading : t.moreLots(formatNumber(totalLots - allLots.length))}
                          </button>
                        )}
                      </>
                    ) : (
                      <EmptyState
                        icon="market"
                        title={t.noLots}
                        text={
                          dealFilter !== "all"
                            ? dealFilter === "good"
                              ? t.noGoodLots
                              : t.noBadLots
                            : filtered
                              ? t.noFilteredLots(filterLabel)
                              : t.noLotsText
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
                      <EmptyState icon="clock" title={t.noSales} />
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
  const t = useT().item;
  const lang = useLang();
  if (!additional) return null;
  const qi = qualityOf(additional);
  const q = qi === null ? undefined : qualities(lang)[qi];
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
          title={t.upgradeTitle(up, MAX_UPGRADE)}
        >
          +{up}
        </span>
      )}
    </>
  );
}

function LotRow({ lot, median }: { lot: Lot; median?: number }) {
  const t = useT().item;
  const { formatDuration, formatNumber, formatPrice } = useFormat();
  const now = useNow(1000);
  const left = new Date(lot.endTime).getTime() - now;
  const deal = dealOf(lot, median);
  const unit = lotUnitPrice(lot);
  const bid = lot.currentPrice || lot.startPrice;
  const tn = tint(lot.additional);

  return (
    <article className={`list-row ${styles.lot} ${tn.className}`} style={tn.style} data-deal={deal?.kind}>
      <div className={styles.lotMain}>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <span className="pill mono" style={{ height: 22, fontSize: 11 }}>
            ×{formatNumber(lot.amount)}
          </span>
          <Quality additional={lot.additional} />
          {deal && deal.kind !== "fair" && (
            <span className={styles.deal} data-kind={deal.kind}>
              {t.deal[deal.kind]} {deal.diff > 0 ? "+" : ""}
              {deal.diff.toFixed(0)}%
            </span>
          )}
        </div>
        <span className={styles.lotMeta}>
          {bid > 0 ? t.bid(formatPrice(bid)) : t.noBids}
          {now > 0 && (
            <>
              {" · "}
              <span style={{ color: left < 3_600_000 ? "var(--ember)" : undefined }}>
                {left > 0 ? t.left(formatDuration(left, left < 3_600_000)) : t.ended}
              </span>
            </>
          )}
        </span>
      </div>
      <div className={styles.lotPrice}>
        <strong className="mono">{unit ? formatPrice(unit) : "—"}</strong>
        {lot.amount > 1 && lot.buyoutPrice > 0 && <span className="mono dim">{t.total(formatPrice(lot.buyoutPrice))}</span>}
        {!lot.buyoutPrice && <span className="dim">{t.noBuyout}</span>}
      </div>
    </article>
  );
}

function SaleRow({ sale }: { sale: Sale }) {
  const t = useT().item;
  const { formatNumber, formatPrice, formatRelative } = useFormat();
  const now = useNow(60_000);
  const amount = Number(sale.amount) || 1;
  const tn = tint(sale.additional);
  return (
    <article className={`list-row ${tn.className}`} style={tn.style}>
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
        {amount > 1 && <span className="mono dim">{t.total(formatPrice(sale.price))}</span>}
      </div>
    </article>
  );
}
