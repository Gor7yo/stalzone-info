"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { ModuleStatBadge } from "@/components/ModuleStat/ModuleStat";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { TIERS } from "@/features/auction";
import { CONFIDENCE, flipMoney, type Flip } from "@/features/flips";
import type { Item } from "@/features/items";
import { useFormat, useT } from "@/i18n/client";
import { actions } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { useNow } from "@/lib/useNow";
import { CopyName, itemHref, Signal, useOfferName, type Offer } from "./OfferCard";
import { peek, usePeek } from "./peek";
import d from "./details.module.css";

const GAP = 14;
const EDGE = 12;
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

/** Окошко разбора у карточки: справа, если влезает, иначе слева или под ней. Мышь сквозь него проходит. */
export function FlipPeek({ days }: { days: number }) {
  const s = usePeek();
  const ref = useRef<HTMLDivElement>(null);

  // размер окошка известен только после отрисовки - ставим на место до того, как его увидят
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !s) return;
    const { rect: r } = s;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let side: "right" | "left" | "below" = "below";
    let left: number;
    let top: number;
    if (r.right + GAP + w <= vw - EDGE) {
      side = "right";
      left = r.right + GAP;
    } else if (r.left - GAP - w >= EDGE) {
      side = "left";
      left = r.left - GAP - w;
    } else left = clamp(r.left, EDGE, vw - w - EDGE);
    if (side === "below") top = r.bottom + GAP + h <= vh - EDGE ? r.bottom + GAP : Math.max(EDGE, r.top - GAP - h);
    else top = clamp(r.top - 10, EDGE, vh - h - EDGE);
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.dataset.side = side;
    // «носик» смотрит на середину карточки
    el.style.setProperty("--notch", `${clamp(r.top + r.height / 2 - top, 22, h - 22)}px`);
  }, [s]);

  useEffect(() => {
    if (!s) return;
    window.addEventListener("scroll", peek.hideNow, true);
    window.addEventListener("resize", peek.hideNow);
    return () => {
      window.removeEventListener("scroll", peek.hideNow, true);
      window.removeEventListener("resize", peek.hideNow);
    };
  }, [s]);

  if (!s) return null;
  return createPortal(
    // key: новая карточка - заново проходит «сканер»
    <div key={s.offer.best.key} ref={ref} role="tooltip" className={d.peek}>
      <span className={d.frame} aria-hidden />
      <span className={d.scan} aria-hidden />
      <FlipDetails offer={s.offer} item={s.item} isNew={s.isNew} days={days} mode="peek" />
    </div>,
    document.body,
  );
}

// ---------- содержимое разбора ----------

function Row({
  k,
  label,
  hint,
  value,
  sub,
  warn,
}: {
  k: "buy" | "sale" | "fee" | "profit" | "worst";
  label: string;
  hint?: string;
  value: string;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <div className={d.row} data-k={k} data-warn={warn || undefined}>
      <dt>
        <i aria-hidden />
        {label}
      </dt>
      <span className={d.leader} aria-hidden />
      <dd className="mono">
        {value}
        {sub && <small>{sub}</small>}
      </dd>
      {hint && <small className={d.hint}>{hint}</small>}
    </div>
  );
}

function Tile({ label, value, sub, tone, title }: { label: string; value: string; sub?: string; tone?: "good" | "dim"; title?: string }) {
  return (
    <div className={d.tile} data-tone={tone} title={title}>
      <span>{label}</span>
      <b className="mono">
        {value}
        {sub && <small> {sub}</small>}
      </b>
    </div>
  );
}

/**
 * Разбор лота «чеком»: выкуп → продажа по медиане → комиссия → прибыль и худший случай,
 * под ним - как быстро продастся, сделки, когда лот снимут и пачка.
 * peek - окошко при наведении (подсказки про клик), sheet - шторка на телефоне.
 */
export function FlipDetails({
  offer,
  item,
  isNew,
  days,
  mode,
}: {
  offer: Offer;
  item?: Item;
  isNew: boolean;
  days: number;
  mode: "peek" | "sheet";
}) {
  const t = useT().flips;
  const { formatNumber, formatShort, formatRelative, formatDuration, locale } = useFormat();
  const f = offer.best;
  const { name, upgrade, quality, variant } = useOfferName(f, item);
  const money = flipMoney(f);
  const conf = CONFIDENCE[f.confidence];
  const tier = TIERS.find((x) => f.upgrade >= x.min && f.upgrade <= x.max);
  const others = offer.lots.length - 1;
  // до снятия лота - с точностью до минуты
  const now = useNow(30_000);
  const endsIn = now ? Date.parse(f.endTime) - now : null;
  const share = (v: number) => `${Math.max(0, (v / money.gross) * 100)}%`;
  const signed = (v: number) => (v < 0 ? `−${formatNumber(-v)}` : `+${formatNumber(v)}`);
  const hours = (h: number) => Math.max(1, Math.round(h));

  return (
    <div className={d.details}>
      <header className={d.head}>
        <span className={d.kicker}>
          <i aria-hidden />
          {t.scanTitle}
        </span>
        <span className={d.conf} style={{ color: conf.color }}>
          <Signal level={f.confidence} />
          {t.conf[f.confidence]}
        </span>
      </header>

      <div className={d.title} style={{ "--q": quality?.color ?? "var(--text-3)" } as React.CSSProperties}>
        <ItemIcon item={item} size={42} />
        <span className={d.titleText}>
          <strong>
            {name}
            {upgrade && <em className="mono"> {upgrade}</em>}
          </strong>
          <small>
            {[quality?.label, variant, f.amount > 1 ? `×${f.amount}` : null].filter(Boolean).join(" · ")}
            {isNew && <b className={d.newTag}>{t.newTag}</b>}
          </small>
        </span>
        {/* в окошке при наведении мышь проходит насквозь - кнопка только в шторке */}
        {mode === "sheet" && <CopyName name={name} />}
      </div>
      {mode === "sheet" && f.variant && <ModuleStatBadge id={f.variant} quality={quality ? f.quality : null} size="md" />}

      {/* вся продажа одной полосой: сколько уходит на выкуп, сколько на комиссию, остальное - прибыль */}
      <div className={d.stack} aria-hidden>
        <span data-k="buy" style={{ width: share(f.buyout) }} />
        <span data-k="fee" style={{ width: share(money.fee) }} />
        <span data-k="profit" />
      </div>

      <dl className={d.receipt}>
        <Row
          k="buy"
          label={t.rowBuyout}
          value={formatNumber(f.buyout)}
          sub={f.amount > 1 ? `${formatNumber(f.unitPrice)}${t.perPcs}` : undefined}
        />
        <Row
          k="sale"
          label={t.rowSale}
          value={formatNumber(money.gross)}
          sub={f.amount > 1 ? `~${formatNumber(f.sellUnit)}${t.perPcs}` : undefined}
        />
        <Row k="fee" label={t.rowFee} value={`−${formatNumber(money.fee)}`} />
        <Row k="profit" label={t.rowProfit} value={`+${formatNumber(f.profit)}`} sub={`${f.pct.toLocaleString(locale)} %`} />
        <Row
          k="worst"
          label={t.rowWorst}
          hint={f.profitLow < 0 ? t.worstLoss : t.worstHint}
          value={signed(f.profitLow)}
          warn={f.profitLow < 0}
        />
      </dl>

      <div className={d.tiles}>
        <Tile
          label={t.tileSell}
          value={
            f.sellHours == null
              ? f.sellHours === null
                ? t.overTwoDays
                : "—"
              : f.sellHours < 1
                ? t.sellUnderHour
                : `~${Math.round(f.sellHours)} ${t.hoursShort}`
          }
          tone={f.sellHours === null ? "dim" : undefined}
          title={f.sellHours === null ? t.sellOver48 : undefined}
        />
        <Tile label={t.tileHour} value={f.profitPerHour != null ? t.perHour(formatShort(f.profitPerHour)) : "—"} tone="good" />
        <Tile label={t.tileDeals(days)} value={String(f.deals)} sub={t.perDay(f.perDay)} />
        <Tile
          label={t.tileEnds}
          value={endsIn === null ? "—" : endsIn > 0 ? t.endsIn(formatDuration(endsIn)) : t.ended}
          tone={endsIn !== null && endsIn <= 0 ? "dim" : undefined}
        />
      </div>
      <p className={d.basis}>{f.basis === "tier" && tier ? t.basisTier(tier.label) : t.basisExact}</p>

      {f.batch && others > 0 ? (
        <div className={d.batch}>
          <Icon name="bag" size={15} />
          <span>
            <b>{t.batchTitle}</b>
            {t.batch(f.batch.lots, f.batch.total)} {t.batchFor(formatShort(f.batch.buyout), formatShort(f.batch.profit))} ·{" "}
            {t.sellIn(hours(f.batch.sellHours))}
          </span>
        </div>
      ) : (
        others > 0 && <p className={d.more}>{t.moreLots(others)}</p>
      )}

      <footer className={d.foot}>
        <span>{t.seen(formatRelative(f.seenAt))}</span>
        {mode === "peek" && (
          <span>
            {t.clickHint} · {t.pickHint}
          </span>
        )}
      </footer>
    </div>
  );
}

// ---------- телефон: разбор шторкой снизу ----------

export function FlipSheet({
  offer,
  item,
  isNew,
  days,
  picked,
  onPick,
  onClose,
}: {
  offer: Offer;
  item?: Item;
  isNew: boolean;
  days: number;
  picked: boolean;
  onPick: (f: Flip) => void;
  onClose: () => void;
}) {
  const t = useT().flips;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // страница под шторкой не листается
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className={d.sheetWrap}
      // по клику, а не по нажатию: иначе шторка пропадает, пока палец ещё на экране,
      // и отпущенный тап «проваливается» в карточку под ней - открывается другой флип
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={t.scanTitle} className={d.sheet}>
        <span className={d.frame} aria-hidden />
        <button type="button" className={d.sheetClose} aria-label={t.close} onClick={onClose}>
          <Icon name="close" size={18} />
        </button>
        <FlipDetails offer={offer} item={item} isNew={isNew} days={days} mode="sheet" />
        <div className={d.sheetActions}>
          <button
            type="button"
            className={`btn ${picked ? "" : "primary"}`}
            onClick={() => {
              haptic.select();
              onPick(offer.best);
            }}
          >
            <Icon name={picked ? "check" : "plus"} size={16} />
            {picked ? t.unpickShort : t.pickShort}
          </button>
          <Link href={itemHref(offer.best, item)} className="btn" onClick={() => actions.pushRecentItem(offer.best.itemId)}>
            {t.openItem}
            <Icon name="chevron" size={16} />
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
