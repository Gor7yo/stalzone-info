"use client";

import { useState } from "react";
import { TrendChart } from "@/components/TrendChart/TrendChart";
import { Segmented } from "@/components/ui/Segmented";
import { CLAN_PERIODS, useClanMetrics, type ClanPeriod } from "@/features/clans";
import { formatNumber, formatShortDate, plural } from "@/lib/format";
import type { Region } from "@/lib/store";
import styles from "./clan.module.css";

const fighters = (n: number) => `${formatNumber(n)} ${plural(n, ["боец", "бойца", "бойцов"])}`;

/** График бойцов клана по нашей истории (сервер снимает кланы раз в час). */
export function ClanMetrics({ region, id }: { region: Region; id: string }) {
  const [period, setPeriod] = useState<ClanPeriod>("week");
  const { data, isLoading, isError, isPlaceholderData } = useClanMetrics(region, id, period);

  if (isError || (data && !data.available)) return null;

  const points = (data?.series ?? []).map((p) => ({ t: p.t, v: p.memberCount }));

  return (
    <section className="section" style={{ opacity: isPlaceholderData ? 0.6 : 1, transition: "opacity 200ms" }}>
      <h2 className="section-title">
        Бойцы
        {data?.historyFrom && <small>история с {formatShortDate(data.historyFrom)}</small>}
      </h2>
      <div className={styles.periodBar}>
        <Segmented size="sm" label="Период графика" value={period} onChange={(p) => setPeriod(p as ClanPeriod)} options={CLAN_PERIODS} />
      </div>
      {isLoading || !data ? (
        <div className="skeleton" style={{ height: 260, borderRadius: 22 }} />
      ) : points.length >= 2 ? (
        <TrendChart points={points} format={fighters} caption="сейчас" />
      ) : (
        <p className={styles.note}>График появится после следующих снимков - сервер обновляет кланы раз в час.</p>
      )}
    </section>
  );
}
