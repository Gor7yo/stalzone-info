"use client";

import { useState } from "react";
import { TrendChart } from "@/components/TrendChart/TrendChart";
import { Segmented } from "@/components/ui/Segmented";
import { clanPeriods, useClanMetrics, type ClanPeriod } from "@/features/clans";
import { useFormat, useLang, useT } from "@/i18n/client";
import type { Region } from "@/lib/store";
import styles from "./clan.module.css";

/** График бойцов клана по нашей истории (сервер снимает кланы раз в час). */
export function ClanMetrics({ region, id }: { region: Region; id: string }) {
  const t = useT().clans;
  const lang = useLang();
  const { formatNumber, formatShortDate } = useFormat();
  const [period, setPeriod] = useState<ClanPeriod>("week");
  const { data, isLoading, isError, isPlaceholderData } = useClanMetrics(region, id, period);

  if (isError || (data && !data.available)) return null;

  const points = (data?.series ?? []).map((p) => ({ t: p.t, v: p.memberCount }));
  const fighters = (n: number) => t.fighters(n, formatNumber(n));

  return (
    <section className="section" style={{ opacity: isPlaceholderData ? 0.6 : 1, transition: "opacity 200ms" }}>
      <h2 className="section-title">
        {t.fightersTitle}
        {data?.historyFrom && <small>{t.historyFrom(formatShortDate(data.historyFrom))}</small>}
      </h2>
      <div className={styles.periodBar}>
        <Segmented
          size="sm"
          label={t.chartPeriod}
          value={period}
          onChange={(p) => setPeriod(p as ClanPeriod)}
          options={clanPeriods(lang)}
        />
      </div>
      {isLoading || !data ? (
        <div className="skeleton" style={{ height: 260, borderRadius: 22 }} />
      ) : points.length >= 2 ? (
        <TrendChart points={points} format={fighters} caption={t.now} />
      ) : (
        <p className={styles.note}>{t.chartSoon}</p>
      )}
    </section>
  );
}
