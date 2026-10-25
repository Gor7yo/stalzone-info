"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { ModuleStatBadge } from "@/components/ModuleStat/ModuleStat";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { PageHeader } from "@/components/ui/PageHeader";
import { RegionSwitch } from "@/components/ui/RegionSwitch";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/ui/States";
import { qualities, TIERS } from "@/features/auction";
import { CONFIDENCE, useFlips, type Flip } from "@/features/flips";
import { GROUPS, groupLabel, useItems, type Item } from "@/features/items";
import { useFormat, useLang, useT } from "@/i18n/client";
import { actions, REGIONS, useApp, type FlipSettings } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { ProTeaser } from "@/components/Pro/Pro";
import { usePro } from "@/features/pro";
import { FlipAlertCard, RadarToggle } from "./FlipAlertCard";
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
/** У этих групп есть заточка — в ссылку на предмет передаём и её. */
const UPGRADABLE = new Set(["artefact", "weapon", "armor"]);
/** Кратно 2 и 3: на широком экране карточки — сеткой в 2–3 колонки. */
const STEP = 24;
const MODULES = "weapon_modules";

/** Одинаковые лоты (предмет + качество + заточка) — одна карточка с самым выгодным лотом. */
interface Offer {
  key: string;
  best: Flip;
  lots: Flip[];
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
          {data && <span className="dim">{formatRelative(data.updatedAt)}</span>}
        </div>
      </section>

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
            <OfferList offers={main} limit={limit} onMore={() => setLimit((l) => l + STEP)} />
            {modules.length > 0 && (
              <>
                <h2 className="section-title" style={{ marginTop: main.length ? 24 : 0 }}>
                  {t.modulesTitle} <small>{t.modulesHint}</small>
                </h2>
                <OfferList offers={modules} limit={modLimit} onMore={() => setModLimit((l) => l + STEP)} />
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

function OfferList({ offers, limit, onMore }: { offers: Offer[]; limit: number; onMore: () => void }) {
  const t = useT().flips;
  const { data: index } = useItems();
  return (
    <>
      <div className="stack stagger desk-grid" style={{ gap: 10 }}>
        {offers.slice(0, limit).map((o) => (
          <OfferCard key={o.key} offer={o} item={index?.byId.get(o.best.itemId)} />
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

/** Ссылка на предмет сразу с фильтром по качеству и заточке лота. */
function itemHref(f: Flip, item?: Item) {
  const params = new URLSearchParams();
  if (f.quality >= 0) params.set("q", String(f.quality));
  if (f.variant) params.set("v", f.variant);
  else if (f.upgrade > 0 || (item && UPGRADABLE.has(item.group))) params.set("u", String(f.upgrade));
  const query = params.toString();
  return `/auction/${f.itemId}${query ? `?${query}` : ""}`;
}

function OfferCard({ offer, item }: { offer: Offer; item?: Item }) {
  const t = useT().flips;
  const lang = useLang();
  const { formatRelative, formatShort, locale } = useFormat();
  const f = offer.best;
  const quality = qualities(lang)[f.quality];
  const conf = CONFIDENCE[f.confidence];
  const tier = TIERS.find((x) => f.upgrade >= x.min && f.upgrade <= x.max);
  // полоска: какая доля ожидаемой выручки уходит на выкуп, какая — прибыль
  const revenue = f.sellUnit * f.amount * 0.95;
  const buyShare = Math.min(100, Math.max(0, (f.buyout / revenue) * 100));
  const others = offer.lots.length - 1;

  return (
    <Link
      href={itemHref(f, item)}
      className={styles.card}
      style={{ "--q": quality?.color ?? "var(--text-3)" } as React.CSSProperties}
      onClick={() => {
        haptic.tap();
        actions.pushRecentItem(f.itemId);
      }}
    >
      <div className={styles.cardHead}>
        <ItemIcon item={item} size={46} />
        <span className={styles.cardTitle}>
          <span className={styles.nameRow}>
            <strong className="truncate">{item?.name ?? f.itemId}</strong>
            {!f.variant && (f.upgrade > 0 || quality) && <span className={styles.upgrade}>+{f.upgrade}</span>}
          </span>
          <span className={styles.tags}>
            {f.variant && <ModuleStatBadge id={f.variant} quality={quality ? f.quality : null} />}
            {quality && <span className={styles.qualityTag}>{quality.label}</span>}
            {f.amount > 1 && <span className={styles.tag}>×{f.amount}</span>}
            <span className={styles.conf} style={{ color: conf.color }}>
              ● {t.conf[f.confidence]}
            </span>
          </span>
        </span>
        <span className={styles.profit}>
          <strong className="mono">+{formatShort(f.profit)}</strong>
          <span className="mono">{f.pct.toLocaleString(locale)} %</span>
        </span>
      </div>

      <div className={styles.bar} aria-hidden>
        <span style={{ width: `${buyShare}%` }} />
      </div>

      <div className={`mono ${styles.prices}`}>
        <span>
          <small>{t.buyout}</small> {formatShort(f.unitPrice)}
        </span>
        <Icon name="chevron" size={14} className="dim" />
        <span>
          <small>{t.sale}</small> ~{formatShort(f.sellUnit)}
          {f.amount > 1 && <small> {t.perPcs}</small>}
        </span>
      </div>

      {f.sellHours != null && f.profitPerHour != null && (
        <div className={styles.speed}>
          <Icon name="clock" size={14} />
          <span>{f.sellHours < 1 ? t.sellUnderHour : t.sellIn(Math.round(f.sellHours))}</span>
          <strong className="mono">{t.perHour(formatShort(f.profitPerHour))}</strong>
        </div>
      )}

      {f.batch && others > 0 && (
        <div className={styles.batch}>
          <Icon name="bag" size={14} />
          <span>
            {t.batch(f.batch.lots, f.batch.total)} · {t.buyout} {formatShort(f.batch.buyout)} ·{" "}
            {f.batch.sellHours < 1 ? t.sellUnderHour : t.sellIn(Math.round(f.batch.sellHours))}
          </span>
          <strong className="mono">+{formatShort(f.batch.profit)}</strong>
        </div>
      )}

      <div className={styles.meta}>
        <span>
          {t.deals(f.deals)}
          {f.basis === "tier" && tier ? ` (${tier.label})` : ""} · {t.perDay(f.perDay)}
        </span>
        {others > 0 && <span className={styles.more}>{t.moreLots(others)}</span>}
        <span>{t.seen(formatRelative(f.seenAt))}</span>
      </div>
    </Link>
  );
}
