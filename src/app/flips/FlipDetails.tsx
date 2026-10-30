"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { ModuleStatBadge } from "@/components/ModuleStat/ModuleStat";
import { ItemIcon } from "@/components/ui/ItemIcon";
import type { Flip } from "@/features/flips";
import type { Item } from "@/features/items";
import { useFormat, useT } from "@/i18n/client";
import { actions } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { useNow } from "@/lib/useNow";
import { ConfDot } from "./FlipFilters";
import { CopyName, itemHref, useOfferName, type Offer } from "./OfferCard";
import { peek, usePeek } from "./peek";
import d from "./details.module.css";

const GAP = 14;
const EDGE = 12;
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

/** Карточка-подсказка у флипа: справа, если влезает, иначе слева или под ним. Мышь сквозь неё проходит. */
export function FlipPeek({ days }: { days: number }) {
  const s = usePeek();
  const ref = useRef<HTMLDivElement>(null);

  // размер известен только после отрисовки - ставим на место до того, как её увидят
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
    // «носик» смотрит на середину карточки флипа
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
    <div key={s.offer.best.key} ref={ref} role="tooltip" className={d.peek}>
      <FlipDetails offer={s.offer} item={s.item} isNew={s.isNew} days={days} mode="peek" />
    </div>,
    document.body,
  );
}

/** Одна строка-факт: значок и короткая фраза простыми словами. */
function Fact({ icon, tone, children }: { icon: React.ReactNode; tone?: "warn"; children: React.ReactNode }) {
  return (
    <li className={d.fact} data-tone={tone}>
      <span className={d.factIcon} aria-hidden>
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}

/**
 * Что за флип - так, чтобы понял любой: «купить за → продать за → прибыль» крупно,
 * под этим 2-4 строки: за сколько продастся, насколько надёжно, когда можно уйти в минус, пачка.
 * peek - подсказка при наведении, sheet - шторка на телефоне (с копированием названия).
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
  const { formatNumber, formatShort, formatDuration, locale } = useFormat();
  const f = offer.best;
  const { name, upgrade, quality, variant } = useOfferName(f, item);
  // до снятия лота - с точностью до минуты
  const now = useNow(30_000);
  const endsIn = now ? Date.parse(f.endTime) - now : null;
  const sell =
    f.sellHours === undefined
      ? null
      : f.sellHours === null
        ? t.factSlow
        : f.sellHours < 1
          ? t.factSellHour
          : t.factSell(Math.round(f.sellHours));

  return (
    <div className={d.details}>
      <div className={d.title}>
        <ItemIcon item={item} size={44} />
        <span className={d.titleText}>
          <strong>
            {name}
            {upgrade && <em className="mono"> {upgrade}</em>}
          </strong>
          <small>
            {quality && <span style={{ color: quality.color }}>{quality.label}</span>}
            {variant && <span>{variant}</span>}
            {f.amount > 1 && <span className="mono">×{f.amount}</span>}
            {isNew && <b className={d.newTag}>{t.newTag}</b>}
          </small>
        </span>
        {/* в подсказке мышь проходит насквозь - кнопка только в шторке */}
        {mode === "sheet" && <CopyName name={name} />}
      </div>
      {mode === "sheet" && f.variant && <ModuleStatBadge id={f.variant} quality={quality ? f.quality : null} size="md" />}

      <div className={d.money}>
        <div className={d.line}>
          <span>{t.buyFor}</span>
          <b className="mono">{formatNumber(f.buyout)}</b>
        </div>
        {f.amount > 1 && <small className={d.lineSub}>{t.perPiece(f.amount, formatShort(f.unitPrice))}</small>}
        <div className={d.line}>
          <span>{t.sellFor}</span>
          <b className="mono">~{formatNumber(f.sellUnit * f.amount)}</b>
        </div>
        <div className={d.total}>
          <span>{t.profitWord}</span>
          <b className="mono">+{formatNumber(f.profit)}</b>
          <small className="mono">{f.pct.toLocaleString(locale)} %</small>
        </div>
        <small className={d.fee}>{t.feeIncluded}</small>
      </div>

      <ul className={d.facts}>
        {sell && <Fact icon={<Icon name="clock" size={15} />}>{sell}</Fact>}
        <Fact icon={<ConfDot level={f.confidence} />}>
          {t.factConf[f.confidence]} <span className={d.dim}>· {t.factDeals(f.deals, days)}</span>
        </Fact>
        {f.profitLow < 0 && (
          <Fact icon={<Icon name="alert" size={15} />} tone="warn">
            {t.factRisk(formatShort(-f.profitLow))}
          </Fact>
        )}
        {f.batch && offer.lots.length > 1 && (
          <Fact icon={<Icon name="bag" size={15} />}>{t.factBatch(f.batch.lots, f.batch.total, formatShort(f.batch.profit))}</Fact>
        )}
      </ul>

      {endsIn !== null && <p className={d.foot}>{endsIn > 0 ? t.factEnds(formatDuration(endsIn)) : t.ended}</p>}
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
      <div role="dialog" aria-modal="true" aria-label={t.aboutFlip} className={d.sheet}>
        <span className={d.grab} aria-hidden />
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
