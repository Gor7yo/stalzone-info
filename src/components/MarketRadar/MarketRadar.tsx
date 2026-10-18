"use client";

import Link from "next/link";
import { useState } from "react";
import { qualities, TIERS } from "@/features/auction";
import { useItems } from "@/features/items";
import { useRadar, type RadarRow } from "@/features/market";
import { useFormat, useLang, useT } from "@/i18n/client";
import { actions, type Region } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { Segmented } from "../ui/Segmented";
import { ItemIcon } from "../ui/ItemIcon";
import styles from "./MarketRadar.module.css";

type Tab = "up" | "down" | "volume";
const SHOWN = 5;

/** Ссылка на предмет сразу с качеством (и заточкой, если ступень — одно значение). */
function hrefOf(r: RadarRow) {
  const p = new URLSearchParams();
  if (r.quality >= 0) p.set("q", String(r.quality));
  const t = TIERS[r.tier];
  if (t && t.min === t.max) p.set("u", String(t.min));
  const q = p.toString();
  return `/auction/${r.itemId}${q ? `?${q}` : ""}`;
}

const pct = (x: number, locale = "ru-RU") =>
  `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toLocaleString(locale, { maximumFractionDigits: 1 })} %`;

/** Радар рынка на главной: что подорожало, подешевело и где больше всего сделок за сутки. */
/**
 * fill — на широком экране занять всю высоту колонки: показываем все позиции,
 * список прокручивается внутри (высоту задаёт соседняя колонка).
 */
export function MarketRadar({ region, fill = false }: { region: Region; fill?: boolean }) {
  const t = useT().radar;
  const lang = useLang();
  const QUALITY = qualities(lang);
  const { formatShort, locale } = useFormat();
  const { data, isLoading, isError } = useRadar(region);
  const { data: index } = useItems();
  const [tab, setTab] = useState<Tab>("up");
  const [all, setAll] = useState(false);

  if (isError) return null;
  const rows = data?.[tab] ?? [];
  const empty = data && !data.up.length && !data.down.length && !data.volume.length;

  return (
    <section className={`section ${styles.radar}`} data-fill={fill || undefined}>
      <h2 className="section-title">
        {t.title}{" "}
        <small>
          {t.perDay} · {region.toUpperCase()}
        </small>
      </h2>

      {data && !empty && (
        <div className={`glass ${styles.index}`} data-tone={data.index.change > 0 ? "up" : data.index.change < 0 ? "down" : undefined}>
          <span className={styles.indexLabel}>{t.index}</span>
          <strong className="mono">{pct(data.index.change, locale)}</strong>
          <span className="dim">{t.indexHint(data.index.groups)}</span>
        </div>
      )}

      <div style={{ margin: "10px 0" }}>
        <Segmented
          label={t.tabsAria}
          size="sm"
          value={tab}
          onChange={(v) => (haptic.select(), setTab(v as Tab), setAll(false))}
          options={[
            { value: "up", label: t.up },
            { value: "down", label: t.down },
            { value: "volume", label: t.volume },
          ]}
        />
      </div>

      {isLoading && <div className={styles.skeleton} />}
      {empty && (
        <p className="dim" style={{ fontSize: 13 }}>
          {t.empty}
        </p>
      )}
      {data && !empty && !rows.length && (
        <p className="dim" style={{ fontSize: 13 }}>
          {t.noRows}
        </p>
      )}

      {/* все позиции в разметке: на телефоне лишние скрыты до «Ещё», на широком экране с fill — прокрутка */}
      <ul className={styles.list} data-collapsed={!all || undefined}>
        {rows.map((r) => {
          const item = index?.byId.get(r.itemId);
          const q = QUALITY[r.quality];
          return (
            <li key={`${r.itemId}:${r.quality}:${r.tier}`}>
              <Link
                href={hrefOf(r)}
                className={styles.row}
                onClick={() => {
                  haptic.tap();
                  actions.pushRecentItem(r.itemId);
                }}
              >
                <ItemIcon item={item} size={36} />
                <span className={styles.body}>
                  <strong className="truncate">{item?.name ?? r.name ?? r.itemId}</strong>
                  <span className={styles.tags}>
                    {q && (
                      <span className={styles.q} style={{ "--q": q.color } as React.CSSProperties}>
                        {q.short}
                      </span>
                    )}
                    {(q || r.tier > 0) && <span>{TIERS[r.tier]?.label}</span>}
                    <span className="dim">{t.deals(r.deals)}</span>
                  </span>
                </span>
                <span className={styles.nums}>
                  <strong className="mono">{formatShort(r.price)}</strong>
                  {tab === "volume" ? (
                    <span className="mono dim">{t.turnover(formatShort(r.turnover))}</span>
                  ) : (
                    r.change != null && (
                      <span className="mono" data-tone={r.change > 0 ? "up" : "down"}>
                        {pct(r.change, locale)}
                      </span>
                    )
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {rows.length > SHOWN && (
        <button type="button" className={`btn ${styles.more}`} onClick={() => setAll((v) => !v)}>
          {all ? t.collapse : t.more(rows.length - SHOWN)}
        </button>
      )}
    </section>
  );
}
