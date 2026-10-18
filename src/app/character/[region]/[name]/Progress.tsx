"use client";

import Link from "next/link";
import { useState } from "react";
import { Segmented } from "@/components/ui/Segmented";
import { useProgress, type Progress, type ProgressPeriod } from "@/features/character";
import type { Meta } from "@/features/meta";
import { useFormat, useLang, useT } from "@/i18n/client";
import { isNotFound } from "@/lib/api";
import type { Region } from "@/lib/store";
import styles from "./progress.module.css";

/** Главные цифры — плитками; остальные статы — списком «что ещё выросло». */
const KEY_STATS = ["kil", "dea", "pla-tim", "mut-kil"];
/** Сколько строк «что ещё выросло» видно сразу. */
const TOP = 5;

const HOUR = 3_600_000;

/** Прогресс игрока за неделю / месяц: прирост убийств, часов в игре, K/D за период и активность по дням. */
export function PlayerProgress({ region, name, meta }: { region: Region; name: string; meta?: Meta }) {
  const t = useT().player.progress;
  const [period, setPeriod] = useState<ProgressPeriod>("week");
  const { data, isLoading, error, isPlaceholderData } = useProgress(region, name, period);
  const { formatShortDate } = useFormat();

  // ещё не открывали (снимок пишется прямо сейчас) или снимок пока один — копим историю
  const fresh = isNotFound(error) || (data && !data.from);
  if (error && !fresh) return null;

  return (
    <section className={`section ${styles.progress}`} style={{ opacity: isPlaceholderData ? 0.6 : 1 }}>
      <h2 className="section-title">
        {t.title}
        {data?.since && <small>{t.since(formatShortDate(data.since))}</small>}
      </h2>
      {!fresh && (
        <Segmented
          size="sm"
          label={t.periodAria}
          value={period}
          onChange={(p) => setPeriod(p as ProgressPeriod)}
          options={[
            { value: "week", label: t.week },
            { value: "month", label: t.month },
          ]}
        />
      )}
      {isLoading ? (
        <div className="skeleton" style={{ height: 180, borderRadius: 22 }} />
      ) : fresh || !data ? (
        <div className={`glass ${styles.empty}`}>
          <span aria-hidden>📈</span>
          <p>{t.empty}</p>
        </div>
      ) : (
        <>
          <Body p={data} meta={meta} />
          {data.to && <RecapLink region={region} name={name} month={data.to.slice(0, 7)} />}
        </>
      )}
    </section>
  );
}

/** Ссылка на итоги месяца последнего снимка (день снимка — по Москве) — картинка-сторис. */
function RecapLink({ region, name, month }: { region: Region; name: string; month: string }) {
  const t = useT().player.recap;
  return (
    <Link href={`/character/${region}/${encodeURIComponent(name)}/recap/${month}`} className={`btn ${styles.recap}`}>
      {t.link(t.months[Number(month.slice(5)) - 1])}
    </Link>
  );
}

function Body({ p, meta }: { p: Progress; meta?: Meta }) {
  const t = useT().player.progress;
  const lang = useLang();
  const { formatNumber } = useFormat();
  const d = (id: string) => p.deltas[id] ?? 0;
  const kills = d("kil");
  const deaths = d("dea");
  const hours = d("pla-tim") / HOUR;
  const plus = (n: number) => (n > 0 ? `+${formatNumber(n)}` : "0");

  const rest = Object.entries(p.deltas)
    .filter(([id]) => !KEY_STATS.includes(id) && meta?.stats[id]?.[2] !== "DATE")
    .map(([id, v]) => {
      const m = meta?.stats[id];
      const duration = m?.[2] === "DURATION";
      return {
        id,
        label: (lang === "en" && m?.[3]) || m?.[0] || id,
        value: duration ? t.hours(formatNumber(Math.round((v / HOUR) * 10) / 10)) : `+${formatNumber(v)}`,
        // длительности в мс — сортируем по часам, иначе они всегда наверху
        weight: duration ? v / HOUR : v,
      };
    })
    .sort((a, b) => b.weight - a.weight);

  return (
    <>
      <p className={styles.window}>{p.full ? t.window(p.days) : t.partial(p.days)}</p>

      <div className={styles.tiles}>
        <Tile label={t.kills} value={plus(kills)} tone="acc" />
        <Tile label={t.played} value={hours > 0 ? `+${t.hours(formatNumber(Math.round(hours * 10) / 10))}` : "0"} tone="cyan" />
        <Tile
          label={t.kd}
          value={deaths ? (kills / deaths).toFixed(2) : kills ? "∞" : "—"}
          hint={t.kdHint(formatNumber(kills), formatNumber(deaths))}
          tone="violet"
        />
        <Tile label={t.mutants} value={plus(d("mut-kil"))} tone="amber" />
      </div>

      {p.period === "week" && p.daily.length >= 2 && <Days daily={p.daily} />}

      {rest.length > 0 && (
        <div className={styles.rest}>
          <span className={styles.restTitle}>{t.more}</span>
          <dl>
            {rest.slice(0, TOP).map((s) => (
              <div key={s.id}>
                <dt>{s.label}</dt>
                <dd className="mono">{s.value}</dd>
              </div>
            ))}
          </dl>
          {rest.length > TOP && (
            <details>
              <summary>{t.showAll(rest.length)}</summary>
              <dl>
                {rest.slice(TOP).map((s) => (
                  <div key={s.id}>
                    <dt>{s.label}</dt>
                    <dd className="mono">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </div>
      )}
    </>
  );
}

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone: string }) {
  return (
    <div className={styles.tile} data-tone={tone}>
      <span>{label}</span>
      <strong className="mono">{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

/** Часы в игре по дням — крупные столбики с подписью дня и часов. */
function Days({ daily }: { daily: Progress["daily"] }) {
  const t = useT();
  const { formatNumber } = useFormat();
  const max = Math.max(...daily.map((x) => x["pla-tim"]), 1);
  return (
    <div className={styles.days}>
      <span className={styles.restTitle}>{t.player.progress.activity}</span>
      <div className={styles.bars}>
        {daily.slice(-7).map((x) => {
          const h = x["pla-tim"] / HOUR;
          const wd = (new Date(x.day).getUTCDay() + 6) % 7;
          return (
            <div key={x.day} className={styles.bar} title={t.player.progress.dayKills(formatNumber(x.kil))}>
              <small className="mono">{h >= 0.1 ? formatNumber(Math.round(h * 10) / 10) : "0"}</small>
              <span style={{ "--h": x["pla-tim"] / max } as React.CSSProperties} data-zero={h < 0.1 || undefined} />
              <b>{t.sell.timing.days[wd]}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}
