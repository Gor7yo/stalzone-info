"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BarChart } from "@/components/Charts/BarChart";
import { LineChart, type LineSeries } from "@/components/Charts/LineChart";
import { ClanEmblem } from "@/components/ClanEmblem";
import { PageHeader, StatTile } from "@/components/ui/PageHeader";
import { RegionSwitch } from "@/components/ui/RegionSwitch";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/ui/States";
import { allianceName, CHART_ALLIANCES, chartAlliance } from "@/features/alliances";
import {
  clanPeriods,
  MAX_MEMBERS,
  useClanAnalytics,
  useClanTrend,
  type ClanAnalytics,
  type ClanBrief,
  type ClanPeriod,
} from "@/features/clans";
import { useFormat, useLang, useT } from "@/i18n/client";
import { clanLevel } from "@/lib/clanLevel";
import { stripMc } from "@/lib/mcText";
import { useApp, type Region } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { useNow } from "@/lib/useNow";
import styles from "./analytics.module.css";

/** «12 бойцов», «3 клана» на языке интерфейса. */
function useWords() {
  const t = useT().clans;
  const { formatNumber } = useFormat();
  return {
    fighters: (n: number) => t.fighters(n, formatNumber(n)),
    clansWord: (n: number) => t.clansCount(n, formatNumber(n)),
  };
}

/** Сводка по кланам региона по нашей истории: динамика, рост и отток бойцов, группировки, распределения. */
export default function ClanAnalyticsPage() {
  const t = useT().clanStats;
  const region = useApp((s) => s.region);
  const { data, isLoading, isError, refetch, isPlaceholderData } = useClanAnalytics(region);

  return (
    <main className="page">
      <PageHeader eyebrow={t.eyebrow} title={t.title} aside={<RegionSwitch />} />

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <RowSkeleton count={8} />
      ) : !data.totals.clans ? (
        <EmptyState icon="shield" title={t.loadingTitle} text={t.loadingText} />
      ) : (
        <div style={{ opacity: isPlaceholderData ? 0.6 : 1, transition: "opacity 200ms" }}>
          <Report data={data} region={region} />
        </div>
      )}
    </main>
  );
}

function Report({ data, region }: { data: ClanAnalytics; region: Region }) {
  const t = useT().clanStats;
  const lang = useLang();
  const { formatNumber, formatShortDate, formatSigned } = useFormat();
  const { fighters, clansWord } = useWords();
  const [growthWindow, setGrowthWindow] = useState<"day" | "week">("week");
  const s = data.totals;
  const growth = data.growth[growthWindow];
  const growthInfo = data.windows[growthWindow];

  return (
    <>
      {!data.windows.week.full && (
        <p className={styles.notice}>{t.historyNotice(data.historyFrom ? formatShortDate(data.historyFrom) : null)}</p>
      )}

      <section className={`${styles.tiles} stagger`}>
        <StatTile label={t.clans} tone="acc" value={formatNumber(s.clans)} hint={t.disbandedWeek(formatNumber(data.disbanded.count))} />
        <StatTile
          label={t.members}
          value={formatNumber(s.members)}
          hint={t.avgMedian(s.avgMembers.toFixed(1), formatNumber(s.medianMembers))}
        />
        <StatTile label={t.full} value={clansWord(s.full)} hint={t.fullHint(MAX_MEMBERS)} />
        <StatTile
          label={t.week}
          tone={s.membersWeek > 0 ? "up" : s.membersWeek < 0 ? "down" : undefined}
          value={formatSigned(s.membersWeek)}
          hint={t.joinedLeft(formatNumber(s.joinedWeek), formatNumber(s.leftWeek))}
        />
        <StatTile
          label={t.day}
          tone={s.membersDay > 0 ? "up" : s.membersDay < 0 ? "down" : undefined}
          value={formatSigned(s.membersDay)}
          hint={t.inAllClans}
        />
        <StatTile label={t.age} value={t.days(formatNumber(s.medianAgeDays))} hint={t.median} />
      </section>

      <Trend region={region} />

      <div className="desk-cols">
        <section className="section">
          {/* переключатель — вне h2: у кнопок в заголовке секции свой цвет */}
          <div className={styles.titleWithSwitch}>
            <h2 className="section-title">
              <span>
                {t.growing}
                {growthInfo.since && !growthInfo.full && <small> {t.since(formatShortDate(growthInfo.since))}</small>}
              </span>
            </h2>
            <Segmented
              size="sm"
              label={t.window}
              value={growthWindow}
              onChange={(v) => setGrowthWindow(v as "day" | "week")}
              options={[
                { value: "day", label: t.windowDay },
                { value: "week", label: t.windowWeek },
              ]}
            />
          </div>
          <ClanList rows={growth} region={region} empty={t.noGrowth} aside={(r) => <Delta n={r.delta ?? 0} />} />
        </section>

        <section className="section">
          <h2 className="section-title">
            {t.losing} <small>{t.perWeek}</small>
          </h2>
          <ClanList rows={data.decline} region={region} empty={t.noDecline} aside={(r) => <Delta n={r.delta ?? 0} />} />
        </section>
      </div>

      <section className="section">
        <h2 className="section-title">
          {t.alliances} <small>{t.share}</small>
        </h2>
        <div className={styles.alliances}>
          {/* только четыре игровые группировки — «none» и прочее не показываем */}
          {data.alliances.map((a) => {
            const meta = chartAlliance(a.alliance);
            if (!meta) return null;
            const color = meta.color;
            return (
              <div key={a.alliance} className={styles.alliance} style={{ "--c": color } as React.CSSProperties}>
                <div className={styles.allianceHead}>
                  <span className={styles.swatch} style={{ background: color }} />
                  <strong>{allianceName(meta, lang)}</strong>
                  <span className="mono">{(a.share * 100).toFixed(1)} %</span>
                </div>
                <div className={styles.track}>
                  <span style={{ width: `${a.share * 100}%` }} />
                </div>
                <div className={styles.allianceStats}>
                  <span>{clansWord(a.clans)}</span>
                  <span>{fighters(a.members)}</span>
                  <span>{t.avg(a.avgMembers.toFixed(1))}</span>
                  <span data-tone={a.membersWeek > 0 ? "up" : a.membersWeek < 0 ? "down" : undefined}>
                    {formatSigned(a.membersWeek)} {t.perWeek}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="desk-cols">
        <section className="section">
          <h2 className="section-title">{t.byLevel}</h2>
          <div className={styles.chartCard}>
            <BarChart
              bars={data.levels.map((l) => ({
                label: t.lvlShort(clanLevel(l.level)),
                value: l.clans,
                tip: `${t.levelN(clanLevel(l.level))}: ${clansWord(l.clans)}, ${fighters(l.members)}`,
              }))}
            />
          </div>
        </section>
        <section className="section">
          <h2 className="section-title">{t.byAge}</h2>
          <div className={styles.chartCard}>
            <BarChart
              bars={data.ages.map((a) => {
                const label = (lang === "en" && t.ages[a.label as keyof typeof t.ages]) || a.label;
                return { label, value: a.clans, tip: `${label}: ${clansWord(a.clans)}` };
              })}
            />
          </div>
        </section>
      </div>

      <div className="desk-cols">
        <section className="section">
          <h2 className="section-title">
            {t.newClans} <small>{t.countPerWeek(clansWord(data.newClans.count))}</small>
          </h2>
          <ClanList
            rows={data.newClans.list}
            region={region}
            empty={t.noNew}
            aside={(r) => <span className={styles.aside}>{r.ageDays ? t.days(String(r.ageDays)) : t.today}</span>}
          />
        </section>

        <section className="section">
          <h2 className="section-title">
            {t.disbanded} <small>{t.countPerWeek(clansWord(data.disbanded.count))}</small>
          </h2>
          <ClanList rows={data.disbanded.list} region={region} empty={t.noDisbanded} gone aside={(r) => <GoneAt at={r.goneAt} />} />
        </section>
      </div>
    </>
  );
}

type TrendMetric = "members" | "clans";
type TrendSplit = "total" | "alliances";

/** Бойцы и кланы региона во времени: всего или по группировкам. */
function Trend({ region }: { region: Region }) {
  const t = useT().clanStats;
  const lang = useLang();
  const { formatNumber, formatShortDate } = useFormat();
  const [period, setPeriod] = useState<ClanPeriod>("week");
  const [metric, setMetric] = useState<TrendMetric>("members");
  const [split, setSplit] = useState<TrendSplit>("alliances");
  const { data, isLoading, isPlaceholderData } = useClanTrend(region, period);
  // по группировкам — только бойцы (кланов по группировкам сервер не считает)
  const byAlliance = metric === "members" && split === "alliances";

  const { times, series } = useMemo(() => {
    const pts = data?.points ?? [];
    const times = pts.map((p) => p.t);
    const series: LineSeries[] = byAlliance
      ? CHART_ALLIANCES.filter((a) => pts.some((p) => p.alliances[a.key])).map((a) => ({
          key: a.key,
          label: allianceName(a, lang),
          color: a.color,
          values: pts.map((p) => p.alliances[a.key] ?? 0),
        }))
      : [
          {
            key: metric,
            label: metric === "members" ? t.metricMembers : t.metricClans,
            color: "var(--acc)",
            values: pts.map((p) => (metric === "members" ? p.members : p.clans)),
          },
        ];
    return { times, series };
  }, [data, byAlliance, metric, lang, t]);

  return (
    <section className="section">
      <h2 className="section-title">
        {t.trendTitle}
        {data?.historyFrom && <small>{t.historyFrom(formatShortDate(data.historyFrom))}</small>}
      </h2>
      <div className={styles.controls}>
        <Segmented
          size="sm"
          label={t.metric}
          value={metric}
          onChange={(v) => (haptic.select(), setMetric(v as TrendMetric))}
          options={[
            { value: "members", label: t.metricMembers },
            { value: "clans", label: t.metricClans },
          ]}
        />
        {metric === "members" && (
          <Segmented
            size="sm"
            label={t.split}
            value={split}
            onChange={(v) => (haptic.select(), setSplit(v as TrendSplit))}
            options={[
              { value: "alliances", label: t.splitAlliances },
              { value: "total", label: t.splitTotal },
            ]}
          />
        )}
        <Segmented size="sm" label={t.period} value={period} onChange={(v) => setPeriod(v as ClanPeriod)} options={clanPeriods(lang)} />
      </div>
      {isLoading ? (
        <div className="skeleton" style={{ height: 300, borderRadius: 22 }} />
      ) : (
        <div style={{ opacity: isPlaceholderData ? 0.6 : 1, transition: "opacity 200ms" }}>
          <LineChart times={times} series={series} format={formatNumber} emptyText={t.trendEmpty} />
        </div>
      )}
    </section>
  );
}

function Delta({ n }: { n: number }) {
  const { formatSigned } = useFormat();
  return (
    <span className={`mono ${styles.delta}`} data-tone={n > 0 ? "up" : n < 0 ? "down" : undefined}>
      {formatSigned(n)}
    </span>
  );
}

function GoneAt({ at }: { at?: string }) {
  const { formatRelative } = useFormat();
  const now = useNow(60_000);
  return <span className={styles.aside}>{at && now ? formatRelative(at, now) : ""}</span>;
}

function ClanList({
  rows,
  region,
  empty,
  aside,
  gone = false,
}: {
  rows: ClanBrief[];
  region: Region;
  empty: string;
  aside: (r: ClanBrief) => React.ReactNode;
  /** распущенные: страница клана уже не откроется — без ссылки */
  gone?: boolean;
}) {
  const t = useT().clans;
  const { fighters } = useWords();
  if (!rows.length) return <p className={styles.empty}>{empty}</p>;
  return (
    <div className="stack" style={{ gap: 6 }}>
      {rows.map((r) => {
        const body = (
          <>
            <ClanEmblem alliance={r.alliance ?? undefined} tag={r.tag} size={38} />
            <span className={styles.rowBody}>
              <strong className="truncate">
                [{stripMc(r.tag)}] {stripMc(r.name)}
              </strong>
              <span className="dim truncate">
                {t.lvl(clanLevel(r.level))} · {fighters(r.memberCount)}
              </span>
            </span>
            {aside(r)}
          </>
        );
        return gone ? (
          <div key={r.id} className={`list-row ${styles.row}`} data-gone>
            {body}
          </div>
        ) : (
          <Link key={r.id} href={`/clans/${region}/${r.id}`} className={`list-row ${styles.row}`} onClick={() => haptic.tap()}>
            {body}
          </Link>
        );
      })}
    </div>
  );
}
