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
import { CHART_ALLIANCES, chartAlliance } from "@/features/alliances";
import {
  CLAN_PERIODS,
  MAX_MEMBERS,
  useClanAnalytics,
  useClanTrend,
  type ClanAnalytics,
  type ClanBrief,
  type ClanPeriod,
} from "@/features/clans";
import { formatNumber, formatRelative, formatShortDate, formatSigned, plural } from "@/lib/format";
import { stripMc } from "@/lib/mcText";
import { useApp, type Region } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { useNow } from "@/lib/useNow";
import styles from "./analytics.module.css";

const fighters = (n: number) => `${formatNumber(n)} ${plural(n, ["боец", "бойца", "бойцов"])}`;
const clansWord = (n: number) => `${formatNumber(n)} ${plural(n, ["клан", "клана", "кланов"])}`;

/** Сводка по кланам региона по нашей истории: динамика, рост и отток бойцов, группировки, распределения. */
export default function ClanAnalyticsPage() {
  const region = useApp((s) => s.region);
  const { data, isLoading, isError, refetch, isPlaceholderData } = useClanAnalytics(region);

  return (
    <main className="page">
      <PageHeader eyebrow="Кланы" title="Аналитика кланов" aside={<RegionSwitch />} />

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <RowSkeleton count={8} />
      ) : !data.totals.clans ? (
        <EmptyState icon="shield" title="Кланы ещё загружаются" text="Сервер скачивает список кланов этого региона - обычно это занимает пару минут." />
      ) : (
        <div style={{ opacity: isPlaceholderData ? 0.6 : 1, transition: "opacity 200ms" }}>
          <Report data={data} region={region} />
        </div>
      )}
    </main>
  );
}

function Report({ data, region }: { data: ClanAnalytics; region: Region }) {
  const [growthWindow, setGrowthWindow] = useState<"day" | "week">("week");
  const t = data.totals;
  const growth = data.growth[growthWindow];
  const growthInfo = data.windows[growthWindow];

  return (
    <>
      {!data.windows.week.full && (
        <p className={styles.notice}>
          История собирается с {data.historyFrom ? formatShortDate(data.historyFrom) : "сегодняшнего дня"} - изменения «за неделю» пока считаются с
          начала истории и наполнятся со временем.
        </p>
      )}

      <section className={`${styles.tiles} stagger`}>
        <StatTile label="Кланов" tone="acc" value={formatNumber(t.clans)} hint={`${formatNumber(data.disbanded.count)} распущено за неделю`} />
        <StatTile label="Бойцов в кланах" value={formatNumber(t.members)} hint={`в среднем ${t.avgMembers.toFixed(1)}, медиана ${formatNumber(t.medianMembers)}`} />
        <StatTile label="Полный состав" value={clansWord(t.full)} hint={`${MAX_MEMBERS} из ${MAX_MEMBERS} бойцов`} />
        <StatTile
          label="За неделю"
          tone={t.membersWeek > 0 ? "up" : t.membersWeek < 0 ? "down" : undefined}
          value={formatSigned(t.membersWeek)}
          hint={`+${formatNumber(t.joinedWeek)} пришло · −${formatNumber(t.leftWeek)} ушло`}
        />
        <StatTile
          label="За сутки"
          tone={t.membersDay > 0 ? "up" : t.membersDay < 0 ? "down" : undefined}
          value={formatSigned(t.membersDay)}
          hint="бойцов во всех кланах"
        />
        <StatTile label="Возраст клана" value={`${formatNumber(t.medianAgeDays)} дн.`} hint="медиана" />
      </section>

      <Trend region={region} />

      <div className="desk-cols">
        <section className="section">
          {/* переключатель — вне h2: у кнопок в заголовке секции свой цвет */}
          <div className={styles.titleWithSwitch}>
            <h2 className="section-title">
              <span>
                Набирают бойцов
                {growthInfo.since && !growthInfo.full && <small> с {formatShortDate(growthInfo.since)}</small>}
              </span>
            </h2>
            <Segmented
              size="sm"
              label="Окно"
              value={growthWindow}
              onChange={(v) => setGrowthWindow(v as "day" | "week")}
              options={[
                { value: "day", label: "Сутки" },
                { value: "week", label: "Неделя" },
              ]}
            />
          </div>
          <ClanList rows={growth} region={region} empty="Пока никто не прибавил бойцов." aside={(r) => <Delta n={r.delta ?? 0} />} />
        </section>

        <section className="section">
          <h2 className="section-title">
            Теряют бойцов <small>за неделю</small>
          </h2>
          <ClanList rows={data.decline} region={region} empty="Никто не потерял бойцов." aside={(r) => <Delta n={r.delta ?? 0} />} />
        </section>
      </div>

      <section className="section">
        <h2 className="section-title">
          Группировки <small>доля бойцов</small>
        </h2>
        <div className={styles.alliances}>
          {data.alliances.map((a) => {
            const meta = chartAlliance(a.alliance);
            const color = meta?.color ?? "var(--text-3)";
            return (
              <div key={a.alliance} className={styles.alliance} style={{ "--c": color } as React.CSSProperties}>
                <div className={styles.allianceHead}>
                  <span className={styles.swatch} style={{ background: color }} />
                  <strong>{meta?.label ?? a.alliance}</strong>
                  <span className="mono">{(a.share * 100).toFixed(1)} %</span>
                </div>
                <div className={styles.track}>
                  <span style={{ width: `${a.share * 100}%` }} />
                </div>
                <div className={styles.allianceStats}>
                  <span>{clansWord(a.clans)}</span>
                  <span>{fighters(a.members)}</span>
                  <span>в среднем {a.avgMembers.toFixed(1)}</span>
                  <span data-tone={a.membersWeek > 0 ? "up" : a.membersWeek < 0 ? "down" : undefined}>{formatSigned(a.membersWeek)} за неделю</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">
          Размер кланов <small>сколько кланов с 1, 2 … {MAX_MEMBERS} бойцами</small>
        </h2>
        <div className={styles.chartCard}>
          <BarChart
            height={180}
            bars={data.sizes.map((s) => ({
              label: String(s.members),
              value: s.clans,
              tip: `${clansWord(s.clans)} по ${fighters(s.members)}`,
            }))}
          />
        </div>
      </section>

      <div className="desk-cols">
        <section className="section">
          <h2 className="section-title">По уровню</h2>
          <div className={styles.chartCard}>
            <BarChart
              bars={data.levels.map((l) => ({
                label: `${l.level} ур.`,
                value: l.clans,
                tip: `${l.level} уровень: ${clansWord(l.clans)}, ${fighters(l.members)}`,
              }))}
            />
          </div>
        </section>
        <section className="section">
          <h2 className="section-title">По возрасту</h2>
          <div className={styles.chartCard}>
            <BarChart bars={data.ages.map((a) => ({ label: a.label, value: a.clans, tip: `${a.label}: ${clansWord(a.clans)}` }))} />
          </div>
        </section>
      </div>

      <div className="desk-cols">
        <section className="section">
          <h2 className="section-title">
            Новые кланы <small>{clansWord(data.newClans.count)} за неделю</small>
          </h2>
          <ClanList
            rows={data.newClans.list}
            region={region}
            empty="За неделю новых кланов не было."
            aside={(r) => <span className={styles.aside}>{r.ageDays ? `${r.ageDays} дн.` : "сегодня"}</span>}
          />
        </section>

        <section className="section">
          <h2 className="section-title">
            Распущены <small>{clansWord(data.disbanded.count)} за неделю</small>
          </h2>
          <ClanList rows={data.disbanded.list} region={region} empty="За неделю ни один клан не распался." gone aside={(r) => <GoneAt at={r.goneAt} />} />
        </section>
      </div>
    </>
  );
}

type TrendMetric = "members" | "clans";
type TrendSplit = "total" | "alliances";

/** Бойцы и кланы региона во времени: всего или по группировкам. */
function Trend({ region }: { region: Region }) {
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
          label: a.label,
          color: a.color,
          values: pts.map((p) => p.alliances[a.key] ?? 0),
        }))
      : [
          {
            key: metric,
            label: metric === "members" ? "Бойцы" : "Кланы",
            color: "var(--acc)",
            values: pts.map((p) => (metric === "members" ? p.members : p.clans)),
          },
        ];
    return { times, series };
  }, [data, byAlliance, metric]);

  return (
    <section className="section">
      <h2 className="section-title">
        Динамика региона
        {data?.historyFrom && <small>история с {formatShortDate(data.historyFrom)}</small>}
      </h2>
      <div className={styles.controls}>
        <Segmented
          size="sm"
          label="Показатель"
          value={metric}
          onChange={(v) => (haptic.select(), setMetric(v as TrendMetric))}
          options={[
            { value: "members", label: "Бойцы" },
            { value: "clans", label: "Кланы" },
          ]}
        />
        {metric === "members" && (
          <Segmented
            size="sm"
            label="Разбивка"
            value={split}
            onChange={(v) => (haptic.select(), setSplit(v as TrendSplit))}
            options={[
              { value: "alliances", label: "По группировкам" },
              { value: "total", label: "Всего" },
            ]}
          />
        )}
        <Segmented size="sm" label="Период" value={period} onChange={(v) => setPeriod(v as ClanPeriod)} options={CLAN_PERIODS} />
      </div>
      {isLoading ? (
        <div className="skeleton" style={{ height: 300, borderRadius: 22 }} />
      ) : (
        <div style={{ opacity: isPlaceholderData ? 0.6 : 1, transition: "opacity 200ms" }}>
          <LineChart
            times={times}
            series={series}
            format={formatNumber}
            emptyText="История ещё собирается - график появится после следующих снимков."
          />
        </div>
      )}
    </section>
  );
}

function Delta({ n }: { n: number }) {
  return (
    <span className={`mono ${styles.delta}`} data-tone={n > 0 ? "up" : n < 0 ? "down" : undefined}>
      {formatSigned(n)}
    </span>
  );
}

function GoneAt({ at }: { at?: string }) {
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
                ур. {r.level} · {fighters(r.memberCount)}
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
