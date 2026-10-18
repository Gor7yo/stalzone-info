"use client";

import { useSaleTiming, type SellParams, type TimingSlot } from "@/features/sell";
import { useFormat, useT } from "@/i18n/client";
import styles from "./SaleTiming.module.css";

/**
 * «Когда выгоднее продавать»: два графика — по часам суток и по дням недели (МСК).
 * Столбик вверх (зелёный) — дороже обычного для того же дня, вниз (красный) — дешевле;
 * бледный — мало сделок, без значения. Насыщенность — сколько сделок (час «живой» или нет).
 */
export function SaleTiming(p: Omit<SellParams, "amount">) {
  const t = useT().sell.timing;
  const { formatNumber, locale } = useFormat();
  const { data, isPlaceholderData } = useSaleTiming(p);
  if (!data) return null;

  const pct = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toLocaleString(locale, { maximumFractionDigits: 1 })}%`;
  const hour = (h: number) => `${String(h).padStart(2, "0")}:00`;

  return (
    <section className={styles.timing} style={{ opacity: isPlaceholderData ? 0.5 : 1 }}>
      <h3 className={styles.title}>{t.title}</h3>
      {!data.deals ? (
        <p className={styles.note}>{t.noData}</p>
      ) : (
        <>
          <ul className={styles.summary}>
            {data.now && data.now.delta != null && Math.abs(data.now.delta) >= 1 && (
              <li data-tone={data.now.delta > 0 ? "up" : "down"}>
                {data.now.delta > 0 ? t.nowHigher(pct(data.now.delta)) : t.nowLower(pct(data.now.delta))}
              </li>
            )}
            {data.bestHour && (
              <li data-tone="up">
                {t.best(`${hour(data.bestHour.key)}–${hour((data.bestHour.key + 1) % 24)}`, pct(data.bestHour.delta!))}
              </li>
            )}
            {data.worstHour && data.worstHour.delta! < 0 && (
              <li data-tone="down">
                {t.worst(`${hour(data.worstHour.key)}–${hour((data.worstHour.key + 1) % 24)}`, pct(data.worstHour.delta!))}
              </li>
            )}
          </ul>

          <Bars
            label={t.byHour}
            slots={data.hours}
            current={data.now?.key ?? null}
            tick={(s) => (s.key % 3 === 0 ? String(s.key) : "")}
            title={(s) => `${hour(s.key)} · ${s.delta != null ? pct(s.delta) : t.few} · ${t.deals(formatNumber(s.deals))}`}
          />

          <Bars
            label={t.byDay}
            slots={data.weekdays}
            current={null}
            tick={(s) => t.days[s.key - 1]}
            title={(s) => `${t.days[s.key - 1]} · ${s.delta != null ? pct(s.delta) : t.few} · ${t.deals(formatNumber(s.deals))}`}
            dim={!data.weekdaysReliable}
          />
          {!data.weekdaysReliable && <p className={styles.note}>{t.fewWeeks(data.weeks)}</p>}

          <p className={styles.note}>{t.basis(formatNumber(data.deals), data.days)}</p>
        </>
      )}
    </section>
  );
}

function Bars({
  label,
  slots,
  current,
  tick,
  title,
  dim = false,
}: {
  label: string;
  slots: TimingSlot[];
  current: number | null;
  tick: (s: TimingSlot) => string;
  title: (s: TimingSlot) => string;
  dim?: boolean;
}) {
  // масштаб — по самому большому отклонению (не меньше 3%, чтобы шум ±0,5% не выглядел пиком)
  const max = Math.max(3, ...slots.map((s) => Math.abs(s.delta ?? 0)));
  const most = Math.max(1, ...slots.map((s) => s.deals));
  return (
    <figure className={styles.chart} data-dim={dim || undefined}>
      <figcaption>{label}</figcaption>
      <div className={styles.bars} role="img" aria-label={label} style={{ "--n": slots.length } as React.CSSProperties}>
        {slots.map((s) => {
          const h = s.delta != null ? (Math.abs(s.delta) / max) * 50 : 0;
          return (
            <span
              key={s.key}
              className={styles.slot}
              title={title(s)}
              data-current={s.key === current || undefined}
              // насыщенность: 35–100% по числу сделок — видно, когда рынок «живой»
              style={{ "--alpha": 0.35 + 0.65 * (s.deals / most) } as React.CSSProperties}
            >
              {s.delta == null ? (
                <span className={styles.none} />
              ) : (
                <span
                  className={styles.bar}
                  data-tone={s.delta >= 0 ? "up" : "down"}
                  style={{ height: `${Math.max(2, h)}%`, [s.delta >= 0 ? "bottom" : "top"]: "50%" }}
                />
              )}
              <span className={styles.tick}>{tick(s)}</span>
            </span>
          );
        })}
      </div>
    </figure>
  );
}
