"use client";

import { useSaleTiming, type SaleTiming as Timing, type SellParams } from "@/features/sell";
import { useFormat, useT } from "@/i18n/client";
import styles from "./SaleTiming.module.css";

/** Части суток по Москве: [с, до) часов. */
const PERIODS = [
  { id: "night", icon: "🌙", from: 0, to: 6 },
  { id: "morning", icon: "🌅", from: 6, to: 12 },
  { id: "day", icon: "☀️", from: 12, to: 18 },
  { id: "evening", icon: "🌆", from: 18, to: 24 },
] as const;
type PeriodId = (typeof PERIODS)[number]["id"];

/** Доля всех покупок за часть суток: с какой — «много», с какой — «мало» покупателей. */
const BUSY = 0.3;
const QUIET = 0.15;
/** Разница меньше — «время почти не влияет». */
const FLAT = 1;

interface Period {
  id: PeriodId;
  icon: string;
  from: number;
  to: number;
  /** средневзвешенное по сделкам отклонение цены, %; null — мало данных */
  delta: number | null;
  /** доля всех покупок, 0–1 */
  share: number;
}

/** Часы → четыре части суток: цена — среднее по часам, взвешенное числом сделок. */
function periodsOf(t: Timing): Period[] {
  const total = t.hours.reduce((s, h) => s + h.deals, 0) || 1;
  return PERIODS.map((p) => {
    const hours = t.hours.filter((h) => h.key >= p.from && h.key < p.to);
    const known = hours.filter((h) => h.delta != null);
    const w = known.reduce((s, h) => s + h.deals, 0);
    return {
      ...p,
      delta: w ? Math.round((known.reduce((s, h) => s + h.delta! * h.deals, 0) / w) * 10) / 10 : null,
      share: hours.reduce((s, h) => s + h.deals, 0) / total,
    };
  });
}

/**
 * «Когда выгоднее продавать» простыми словами: одна фраза-вывод, четыре части суток
 * (цена относительно обычной и сколько покупателей), дни недели — когда данных хватает.
 */
export function SaleTiming(p: Omit<SellParams, "amount">) {
  const t = useT().sell.timing;
  const { formatNumber, locale } = useFormat();
  const { data, isPlaceholderData } = useSaleTiming(p);
  if (!data) return null;

  const pct = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toLocaleString(locale, { maximumFractionDigits: 1 })}%`;

  if (!data.deals) {
    return (
      <section className={styles.timing}>
        <h3 className={styles.title}>{t.title}</h3>
        <p className={styles.note}>{t.noData}</p>
      </section>
    );
  }

  const periods = periodsOf(data);
  // лучшая часть суток — только среди тех, где покупателей не мало (иначе лот может не уйти)
  const candidates = periods.filter((x) => x.delta != null && x.share >= QUIET);
  const best = [...candidates].sort((a, b) => b.delta! - a.delta!)[0];
  const spread = candidates.length ? Math.max(...candidates.map((x) => x.delta!)) - Math.min(...candidates.map((x) => x.delta!)) : 0;
  const flat = !best || spread < FLAT || best.delta! < FLAT / 2;
  const busy = (s: number) => (s >= BUSY ? "busy" : s >= QUIET ? "normal" : "quiet");

  const days = data.weekdays.filter((d) => d.delta != null);
  const bestDay = data.weekdaysReliable && days.length ? [...days].sort((a, b) => b.delta! - a.delta!)[0] : null;

  return (
    <section className={styles.timing} style={{ opacity: isPlaceholderData ? 0.5 : 1 }}>
      <h3 className={styles.title}>{t.title}</h3>

      <p className={styles.verdict} data-flat={flat || undefined}>
        {flat ? t.flat : t.verdict(t.periods[best.id].when, `${best.from}–${best.to}`, pct(best.delta!), t.busy[busy(best.share)])}
      </p>

      {/* подробности свёрнуты: вывод выше и так отвечает на вопрос */}
      <details className={styles.more}>
        <summary>{t.details}</summary>

        <div className={styles.periods}>
          {periods.map((x) => (
            <div
              key={x.id}
              className={styles.period}
              data-best={(!flat && x.id === best?.id) || undefined}
              data-tone={x.delta == null || Math.abs(x.delta) < 0.5 ? undefined : x.delta > 0 ? "up" : "down"}
            >
              <span className={styles.periodHead}>
                <span aria-hidden>{x.icon}</span>
                <span>
                  <b>{t.periods[x.id].name}</b>
                  <small className="mono">
                    {String(x.from).padStart(2, "0")}–{String(x.to).padStart(2, "0")}
                  </small>
                </span>
              </span>
              <strong className={`mono ${styles.delta}`}>{x.delta == null ? "—" : pct(x.delta)}</strong>
              <span className={styles.meter} aria-hidden>
                <span style={{ width: `${Math.min(100, (x.share / 0.4) * 100)}%` }} data-level={busy(x.share)} />
              </span>
              <small className={styles.busy}>{t.busy[busy(x.share)]}</small>
            </div>
          ))}
        </div>

        {bestDay ? (
          <div className={styles.days}>
            <span className={styles.daysLabel}>{t.byDay}</span>
            <div className={styles.dayRow}>
              {data.weekdays.map((d) => (
                <span
                  key={d.key}
                  className={styles.day}
                  data-best={d.key === bestDay.key || undefined}
                  data-tone={d.delta == null || Math.abs(d.delta) < 0.5 ? undefined : d.delta > 0 ? "up" : "down"}
                >
                  <b>{t.days[d.key - 1]}</b>
                  <span className="mono">{d.delta == null ? "—" : pct(d.delta)}</span>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className={styles.note}>{t.fewWeeks(data.weeks)}</p>
        )}

        <p className={styles.note}>{t.basis(formatNumber(data.deals), data.days)}</p>
      </details>
    </section>
  );
}
