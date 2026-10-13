"use client";

import { useState } from "react";
import { TrendChart } from "@/components/TrendChart/TrendChart";
import { StatTile } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { useClanMetrics, type ClanPeriod, type ClanWindow } from "@/features/clans";
import { formatNumber, formatRelative, formatShortDate, formatSigned, plural } from "@/lib/format";
import type { Region } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import styles from "./clan.module.css";

const PERIODS: { value: ClanPeriod; label: string }[] = [
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
  { value: "all", label: "Всё время" },
];

const WINDOW_LABEL: Record<ClanWindow["key"], string> = {
  day: "За сутки",
  week: "За неделю",
  month: "За месяц",
};


const fighters = (n: number) => `${formatNumber(n)} ${plural(n, ["боец", "бойца", "бойцов"])}`;

/**
 * Динамика клана по нашей истории (снимки раз в час): изменение состава за сутки / неделю / месяц,
 * пик, место по численности, когда взят уровень, график бойцов.
 */
export function ClanMetrics({ region, id }: { region: Region; id: string }) {
  const [period, setPeriod] = useState<ClanPeriod>("week");
  const { data, isLoading, isError, isPlaceholderData } = useClanMetrics(region, id, period);
  const now = useNow(60_000);

  if (isError) return null;
  if (isLoading || !data) {
    return (
      <section className="section">
        <div className="skeleton" style={{ height: 320, borderRadius: 22 }} />
      </section>
    );
  }
  if (!data.available) {
    return (
      <section className="section">
        <h2 className="section-title">Динамика</h2>
        <p className={styles.note}>История клана появится, когда сервер загрузит список кланов региона - обычно через пару минут.</p>
      </section>
    );
  }

  const points = (data.series ?? []).map((p) => ({ t: p.t, v: p.memberCount }));
  // история моложе суток — изменений ещё нет, честно говорим, с какого момента собираем
  const young = !data.historyFrom || (now && now - new Date(data.historyFrom).getTime() < 86_400_000);

  return (
    <section className="section" style={{ opacity: isPlaceholderData ? 0.6 : 1, transition: "opacity 200ms" }}>
      <h2 className="section-title">
        Динамика
        {data.historyFrom && <small>история с {formatShortDate(data.historyFrom)}</small>}
      </h2>

      {data.gone && <p className={styles.gone}>Клан пропал из списка EXBO {formatShortDate(data.gone)} - скорее всего, распущен.</p>}

      <div className={`${styles.metrics} stagger`}>
        {data.windows?.map((w) => (
          <StatTile
            key={w.key}
            label={WINDOW_LABEL[w.key]}
            tone={w.members ? (w.members > 0 ? "up" : "down") : undefined}
            value={w.members == null ? "—" : formatSigned(w.members)}
            hint={
              w.members == null
                ? "нет истории"
                : w.full
                  ? plural(Math.abs(w.members), ["боец", "бойца", "бойцов"])
                  : `с ${formatShortDate(w.since!)} (история короче)`
            }
          />
        ))}
        {data.peak && (
          <StatTile
            label="Пик состава"
            value={fighters(data.peak.memberCount)}
            hint={data.peak.memberCount > (data.current?.memberCount ?? 0) && now ? formatRelative(data.peak.at, now) : "сейчас"}
          />
        )}
        {data.sizePlace && (
          <StatTile
            label="По численности"
            value={`${formatNumber(data.sizePlace.place)}-й`}
            hint={`из ${formatNumber(data.sizePlace.of)} кланов ${region.toUpperCase()}`}
          />
        )}
        <StatTile
          label={`Уровень ${data.current?.level ?? "—"}`}
          value={data.levelSince ? formatShortDate(data.levelSince) : "—"}
          hint={data.levelSince ? "когда взят" : "взят до начала истории"}
        />
      </div>

      <div className={styles.periodBar}>
        <Segmented size="sm" label="Период графика" value={period} onChange={(p) => setPeriod(p as ClanPeriod)} options={PERIODS} />
      </div>
      {points.length >= 2 ? (
        <TrendChart points={points} format={fighters} caption="сейчас" />
      ) : (
        <p className={styles.note}>График появится после следующих снимков - сервер обновляет кланы раз в час.</p>
      )}
      {young && (
        <p className={styles.note}>
          Сервер собирает историю кланов с {data.historyFrom ? formatShortDate(data.historyFrom) : "сегодняшнего дня"} - изменения за сутки, неделю и месяц
          наполнятся со временем.
        </p>
      )}
    </section>
  );
}
