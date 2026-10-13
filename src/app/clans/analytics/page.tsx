"use client";

import Link from "next/link";
import { useState } from "react";
import { ClanEmblem } from "@/components/ClanEmblem";
import { PageHeader, StatTile } from "@/components/ui/PageHeader";
import { RegionSwitch } from "@/components/ui/RegionSwitch";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/ui/States";
import { allianceOf } from "@/features/alliances";
import {
  useClanAnalytics,
  type ClanAnalytics,
  type ClanBrief,
} from "@/features/clans";
import {
  formatNumber,
  formatRelative,
  formatShortDate,
  formatSigned,
  plural,
} from "@/lib/format";
import { stripMc } from "@/lib/mcText";
import { useApp, type Region } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { useNow } from "@/lib/useNow";
import styles from "./analytics.module.css";

const fighters = (n: number) =>
  `${formatNumber(n)} ${plural(n, ["боец", "бойца", "бойцов"])}`;
const clansWord = (n: number) =>
  `${formatNumber(n)} ${plural(n, ["клан", "клана", "кланов"])}`;
/** «none» с сервера — клан без группировки */
const allianceKey = (a: string | null) => (a && a !== "none" ? a : undefined);

/** Сводка по кланам региона по нашей истории: рост и отток бойцов, группировки, новые и распущенные, распределения. */
export default function ClanAnalyticsPage() {
  const region = useApp((s) => s.region);
  const { data, isLoading, isError, refetch, isPlaceholderData } =
    useClanAnalytics(region);

  return (
    <main className="page">
      <PageHeader
        eyebrow="Кланы"
        title="Аналитика кланов"
        aside={<RegionSwitch />}
      >
        Как меняются кланы региона {region.toUpperCase()}: кто набирает и теряет
        бойцов, группировки, новые и распущенные кланы. Сервер снимает список
        кланов раз в час.
      </PageHeader>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <RowSkeleton count={8} />
      ) : !data.totals.clans ? (
        <EmptyState
          icon="shield"
          title="Кланы ещё загружаются"
          text="Сервер скачивает список кланов этого региона - обычно это занимает пару минут."
        />
      ) : (
        <div
          style={{
            opacity: isPlaceholderData ? 0.6 : 1,
            transition: "opacity 200ms",
          }}
        >
          <Report data={data} region={region} />
        </div>
      )}
    </main>
  );
}

function Report({ data, region }: { data: ClanAnalytics; region: Region }) {
  const [growthWindow, setGrowthWindow] = useState<"day" | "week">("week");
  const t = data.totals;
  const week = data.windows.week;
  const growth = data.growth[growthWindow];
  const growthInfo = data.windows[growthWindow];

  return (
    <>
      {!week.full && (
        <p className={styles.notice}>
          История собирается с{" "}
          {data.historyFrom
            ? formatShortDate(data.historyFrom)
            : "сегодняшнего дня"}{" "}
          - изменения «за неделю» пока считаются с начала истории и наполнятся
          со временем.
        </p>
      )}

      <section className={`${styles.tiles} stagger`}>
        <StatTile
          label="Кланов"
          tone="acc"
          value={formatNumber(t.clans)}
          hint={`${formatNumber(data.disbanded.count)} распущено за неделю`}
        />
        <StatTile
          label="Бойцов в кланах"
          value={formatNumber(t.members)}
          hint={`в среднем ${t.avgMembers.toFixed(1)}, медиана ${formatNumber(t.medianMembers)}`}
        />
        <StatTile
          label="За неделю"
          tone={
            t.membersWeek > 0 ? "up" : t.membersWeek < 0 ? "down" : undefined
          }
          value={formatSigned(t.membersWeek)}
          hint={`+${formatNumber(t.joinedWeek)} пришло · −${formatNumber(t.leftWeek)} ушло`}
        />
        <StatTile
          label="За сутки"
          tone={t.membersDay > 0 ? "up" : t.membersDay < 0 ? "down" : undefined}
          value={formatSigned(t.membersDay)}
          hint="бойцов во всех кланах"
        />
        <StatTile
          label="Состав менялся"
          value={clansWord(t.changedWeek)}
          hint="за неделю"
        />
        <StatTile
          label="Возраст клана"
          value={`${formatNumber(t.medianAgeDays)} дн.`}
          hint="медиана"
        />
      </section>

      <div className="desk-cols">
        <section className="section">
          {/* переключатель — вне h2: у кнопок в заголовке секции свой цвет */}
          <div className={styles.titleWithSwitch}>
            <h2 className="section-title">
              <span>
                Набирают бойцов
                {growthInfo.since && !growthInfo.full && (
                  <small> с {formatShortDate(growthInfo.since)}</small>
                )}
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
          <ClanList
            rows={growth}
            region={region}
            empty="Пока никто не прибавил бойцов."
            aside={(r) => <Delta n={r.delta ?? 0} />}
          />
        </section>

        <section className="section">
          <h2 className="section-title">
            Теряют бойцов <small>за неделю</small>
          </h2>
          <ClanList
            rows={data.decline}
            region={region}
            empty="Никто не потерял бойцов."
            aside={(r) => <Delta n={r.delta ?? 0} />}
          />
        </section>
      </div>

      <section className="section">
        <h2 className="section-title">
          Группировки <small>доля бойцов в кланах</small>
        </h2>
        <div className={styles.alliances}>
          {data.alliances.map((a) => {
            const meta = allianceOf(allianceKey(a.alliance));
            return (
              <div
                key={a.alliance}
                className={styles.alliance}
                style={{ "--c": meta.color } as React.CSSProperties}
              >
                <div className={styles.allianceHead}>
                  <span className="dot" style={{ color: meta.color }} />
                  <strong>{meta.label}</strong>
                  <span className="mono">{(a.share * 100).toFixed(1)} %</span>
                </div>
                <div className={styles.track}>
                  <span style={{ width: `${a.share * 100}%` }} />
                </div>
                <div className={styles.allianceStats}>
                  <span>{clansWord(a.clans)}</span>
                  <span>{fighters(a.members)}</span>
                  <span>в среднем {a.avgMembers.toFixed(1)}</span>
                  <span
                    data-tone={
                      a.membersWeek > 0
                        ? "up"
                        : a.membersWeek < 0
                          ? "down"
                          : undefined
                    }
                  >
                    {formatSigned(a.membersWeek)} за неделю
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="desk-cols">
        <section className="section">
          <h2 className="section-title">
            Новые кланы{" "}
            <small>{clansWord(data.newClans.count)} за неделю</small>
          </h2>
          <ClanList
            rows={data.newClans.list}
            region={region}
            empty="За неделю новых кланов не было."
            aside={(r) => (
              <span className={styles.aside}>
                {r.ageDays ? `${r.ageDays} дн.` : "сегодня"}
              </span>
            )}
          />
        </section>

        <section className="section">
          <h2 className="section-title">
            Повысили уровень{" "}
            <small>{clansWord(data.levelUps.count)} за неделю</small>
          </h2>
          <ClanList
            rows={data.levelUps.list}
            region={region}
            empty={
              week.full
                ? "За неделю никто не повысил уровень."
                : "Появится, когда накопится история."
            }
            aside={(r) => (
              <span className={styles.aside}>
                {r.fromLevel} → <b>{r.level}</b>
              </span>
            )}
          />
        </section>
      </div>

      <section className="section">
        <h2 className="section-title">
          Распущены <small>{clansWord(data.disbanded.count)} за неделю</small>
        </h2>
        <ClanList
          rows={data.disbanded.list}
          region={region}
          empty="За неделю ни один клан не распался."
          gone
          aside={(r) => <GoneAt at={r.goneAt} />}
        />
      </section>

      <section className="section">
        <h2 className="section-title">Распределения</h2>
        <div className={styles.dists}>
          <Distribution
            title="По уровню"
            rows={data.levels.map((l) => ({
              label: `${l.level} ур.`,
              value: l.clans,
              hint: fighters(l.members),
            }))}
          />
          <Distribution
            title="По составу"
            rows={data.sizes.map((s) => ({ label: s.label, value: s.clans }))}
          />
          <Distribution
            title="По возрасту"
            rows={data.ages.map((a) => ({ label: a.label, value: a.clans }))}
          />
        </div>
      </section>
    </>
  );
}

function Delta({ n }: { n: number }) {
  return (
    <span
      className={`mono ${styles.delta}`}
      data-tone={n > 0 ? "up" : n < 0 ? "down" : undefined}
    >
      {formatSigned(n)}
    </span>
  );
}

function GoneAt({ at }: { at?: string }) {
  const now = useNow(60_000);
  return (
    <span className={styles.aside}>
      {at && now ? formatRelative(at, now) : ""}
    </span>
  );
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
    <div className={`stack ${gone ? "desk-grid" : ""}`} style={{ gap: 6 }}>
      {rows.map((r) => {
        const body = (
          <>
            <ClanEmblem
              alliance={allianceKey(r.alliance)}
              tag={r.tag}
              size={38}
            />
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
          <Link
            key={r.id}
            href={`/clans/${region}/${r.id}`}
            className={`list-row ${styles.row}`}
            onClick={() => haptic.tap()}
          >
            {body}
          </Link>
        );
      })}
    </div>
  );
}

function Distribution({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number; hint?: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className={`glass ${styles.dist}`}>
      <h3>{title}</h3>
      {rows.map((r) => (
        <div key={r.label} className={styles.distRow} title={r.hint}>
          <span className={styles.distLabel}>{r.label}</span>
          <span className={styles.track}>
            <span style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="mono">{formatNumber(r.value)}</span>
        </div>
      ))}
    </div>
  );
}
