"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ModuleStatBadge } from "@/components/ModuleStat/ModuleStat";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { qualities, TIERS } from "@/features/auction";
import { CONFIDENCE, type Flip } from "@/features/flips";
import type { Item } from "@/features/items";
import { useFormat, useLang, useT } from "@/i18n/client";
import { actions } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import styles from "./flips.module.css";

/** У этих групп есть заточка — в ссылку на предмет передаём и её. */
const UPGRADABLE = new Set(["artefact", "weapon", "armor"]);

/** Одинаковые лоты (предмет + качество + заточка) — одна карточка с самым выгодным лотом. */
export interface Offer {
  key: string;
  best: Flip;
  lots: Flip[];
}

/** Ссылка на предмет сразу с фильтром по качеству и заточке лота. */
function itemHref(f: Flip, item?: Item) {
  const params = new URLSearchParams();
  if (f.quality >= 0) params.set("q", String(f.quality));
  if (f.variant) params.set("v", f.variant);
  else if (f.upgrade > 0 || (item && UPGRADABLE.has(item.group))) params.set("u", String(f.upgrade));
  const query = params.toString();
  return `/auction/${f.itemId}${query ? `?${query}` : ""}`;
}

export function OfferCard({ offer, item }: { offer: Offer; item?: Item }) {
  const t = useT().flips;
  const lang = useLang();
  const { formatRelative, formatShort, locale } = useFormat();
  const f = offer.best;
  const quality = qualities(lang)[f.quality];
  const conf = CONFIDENCE[f.confidence];
  const tier = TIERS.find((x) => f.upgrade >= x.min && f.upgrade <= x.max);
  // полоска: какая доля ожидаемой выручки уходит на выкуп, какая — прибыль
  const revenue = f.sellUnit * f.amount * 0.95;
  const buyShare = Math.min(100, Math.max(0, (f.buyout / revenue) * 100));
  const others = offer.lots.length - 1;
  const sellTime = (h: number) => (h < 1 ? t.sellUnderHour : t.sellIn(Math.round(h)));

  return (
    <Link
      href={itemHref(f, item)}
      className={styles.card}
      style={{ "--q": quality?.color ?? "var(--text-3)" } as React.CSSProperties}
      onClick={() => {
        haptic.tap();
        actions.pushRecentItem(f.itemId);
      }}
    >
      <div className={styles.cardHead}>
        <ItemIcon item={item} size={46} />
        <span className={styles.cardTitle}>
          <span className={styles.nameRow}>
            <strong className="truncate">{item?.name ?? f.itemId}</strong>
            {!f.variant && (f.upgrade > 0 || quality) && <span className={styles.upgrade}>+{f.upgrade}</span>}
          </span>
          <span className={styles.tags}>
            {f.variant && <ModuleStatBadge id={f.variant} quality={quality ? f.quality : null} />}
            {quality && <span className={styles.qualityTag}>{quality.label}</span>}
            {f.amount > 1 && <span className={styles.tag}>×{f.amount}</span>}
            <span className={styles.conf} style={{ color: conf.color }}>
              ● {t.conf[f.confidence]}
            </span>
          </span>
        </span>
        <span className={styles.profit}>
          <strong className="mono">+{formatShort(f.profit)}</strong>
          <span className="mono">{f.pct.toLocaleString(locale)} %</span>
        </span>
      </div>

      <div className={styles.bar} aria-hidden>
        <span style={{ width: `${buyShare}%` }} />
      </div>

      <div className={`mono ${styles.prices}`}>
        <span>
          <small>{t.buyout}</small> {formatShort(f.unitPrice)}
        </span>
        <Icon name="chevron" size={14} className="dim" />
        <span>
          <small>{t.sale}</small> ~{formatShort(f.sellUnit)}
          {f.amount > 1 && <small> {t.perPcs}</small>}
        </span>
      </div>

      {/* за сколько уйдёт и прибыль в час — своя строка у каждой карточки (высота одинаковая);
          null — по медиане за 2 суток не уйдёт (очередь дешевле); undefined — старый бэкенд */}
      {f.sellHours !== undefined && (
        <div
          className={`mono ${styles.eta}`}
          data-slow={f.sellHours === null || undefined}
          title={f.sellHours === null ? t.sellOver48 : sellTime(f.sellHours)}
        >
          <span>
            <small>{t.sellsIn}</small>{" "}
            {f.sellHours === null ? t.overTwoDays : `${f.sellHours < 1 ? "<1" : `~${Math.round(f.sellHours)}`} ${t.hoursShort}`}
          </span>
          {f.profitPerHour != null && <b>{t.perHour(formatShort(f.profitPerHour))}</b>}
        </div>
      )}

      <div className={styles.meta}>
        <span>
          {t.deals(f.deals)}
          {f.basis === "tier" && tier ? ` (${tier.label})` : ""} · {t.perDay(f.perDay)}
        </span>
        {/* пакет вместо «ещё N лотов»: сколько скупить, чтобы всё ушло за сутки */}
        {f.batch && others > 0 ? (
          <span
            className={styles.batch}
            title={`${t.batch(f.batch.lots, f.batch.total)} · ${t.buyout} ${formatShort(f.batch.buyout)} · ${sellTime(f.batch.sellHours)} · +${formatShort(f.batch.profit)}`}
          >
            <Icon name="bag" size={11} />
            {t.batchShort(f.batch.lots, f.batch.total)} +{formatShort(f.batch.profit)}
          </span>
        ) : (
          others > 0 && <span className={styles.more}>{t.moreLots(others)}</span>
        )}
        <span>{t.seen(formatRelative(f.seenAt))}</span>
      </div>
    </Link>
  );
}
