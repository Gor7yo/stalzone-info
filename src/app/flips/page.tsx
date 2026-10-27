"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { RegionSwitch } from "@/components/ui/RegionSwitch";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/ui/States";
import { CONFIDENCE, isRefreshing, useFlips, type Flip } from "@/features/flips";
import { GROUPS, groupLabel, useItems } from "@/features/items";
import { useFormat, useLang, useT } from "@/i18n/client";
import { actions, REGIONS, useApp, type FlipSettings, type Region } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { ProTeaser } from "@/components/Pro/Pro";
import { usePro } from "@/features/pro";
import { FlipAlertCard, RadarToggle } from "./FlipAlertCard";
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

const MIN_PROFIT = [20_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];
const BUDGET = [0, 500_000, 1_000_000, 5_000_000, 10_000_000];
const DEFAULTS: FlipSettings = { sort: "profit", minConfidence: "medium", minProfit: 20_000, budget: 0, group: null };
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
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(STEP);
  const [modLimit, setModLimit] = useState(STEP);

  const set = (patch: Partial<FlipSettings>) => {
    haptic.select();
    setLimit(STEP);
    setModLimit(STEP);
    actions.setFlips(patch);
  };

  const all = data?.flips ?? [];
  const groupOf = (f: Flip) => index?.byId.get(f.itemId)?.group;
  const offers = groupOffers(
    all.filter(
      (f) =>
        f.profit >= settings.minProfit &&
        (!settings.budget || f.buyout <= settings.budget) &&
        CONFIDENCE[f.confidence].rank >= CONFIDENCE[settings.minConfidence].rank &&
        (!settings.group || groupOf(f) === settings.group),
    ),
  ).sort(SORTS[settings.sort]);
  // в общем списке модули — отдельным блоком ниже: их много, а перепродаются они хуже обычных предметов
  const isModule = (o: Offer) => groupOf(o.best) === MODULES;
  const main = settings.group ? offers : offers.filter((o) => !isModule(o));
  const modules = settings.group ? [] : offers.filter(isModule);
  // в чипах только категории, в которых сейчас есть флипы
  const groups = GROUPS.filter((g) => all.some((f) => groupOf(f) === g.id));
  const lotsCount = offers.reduce((n, o) => n + o.lots.length, 0);
  const newCount = offers.filter(isNew).length;
  const top = (main.length ? main : modules).reduce<Flip | null>((best, o) => (!best || o.best.profit > best.profit ? o.best : best), null);

  const active = [
    settings.minConfidence !== DEFAULTS.minConfidence,
    settings.minProfit !== DEFAULTS.minProfit,
    settings.budget !== DEFAULTS.budget,
    settings.group !== DEFAULTS.group,
  ].filter(Boolean).length;

  return (
    <main className="page">
      <PageHeader eyebrow={t.eyebrow} title={t.title} aside={<RegionSwitch />}>
        {t.lead(data?.windowDays ?? 3)}
      </PageHeader>

      <section className={`glass ${styles.hero}`}>
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
      {/* фоновая быстрая проверка - только RU; в остальных регионах рынок освежается, пока лента открыта */}
      {region !== "ru" && <p className={`dim ${styles.regionNote}`}>{t.regionNote}</p>}

      <div className={styles.toolbar}>
        <Segmented
          size="sm"
          label={t.sortAria}
          value={settings.sort}
          onChange={(sort) => set({ sort })}
          options={[
            { value: "profit", label: t.sortProfit },
            { value: "pct", label: t.sortPct },
            { value: "hour", label: t.sortHour },
            { value: "fast", label: t.sortFast },
          ]}
        />
        <button
          type="button"
          className={styles.filterBtn}
          aria-expanded={open}
          onClick={() => {
            haptic.tap();
            setOpen((v) => !v);
          }}
        >
          <Icon name="sort" size={16} />
          {t.filters}
          {active > 0 && <span className={styles.badge}>{active}</span>}
        </button>
      </div>

      {open && (
        <section className={`glass ${styles.panel}`}>
          <Filter label={t.confidence}>
            <Segmented
              size="sm"
              label={t.confidence}
              value={settings.minConfidence}
              onChange={(minConfidence) => set({ minConfidence })}
              options={[
                { value: "low", label: t.confAll },
                { value: "medium", label: t.confMedium },
                { value: "high", label: t.confHigh },
              ]}
            />
          </Filter>
          <Filter label={t.profitFrom}>
            <div className="chips">
              {MIN_PROFIT.map((v) => (
                <button
                  key={v}
                  type="button"
                  className="chip"
                  aria-pressed={settings.minProfit === v}
                  onClick={() => set({ minProfit: v })}
                >
                  {formatShort(v)}
                </button>
              ))}
            </div>
          </Filter>
          <Filter label={t.budget}>
            <div className="chips">
              {BUDGET.map((v) => (
                <button key={v} type="button" className="chip" aria-pressed={settings.budget === v} onClick={() => set({ budget: v })}>
                  {v ? t.upTo(formatShort(v)) : t.anyBudget}
                </button>
              ))}
            </div>
          </Filter>
          {groups.length > 0 && (
            <Filter label={t.category}>
              <div className="chips">
                <button type="button" className="chip" aria-pressed={!settings.group} onClick={() => set({ group: null })}>
                  {t.all}
                </button>
                {groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className="chip"
                    aria-pressed={settings.group === g.id}
                    onClick={() => set({ group: g.id })}
                  >
                    <span aria-hidden>{g.icon}</span> {groupLabel(g, lang)}
                  </button>
                ))}
              </div>
            </Filter>
          )}
          {active > 0 && (
            <button type="button" className={styles.resetBtn} onClick={() => set({ ...DEFAULTS, sort: settings.sort })}>
              {t.reset}
            </button>
          )}
        </section>
      )}

      <FlipAlertCard region={region} settings={settings} />
      <RadarToggle region={region} regionLabel={REGIONS.find((r) => r.value === region)?.label ?? region.toUpperCase()} />

      <section className="section">
        {isError ? (
          <ErrorState onRetry={() => refetch()} text={t.loadError} />
        ) : isLoading || !data ? (
          <RowSkeleton />
        ) : offers.length ? (
          <>
            <OfferList offers={main} limit={limit} isNew={isNew} onMore={() => setLimit((l) => l + STEP)} />
            {modules.length > 0 && (
              <>
                <h2 className="section-title" style={{ marginTop: main.length ? 24 : 0 }}>
                  {t.modulesTitle} <small>{t.modulesHint}</small>
                </h2>
                <OfferList offers={modules} limit={modLimit} isNew={isNew} onMore={() => setModLimit((l) => l + STEP)} />
              </>
            )}
          </>
        ) : (
          <EmptyState icon="sparkle" title={t.emptyTitle} text={all.length ? t.emptyFiltered : t.emptyMarket} />
        )}
      </section>

      <p className={`dim ${styles.note}`}>{t.note}</p>
    </main>
  );
}

function OfferList({ offers, limit, isNew, onMore }: { offers: Offer[]; limit: number; isNew: (o: Offer) => boolean; onMore: () => void }) {
  const t = useT().flips;
  const { data: index } = useItems();
  return (
    <>
      <div className="stack stagger desk-grid" style={{ gap: 10 }}>
        {offers.slice(0, limit).map((o) => (
          <OfferCard key={o.key} offer={o} item={index?.byId.get(o.best.itemId)} isNew={isNew(o)} />
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

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.filter}>
      <span className={styles.filterLabel}>{label}</span>
      {children}
    </div>
  );
}
