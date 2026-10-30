"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { RegionSwitch } from "@/components/ui/RegionSwitch";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/ui/States";
import { CONFIDENCE, isRefreshing, useFlips, type Flip } from "@/features/flips";
import { GROUPS, groupLabel, itemMatcher, useItems } from "@/features/items";
import { useFormat, useLang, useT } from "@/i18n/client";
import { actions, REGIONS, useApp, type FlipSettings, type Region } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { ProTeaser } from "@/components/Pro/Pro";
import { usePro } from "@/features/pro";
import { FlipAlertCard, RadarToggle } from "./FlipAlertCard";
import { FlipBasket, FlipCalc, usePicks } from "./FlipBasket";
import { FlipPeek, FlipSheet } from "./FlipDetails";
import { FlipFilters, PRESETS, type PresetId } from "./FlipFilters";
import { OfferCard, type Offer } from "./OfferCard";
import styles from "./flips.module.css";

const SORTS: Record<FlipSettings["sort"], (a: Offer, b: Offer) => number> = {
  profit: (a, b) => b.best.profit - a.best.profit,
  pct: (a, b) => b.best.pct - a.best.pct,
  // в час: деньги, которые крутятся быстрее; не продастся за 48 ч — в конец
  hour: (a, b) => (b.best.profitPerHour ?? -1) - (a.best.profitPerHour ?? -1) || b.best.profit - a.best.profit,
  // ходовые: быстрее продастся, при равенстве — прибыльнее
  fast: (a, b) => b.best.perDay - a.best.perDay || b.best.profit - a.best.profit,
};

/** По умолчанию - режим «Лучшие». */
const DEFAULTS: FlipSettings = { ...PRESETS.best, group: null };
/** Кратно 2 и 3: на широком экране карточки — сеткой в 2–3 колонки. */
const STEP = 24;
const MODULES = "weapon_modules";

/**
 * «Новые»: лоты, которые сборщик увидел после прошлого взгляда на ленту этого региона.
 * Момент взгляда хранится в браузере и обновляется с каждой загрузкой ленты; на время открытой
 * страницы точка отсчёта замирает - то, что появилось при вас, тоже помечается «новым».
 */
const SEEN_KEY = (region: Region) => `stalzone:flipsSeen:${region}`;
const baselines = new Map<Region, number>();
function newSince(region: Region, fallback: number) {
  let at = baselines.get(region);
  if (at === undefined) {
    let prev = 0;
    try {
      prev = Number(localStorage.getItem(SEEN_KEY(region))) || 0;
    } catch {}
    // первый заход: новым считается то, что появится после первой загрузки ленты
    at = prev || fallback;
    baselines.set(region, at);
  }
  return at;
}

function groupOffers(flips: Flip[]): Offer[] {
  const map = new Map<string, Offer>();
  for (const f of flips) {
    const key = `${f.itemId}:${f.quality}:${f.upgrade}:${f.variant ?? ""}`;
    const offer = map.get(key);
    if (!offer) map.set(key, { key, best: f, lots: [f] });
    else {
      offer.lots.push(f);
      if (f.profit > offer.best.profit) offer.best = f;
    }
  }
  return [...map.values()];
}

/** Флиппер — функция Pro: без подписки показываем, что он умеет, и ведём на экран Pro. */
export default function FlipsPage() {
  const t = useT().flips;
  const { formatShort } = useFormat();
  const pro = usePro();
  if (pro.pending) {
    return (
      <main className="page">
        <RowSkeleton />
      </main>
    );
  }
  if (pro.isPro) return <FlipsFeed />;

  return (
    <main className="page">
      <PageHeader eyebrow={t.eyebrowPro} title={t.title}>
        {t.leadPro}
      </PageHeader>
      <ProTeaser title={t.teaserTitle} text={t.teaserText} />
      <div className={styles.preview} aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.previewCard}>
            <span className="skeleton" style={{ width: 46, height: 46, borderRadius: 14 }} />
            <span style={{ flex: 1, display: "grid", gap: 6 }}>
              <span className="skeleton" style={{ width: "60%", height: 14 }} />
              <span className="skeleton" style={{ width: "40%", height: 12 }} />
            </span>
            <strong className="mono" style={{ color: "var(--green)" }}>
              +{formatShort([735_000, 244_000, 88_000][i])}
            </strong>
          </div>
        ))}
      </div>
    </main>
  );
}

function FlipsFeed() {
  const t = useT().flips;
  const lang = useLang();
  const { formatRelative, formatShort, locale } = useFormat();
  const region = useApp((s) => s.region);
  const settings = useApp((s) => s.flips);
  const { data: index } = useItems();
  const { data, isLoading, isError, refetch } = useFlips(region);
  // точка отсчёта «новых» - только по ленте своего региона (при смене региона виден прошлый, пока грузится)
  const since = data?.region === region ? newSince(region, Date.parse(data.updatedAt)) : null;
  const isNew = (o: Offer) => since !== null && o.lots.some((f) => f.firstSeenAt && Date.parse(f.firstSeenAt) > since);
  // ушли со страницы или сменили регион - в следующий раз считаем от нового взгляда
  useEffect(() => () => void baselines.delete(region), [region]);
  useEffect(() => {
    if (data?.region !== region) return;
    try {
      localStorage.setItem(SEEN_KEY(region), String(Date.parse(data.updatedAt)));
    } catch {}
  }, [data, region]);
  const [limit, setLimit] = useState(STEP);
  const [modLimit, setModLimit] = useState(STEP);
  // поиск и «только новые» - на этот заход, в настройки (и в флип-алерт) не попадают
  const [query, setQuery] = useState("");
  const [onlyNew, setOnlyNew] = useState(false);
  // телефон: разбор лота шторкой
  const [sheet, setSheet] = useState<Offer | null>(null);
  const closeSheet = useCallback(() => setSheet(null), []);
  const picks = usePicks(region);

  const resetPaging = () => {
    setLimit(STEP);
    setModLimit(STEP);
  };
  const set = (patch: Partial<FlipSettings>) => {
    haptic.select();
    resetPaging();
    actions.setFlips(patch);
  };

  const all = data?.flips ?? [];
  const groupOf = (f: Flip) => index?.byId.get(f.itemId)?.group;
  const match = itemMatcher(query);
  /** Лот проходит фильтры s (свои настройки или режима) и поиск. */
  const passes = (f: Flip, s: Omit<FlipSettings, "group">) => {
    if (f.profit < s.minProfit) return false;
    if (s.budget && f.buyout > s.budget) return false;
    if (CONFIDENCE[f.confidence].rank < CONFIDENCE[s.minConfidence].rank) return false;
    if (s.fastOnly && (f.sellHours == null || f.sellHours > 24)) return false;
    if (match) {
      const item = index?.byId.get(f.itemId);
      if (!item || !match(item)) return false;
    }
    return true;
  };
  const inGroup = (o: Offer) => !settings.group || groupOf(o.best) === settings.group;
  const pool = groupOffers(all.filter((f) => passes(f, settings)));
  // всё, кроме категории: из этого считаются числа на чипах категорий
  const visible = onlyNew ? pool.filter(isNew) : pool;
  const offers = visible.filter(inGroup).sort(SORTS[settings.sort]);
  // сколько флипов покажет каждый режим - число на его карточке
  const presetCounts = Object.fromEntries(
    (Object.keys(PRESETS) as PresetId[]).map((id) => [
      id,
      groupOffers(all.filter((f) => passes(f, PRESETS[id]))).filter((o) => inGroup(o) && (!onlyNew || isNew(o))).length,
    ]),
  ) as Record<PresetId, number>;
  // в общем списке модули — отдельным блоком ниже: их много, а перепродаются они хуже обычных предметов
  const isModule = (o: Offer) => groupOf(o.best) === MODULES;
  const main = settings.group ? offers : offers.filter((o) => !isModule(o));
  const modules = settings.group ? [] : offers.filter(isModule);
  // в чипах только категории, в которых сейчас есть флипы, с числом позиций при остальных фильтрах
  const counts = new Map<string, number>();
  for (const o of visible) {
    const g = groupOf(o.best);
    if (g) counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  const groups = GROUPS.filter((g) => all.some((f) => groupOf(f) === g.id)).map((g) => ({
    id: g.id,
    icon: g.icon,
    label: groupLabel(g, lang),
    count: counts.get(g.id) ?? 0,
  }));
  const lotsCount = offers.reduce((n, o) => n + o.lots.length, 0);
  const newCount = pool.filter((o) => inGroup(o) && isNew(o)).length;
  const top = (main.length ? main : modules).reduce<Flip | null>((best, o) => (!best || o.best.profit > best.profit ? o.best : best), null);
  const days = data?.windowDays ?? 3;

  const list = (items: Offer[], max: number, more: () => void) => (
    <OfferList
      offers={items}
      limit={max}
      isNew={isNew}
      picked={(o) => !!picks.picks[o.best.key]}
      onPick={picks.toggle}
      onOpen={setSheet}
      onMore={more}
    />
  );

  const hero = (side: boolean) => (
    <section className={`glass ${styles.hero}`} data-side={side || undefined}>
      <div className={styles.heroMain}>
        <span className={styles.heroLabel}>{t.bestFlip}</span>
        <strong className={`mono ${styles.heroValue}`}>{top ? `+${formatShort(top.profit)}` : isLoading ? "…" : "—"}</strong>
        <span className="dim" style={{ fontSize: 12, fontWeight: 600 }}>
          {top ? `${index?.byId.get(top.itemId)?.name ?? top.itemId} · ${top.pct.toLocaleString(locale)} %` : t.byFilters}
        </span>
      </div>
      <div className={styles.heroStats} style={{ visibility: data ? undefined : "hidden" }}>
        <span>
          <strong className="mono">{offers.length}</strong> {t.itemsWord(offers.length)}
        </span>
        <span>
          <strong className="mono">{lotsCount}</strong> {t.lotsWord(lotsCount)}
        </span>
        {newCount > 0 && (
          <span className={styles.newCount}>
            <strong className="mono">{newCount}</strong> {t.newWord(newCount)}
          </span>
        )}
        {data && (
          <span className={isRefreshing(data) ? styles.refreshing : "dim"}>
            {isRefreshing(data) ? t.refreshing : formatRelative(data.updatedAt)}
          </span>
        )}
      </div>
    </section>
  );
  const basket = { picks: picks.picks, flips: all, ready: data?.region === region, onRemove: picks.remove, onClear: picks.clear };

  return (
    <main className="page">
      <PageHeader eyebrow={t.eyebrow} title={t.title} aside={<RegionSwitch />}>
        {t.lead(data?.windowDays ?? 3)}
      </PageHeader>

      {/* широкий экран: лента слева, итоги (сводка и расчёт) - колонкой справа */}
      <div className={styles.layout}>
        <div className={styles.feed}>
          {hero(false)}
          {/* фоновая быстрая проверка - только RU; в остальных регионах рынок освежается, пока лента открыта */}
          {region !== "ru" && <p className={`dim ${styles.regionNote}`}>{t.regionNote}</p>}

          <FlipFilters
            settings={settings}
            set={set}
            query={query}
            onQuery={(q) => {
              resetPaging();
              setQuery(q);
            }}
            onlyNew={onlyNew}
            onOnlyNew={(v) => {
              resetPaging();
              setOnlyNew(v);
            }}
            newCount={newCount}
            groups={groups}
            total={visible.length}
            presetCounts={presetCounts}
            showFast={all.some((f) => f.sellHours !== undefined)}
            onReset={() => {
              set(DEFAULTS);
              setQuery("");
              setOnlyNew(false);
            }}
          />

          <FlipAlertCard region={region} settings={settings} />
          <RadarToggle region={region} regionLabel={REGIONS.find((r) => r.value === region)?.label ?? region.toUpperCase()} />

          <section className="section">
            {isError ? (
              <ErrorState onRetry={() => refetch()} text={t.loadError} />
            ) : isLoading || !data ? (
              <RowSkeleton />
            ) : offers.length ? (
              <>
                {list(main, limit, () => setLimit((l) => l + STEP))}
                {modules.length > 0 && (
                  <>
                    <h2 className="section-title" style={{ marginTop: main.length ? 24 : 0 }}>
                      {t.modulesTitle} <small>{t.modulesHint}</small>
                    </h2>
                    {list(modules, modLimit, () => setModLimit((l) => l + STEP))}
                  </>
                )}
              </>
            ) : (
              <EmptyState icon="sparkle" title={t.emptyTitle} text={all.length ? t.emptyFiltered : t.emptyMarket} />
            )}
          </section>

          <FlipBasket {...basket} />

          <p className={`dim ${styles.note}`}>{t.note}</p>
        </div>

        <aside className={styles.aside}>
          {hero(true)}
          <FlipCalc {...basket} />
        </aside>
      </div>

      <FlipPeek days={days} />
      {sheet && (
        <FlipSheet
          offer={sheet}
          item={index?.byId.get(sheet.best.itemId)}
          isNew={isNew(sheet)}
          days={days}
          picked={!!picks.picks[sheet.best.key]}
          onPick={picks.toggle}
          onClose={closeSheet}
        />
      )}
    </main>
  );
}

function OfferList({
  offers,
  limit,
  isNew,
  picked,
  onPick,
  onOpen,
  onMore,
}: {
  offers: Offer[];
  limit: number;
  isNew: (o: Offer) => boolean;
  picked: (o: Offer) => boolean;
  onPick: (f: Flip) => void;
  onOpen: (o: Offer) => void;
  onMore: () => void;
}) {
  const t = useT().flips;
  const { data: index } = useItems();
  return (
    <>
      <div className="stack stagger desk-grid" style={{ gap: 8 }}>
        {offers.slice(0, limit).map((o) => (
          <OfferCard
            key={o.key}
            offer={o}
            item={index?.byId.get(o.best.itemId)}
            isNew={isNew(o)}
            picked={picked(o)}
            onPick={onPick}
            onOpen={onOpen}
          />
        ))}
      </div>
      {offers.length > limit && (
        <button type="button" className="btn" style={{ width: "100%", marginTop: 12 }} onClick={onMore}>
          {t.showMore}
        </button>
      )}
    </>
  );
}
