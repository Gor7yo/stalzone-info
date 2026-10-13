"use client";

import Link from "next/link";
import { useState } from "react";
import { QUALITY, TIERS } from "@/features/auction";
import { useItems } from "@/features/items";
import { useRadar, type RadarRow } from "@/features/market";
import { formatShort } from "@/lib/format";
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

const pct = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} %`;

/** Радар рынка на главной: что подорожало, подешевело и где больше всего сделок за сутки. */
export function MarketRadar({ region }: { region: Region }) {
  const { data, isLoading, isError } = useRadar(region);
  const { data: index } = useItems();
  const [tab, setTab] = useState<Tab>("up");
  const [all, setAll] = useState(false);

  if (isError) return null;
  const rows = data?.[tab] ?? [];
  const empty = data && !data.up.length && !data.down.length && !data.volume.length;

  return (
    <section className="section">
      <h2 className="section-title">
        Радар рынка <small>за сутки · {region.toUpperCase()}</small>
      </h2>

      {data && !empty && (
        <div className={`glass ${styles.index}`} data-tone={data.index.change > 0 ? "up" : data.index.change < 0 ? "down" : undefined}>
          <span className={styles.indexLabel}>Индекс рынка</span>
          <strong className="mono">{pct(data.index.change)}</strong>
          <span className="dim">по {data.index.groups} позициям, с учётом оборота</span>
        </div>
      )}

      <div style={{ margin: "10px 0" }}>
        <Segmented
          label="Радар"
          size="sm"
          value={tab}
          onChange={(v) => (haptic.select(), setTab(v as Tab), setAll(false))}
          options={[
            { value: "up", label: "Растут" },
            { value: "down", label: "Падают" },
            { value: "volume", label: "Оборот" },
          ]}
        />
      </div>

      {isLoading && <div className={styles.skeleton} />}
      {empty && <p className="dim" style={{ fontSize: 13 }}>Для этого региона пока мало сделок — радар появится, когда сборщик накопит историю.</p>}
      {data && !empty && !rows.length && <p className="dim" style={{ fontSize: 13 }}>Сейчас таких позиций нет.</p>}

      <ul className={styles.list}>
        {(all ? rows : rows.slice(0, SHOWN)).map((r) => {
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
                  <strong className="truncate">{item?.name ?? r.itemId}</strong>
                  <span className={styles.tags}>
                    {q && (
                      <span className={styles.q} style={{ "--q": q.color } as React.CSSProperties}>
                        {q.short}
                      </span>
                    )}
                    {(q || r.tier > 0) && <span>{TIERS[r.tier]?.label}</span>}
                    <span className="dim">{r.deals} сделок</span>
                  </span>
                </span>
                <span className={styles.nums}>
                  <strong className="mono">{formatShort(r.price)}</strong>
                  {tab === "volume" ? (
                    <span className="mono dim">оборот {formatShort(r.turnover)}</span>
                  ) : (
                    r.change != null && (
                      <span className="mono" data-tone={r.change > 0 ? "up" : "down"}>
                        {pct(r.change)}
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
        <button type="button" className="btn" style={{ width: "100%", marginTop: 8 }} onClick={() => setAll((v) => !v)}>
          {all ? "Свернуть" : `Ещё ${rows.length - SHOWN}`}
        </button>
      )}
    </section>
  );
}
