"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { PageHeader } from "@/components/ui/PageHeader";
import { RegionSwitch } from "@/components/ui/RegionSwitch";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/ui/States";
import { QUALITY, TIERS } from "@/features/auction";
import { CONFIDENCE, useFlips, type Flip } from "@/features/flips";
import { GROUPS, useItems, type Item } from "@/features/items";
import { formatRelative, formatShort, plural } from "@/lib/format";
import { actions, useApp, type FlipSettings } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { ProTeaser } from "@/components/Pro/Pro";
import { usePro } from "@/features/pro";
import { FlipAlertCard } from "./FlipAlertCard";
import styles from "./flips.module.css";

const SORTS: Record<FlipSettings["sort"], (a: Offer, b: Offer) => number> = {
  profit: (a, b) => b.best.profit - a.best.profit,
  pct: (a, b) => b.best.pct - a.best.pct,
  // ходовые: быстрее продастся, при равенстве — прибыльнее
  fast: (a, b) => b.best.perDay - a.best.perDay || b.best.profit - a.best.profit,
};

const MIN_PROFIT = [50_000, 100_000, 250_000, 500_000, 1_000_000];
const BUDGET = [0, 500_000, 1_000_000, 5_000_000, 10_000_000];
const DEFAULTS: FlipSettings = { sort: "profit", minConfidence: "medium", minProfit: 50_000, budget: 0, group: null };
/** У этих групп есть заточка — в ссылку на предмет передаём и её. */
const UPGRADABLE = new Set(["artefact", "weapon", "armor"]);
const STEP = 20;

/** Одинаковые лоты (предмет + качество + заточка) — одна карточка с самым выгодным лотом. */
interface Offer {
  key: string;
  best: Flip;
  lots: Flip[];
}

function groupOffers(flips: Flip[]): Offer[] {
  const map = new Map<string, Offer>();
  for (const f of flips) {
    const key = `${f.itemId}:${f.quality}:${f.upgrade}`;
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
      <PageHeader eyebrow="Аукцион · Pro" title="Флиппер">
        Лоты дешевле рынка в реальном времени: выкупи и перепродай. Цена продажи — медиана сделок за неделю с тем же качеством и
        заточкой, комиссия 5 % уже вычтена.
      </PageHeader>
      <ProTeaser
        title="Флиппер — в Pro"
        text="Каждую минуту ищем лоты, которые можно перепродать с прибылью, и оцениваем, насколько надёжна оценка. Плюс бот пришлёт выгодный лот, пока его не выкупили другие."
      />
      <div className={styles.preview} aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.previewCard}>
            <span className="skeleton" style={{ width: 46, height: 46, borderRadius: 14 }} />
            <span style={{ flex: 1, display: "grid", gap: 6 }}>
              <span className="skeleton" style={{ width: "60%", height: 14 }} />
              <span className="skeleton" style={{ width: "40%", height: 12 }} />
            </span>
            <strong className="mono" style={{ color: "var(--green)" }}>+{["735", "244", "88"][i]}к</strong>
          </div>
        ))}
      </div>
    </main>
  );
}

function FlipsFeed() {
  const region = useApp((s) => s.region);
  const settings = useApp((s) => s.flips);
  const { data: index } = useItems();
  const { data, isLoading, isError, refetch } = useFlips(region);
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(STEP);

  const set = (patch: Partial<FlipSettings>) => {
    haptic.select();
    setLimit(STEP);
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
  // в чипах только категории, в которых сейчас есть флипы
  const groups = GROUPS.filter((g) => all.some((f) => groupOf(f) === g.id));
  const lotsCount = offers.reduce((n, o) => n + o.lots.length, 0);
  const top = offers.reduce<Flip | null>((best, o) => (!best || o.best.profit > best.profit ? o.best : best), null);

  const active = [
    settings.minConfidence !== DEFAULTS.minConfidence,
    settings.minProfit !== DEFAULTS.minProfit,
    settings.budget !== DEFAULTS.budget,
    settings.group !== DEFAULTS.group,
  ].filter(Boolean).length;

  return (
    <main className="page">
      <PageHeader eyebrow="Аукцион" title="Флиппер" aside={<RegionSwitch />}>
        Лоты дешевле рынка: выкупи и перепродай. Цена продажи — медиана сделок за {data?.windowDays ?? 7} дней с тем же качеством и
        заточкой, комиссия 5 % уже вычтена.
      </PageHeader>

      <section className={`glass ${styles.hero}`}>
        <div className={styles.heroMain}>
          <span className={styles.heroLabel}>Лучший флип</span>
          <strong className={`mono ${styles.heroValue}`}>{top ? `+${formatShort(top.profit)}` : isLoading ? "…" : "—"}</strong>
          <span className="dim" style={{ fontSize: 12, fontWeight: 600 }}>
            {top ? `${index?.byId.get(top.itemId)?.name ?? top.itemId} · ${top.pct.toLocaleString("ru-RU")} %` : "по текущим фильтрам"}
          </span>
        </div>
        <div className={styles.heroStats} style={{ visibility: data ? undefined : "hidden" }}>
          <span>
            <strong className="mono">{offers.length}</strong> {plural(offers.length, ["предмет", "предмета", "предметов"])}
          </span>
          <span>
            <strong className="mono">{lotsCount}</strong> {plural(lotsCount, ["лот", "лота", "лотов"])}
          </span>
          {data && <span className="dim">{formatRelative(data.updatedAt)}</span>}
        </div>
      </section>

      <div className={styles.toolbar}>
        <Segmented
          size="sm"
          label="Сортировка"
          value={settings.sort}
          onChange={(sort) => set({ sort })}
          options={[
            { value: "profit", label: "Прибыль" },
            { value: "pct", label: "Процент" },
            { value: "fast", label: "Ходовые" },
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
          Фильтры
          {active > 0 && <span className={styles.badge}>{active}</span>}
        </button>
      </div>

      {open && (
        <section className={`glass ${styles.panel}`}>
          <Filter label="Надёжность оценки">
            <Segmented
              size="sm"
              label="Надёжность оценки"
              value={settings.minConfidence}
              onChange={(minConfidence) => set({ minConfidence })}
              options={[
                { value: "low", label: "Все" },
                { value: "medium", label: "Средняя+" },
                { value: "high", label: "Надёжные" },
              ]}
            />
          </Filter>
          <Filter label="Прибыль от">
            <div className="chips">
              {MIN_PROFIT.map((v) => (
                <button key={v} type="button" className="chip" aria-pressed={settings.minProfit === v} onClick={() => set({ minProfit: v })}>
                  {formatShort(v)}
                </button>
              ))}
            </div>
          </Filter>
          <Filter label="Бюджет на лот">
            <div className="chips">
              {BUDGET.map((v) => (
                <button key={v} type="button" className="chip" aria-pressed={settings.budget === v} onClick={() => set({ budget: v })}>
                  {v ? `до ${formatShort(v)}` : "любой"}
                </button>
              ))}
            </div>
          </Filter>
          {groups.length > 0 && (
            <Filter label="Категория">
              <div className="chips">
                <button type="button" className="chip" aria-pressed={!settings.group} onClick={() => set({ group: null })}>
                  Все
                </button>
                {groups.map((g) => (
                  <button key={g.id} type="button" className="chip" aria-pressed={settings.group === g.id} onClick={() => set({ group: g.id })}>
                    <span aria-hidden>{g.icon}</span> {g.label}
                  </button>
                ))}
              </div>
            </Filter>
          )}
          {active > 0 && (
            <button type="button" className={styles.resetBtn} onClick={() => set({ ...DEFAULTS, sort: settings.sort })}>
              Сбросить фильтры
            </button>
          )}
        </section>
      )}

      <FlipAlertCard region={region} settings={settings} />

      <section className="section">
        {isError ? (
          <ErrorState onRetry={() => refetch()} text="Не удалось загрузить флипы." />
        ) : isLoading || !data ? (
          <RowSkeleton />
        ) : offers.length ? (
          <>
            <div className="stack" style={{ gap: 10 }}>
              {offers.slice(0, limit).map((o) => (
                <OfferCard key={o.key} offer={o} item={index?.byId.get(o.best.itemId)} />
              ))}
            </div>
            {offers.length > limit && (
              <button type="button" className="btn" style={{ width: "100%", marginTop: 12 }} onClick={() => setLimit((l) => l + STEP)}>
                Показать ещё
              </button>
            )}
          </>
        ) : (
          <EmptyState
            icon="sparkle"
            title="Флипов не нашлось"
            text={all.length ? "Ослабьте фильтры: меньше прибыль, больше бюджет или все уровни надёжности." : "Сейчас на рынке нет лотов заметно дешевле сделок. Загляните позже."}
          />
        )}
      </section>

      <p className={`dim ${styles.note}`}>
        Оценка — по прошлым сделкам, а не обещание: лот могли уже выкупить, а цена — сдвинуться. «Надёжно» — много сделок с тем же
        качеством и заточкой и небольшой разброс цен.
      </p>
    </main>
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
  if (f.upgrade > 0 || (item && UPGRADABLE.has(item.group))) params.set("u", String(f.upgrade));
  const query = params.toString();
  return `/auction/${f.itemId}${query ? `?${query}` : ""}`;
}

function OfferCard({ offer, item }: { offer: Offer; item?: Item }) {
  const f = offer.best;
  const quality = QUALITY[f.quality];
  const conf = CONFIDENCE[f.confidence];
  const tier = TIERS.find((t) => f.upgrade >= t.min && f.upgrade <= t.max);
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
          <strong className="truncate">{item?.name ?? f.itemId}</strong>
          <span className={styles.tags}>
            {quality && <span className={styles.qualityTag}>{quality.label}</span>}
            {(f.upgrade > 0 || quality) && <span className={styles.tag}>+{f.upgrade}</span>}
            {f.amount > 1 && <span className={styles.tag}>×{f.amount}</span>}
            <span className={styles.conf} style={{ color: conf.color }}>
              ● {conf.label}
            </span>
          </span>
        </span>
        <span className={styles.profit}>
          <strong className="mono">+{formatShort(f.profit)}</strong>
          <span className="mono">{f.pct.toLocaleString("ru-RU")} %</span>
        </span>
      </div>

      <div className={styles.bar} aria-hidden>
        <span style={{ width: `${buyShare}%` }} />
      </div>

      <div className={`mono ${styles.prices}`}>
        <span>
          <small>выкуп</small> {formatShort(f.unitPrice)}
        </span>
        <Icon name="chevron" size={14} className="dim" />
        <span>
          <small>продажа</small> ~{formatShort(f.sellUnit)}
          {f.amount > 1 && <small> /шт</small>}
        </span>
      </div>

      <div className={styles.meta}>
        <span>
          {f.deals} {plural(f.deals, ["сделка", "сделки", "сделок"])}
          {f.basis === "tier" && tier ? ` (${tier.label})` : ""} · {f.perDay}/сут
        </span>
        {others > 0 && (
          <span className={styles.more}>
            ещё {others} {plural(others, ["лот", "лота", "лотов"])}
          </span>
        )}
        <span>видели {formatRelative(f.seenAt)}</span>
      </div>
    </Link>
  );
}
