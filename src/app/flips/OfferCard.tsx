"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { qualities } from "@/features/auction";
import { CONFIDENCE, type Confidence, type Flip } from "@/features/flips";
import type { Item } from "@/features/items";
import { variantName } from "@/features/modules";
import { useFormat, useLang, useT } from "@/i18n/client";
import { actions } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { peek } from "./peek";
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
export function itemHref(f: Flip, item?: Item) {
  const params = new URLSearchParams();
  if (f.quality >= 0) params.set("q", String(f.quality));
  if (f.variant) params.set("v", f.variant);
  else if (f.upgrade > 0 || (item && UPGRADABLE.has(item.group))) params.set("u", String(f.upgrade));
  const query = params.toString();
  return `/auction/${f.itemId}${query ? `?${query}` : ""}`;
}

/** Надёжность оценки «сигналом»: 3 палочки - надёжно, 1 - рискованно. */
export function Signal({ level }: { level: Confidence }) {
  const on = CONFIDENCE[level].rank + 1;
  return (
    <svg className={styles.signal} width="13" height="11" viewBox="0 0 13 11" style={{ color: CONFIDENCE[level].color }} aria-hidden>
      {[4, 7, 10].map((h, i) => (
        <rect key={h} x={i * 4.5} y={11 - h} width="3" height={h} rx="1" fill="currentColor" opacity={i < on ? 1 : 0.22} />
      ))}
    </svg>
  );
}

/** «Скопировать»: только название предмета - вставить в поиск аукциона в игре. */
export function CopyName({ name }: { name: string }) {
  const t = useT().flips;
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={styles.copy}
      data-copied={copied || undefined}
      data-label={copied ? t.copied : t.copyName}
      aria-label={`${t.copyName}: ${name}`}
      onClick={() => {
        haptic.tap();
        navigator.clipboard
          ?.writeText(name)
          .then(() => {
            haptic.notify("success");
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => {});
      }}
    >
      <Icon name={copied ? "check" : "copy"} size={15} strokeWidth={copied ? 2.6 : 1.9} />
    </button>
  );
}

/** Название позиции как в игре: «Опал +7», у модулей - ключевая характеристика. */
export function useOfferName(f: Flip, item?: Item) {
  const lang = useLang();
  const quality = qualities(lang)[f.quality];
  return {
    name: item?.name ?? f.itemId,
    upgrade: !f.variant && (f.upgrade > 0 || quality) ? `+${f.upgrade}` : null,
    quality,
    variant: f.variant ? variantName(f.variant, lang) : null,
  };
}

/**
 * Компактная карточка: что, за сколько выкупить и сколько заработать. Остальное - в разборе лота:
 * мышью по наведению (FlipPeek), на телефоне - шторкой по тапу (onOpen). Иконка - выбрать в расчёт.
 */
export function OfferCard({
  offer,
  item,
  isNew = false,
  picked,
  onPick,
  onOpen,
}: {
  offer: Offer;
  item?: Item;
  /** лот появился после прошлого взгляда на ленту (метка «новый» и подсветка рамки) */
  isNew?: boolean;
  picked: boolean;
  onPick: (f: Flip) => void;
  onOpen: (offer: Offer) => void;
}) {
  const t = useT().flips;
  const { formatShort, locale } = useFormat();
  const f = offer.best;
  const { name, upgrade, quality, variant } = useOfferName(f, item);
  // полоска снизу: какая доля выручки уходит на выкуп, остальное - прибыль
  const revenue = f.sellUnit * f.amount * 0.95;
  const buyShare = Math.min(100, Math.max(0, (f.buyout / revenue) * 100));

  return (
    <div
      className={styles.card}
      data-new={isNew || undefined}
      data-picked={picked || undefined}
      style={{ "--q": quality?.color ?? "var(--text-3)", "--buy": `${buyShare}%` } as React.CSSProperties}
      onPointerEnter={(e) => e.pointerType === "mouse" && peek.show(offer, item, e.currentTarget, isNew)}
      onPointerLeave={(e) => e.pointerType === "mouse" && peek.hide()}
    >
      <button
        type="button"
        className={styles.pick}
        aria-pressed={picked}
        aria-label={`${picked ? t.unpick : t.pick}: ${name}`}
        title={picked ? t.unpick : t.pick}
        onClick={() => {
          haptic.select();
          onPick(f);
        }}
      >
        <ItemIcon item={item} size={44} />
        <span className={styles.pickMark}>
          <Icon name={picked ? "check" : "plus"} size={12} strokeWidth={3} />
        </span>
      </button>

      <Link
        href={itemHref(f, item)}
        className={styles.cardLink}
        onFocus={(e) =>
          e.currentTarget.matches(":focus-visible") && peek.show(offer, item, e.currentTarget.parentElement ?? e.currentTarget, isNew)
        }
        onBlur={() => peek.hide()}
        onClick={(e) => {
          haptic.tap();
          // на сенсорном экране наведения нет: тап открывает разбор, а оттуда - на предмет
          if (window.matchMedia("(hover: none)").matches) {
            e.preventDefault();
            onOpen(offer);
            return;
          }
          peek.hide();
          actions.pushRecentItem(f.itemId);
        }}
      >
        <span className={styles.nameRow}>
          <strong className="truncate">{name}</strong>
          {upgrade && <span className={styles.upgrade}>{upgrade}</span>}
          {f.amount > 1 && <span className={styles.amount}>×{f.amount}</span>}
          {isNew && <span className={styles.newTag}>{t.newTag}</span>}
        </span>
        <span className={styles.sub}>
          {quality && <span style={{ color: quality.color }}>{quality.label}</span>}
          {variant && <span className="truncate">{variant}</span>}
          <span className={styles.subPrice}>
            {t.buyout} <b className="mono">{formatShort(f.buyout)}</b>
          </span>
        </span>
      </Link>

      <CopyName name={name} />

      <span className={styles.profit}>
        <strong className="mono">+{formatShort(f.profit)}</strong>
        <span>
          <Signal level={f.confidence} />
          <span className="mono">{f.pct.toLocaleString(locale)} %</span>
        </span>
      </span>
    </div>
  );
}
