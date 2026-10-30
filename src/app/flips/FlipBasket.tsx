"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { flipMoney, type Flip } from "@/features/flips";
import { useItems } from "@/features/items";
import { useFormat, useT } from "@/i18n/client";
import type { Region } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { CopyName, useOfferName } from "./OfferCard";
import b from "./basket.module.css";

type Picks = Record<string, Flip>;

/** Выбранные лоты живут в этой вкладке (sessionStorage): сходили на страницу предмета и вернулись - расчёт на месте. */
const PICKS_KEY = (region: Region) => `stalzone:flipsPick:${region}`;

function readPicks(region: Region): Picks {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(PICKS_KEY(region)) ?? "{}") as Picks;
  } catch {
    return {};
  }
}

/** Выбор лотов для расчёта - по ключу лота, отдельно для каждого региона. */
export function usePicks(region: Region) {
  const [s, setS] = useState(() => ({ region, picks: readPicks(region) }));
  // сменили регион - берём его выбор (при рендере, а не в эффекте - без лишней перерисовки)
  if (s.region !== region) setS({ region, picks: readPicks(region) });

  useEffect(() => {
    try {
      sessionStorage.setItem(PICKS_KEY(s.region), JSON.stringify(s.picks));
    } catch {
      /* приватный режим - выбор до перезагрузки */
    }
  }, [s]);

  return {
    picks: s.picks,
    toggle: (f: Flip) =>
      setS((prev) => {
        const picks = { ...prev.picks };
        if (picks[f.key]) delete picks[f.key];
        else picks[f.key] = f;
        return { ...prev, picks };
      }),
    remove: (keys: string[]) =>
      setS((prev) => {
        const picks = { ...prev.picks };
        for (const k of keys) delete picks[k];
        return { ...prev, picks };
      }),
    clear: () => setS((prev) => ({ ...prev, picks: {} })),
  };
}

/** Итоги по выбранным лотам: свежие цены из ленты; лоты, которых в ленте уже нет, - отдельно. */
function totals(picks: Picks, flips: Flip[], ready: boolean) {
  const keys = Object.keys(picks);
  const live = new Map(flips.map((f) => [f.key, f]));
  const present = ready ? keys.flatMap((k) => live.get(k) ?? []) : Object.values(picks);
  const gone = ready ? keys.filter((k) => !live.has(k)) : [];
  const spend = present.reduce((s, f) => s + f.buyout, 0);
  const revenue = present.reduce((s, f) => s + flipMoney(f).revenue, 0);
  const profit = present.reduce((s, f) => s + f.profit, 0);
  return {
    keys,
    present,
    gone,
    spend,
    revenue,
    profit,
    worst: present.reduce((s, f) => s + f.profitLow, 0),
    pct: spend ? Math.round((profit / spend) * 1000) / 10 : 0,
    // всё уйдёт, когда продастся самый медленный; null - что-то не уйдёт за 2 суток
    slowest: present.some((f) => f.sellHours === null) ? null : Math.max(0, ...present.map((f) => f.sellHours ?? 0)),
    spendShare: revenue ? Math.min(100, (spend / revenue) * 100) : 100,
  };
}

function useSellAll() {
  const t = useT().flips;
  return (h: number | null) => (h === null ? t.overTwoDays : h < 1 ? t.sellUnderHour : `~${Math.round(h)} ${t.hoursShort}`);
}

function GoneNotice({ count, onRemove }: { count: number; onRemove: () => void }) {
  const t = useT().flips;
  return (
    <div className={b.gone}>
      <Icon name="clock" size={14} />
      <span>{t.gone(count)}</span>
      <button type="button" onClick={onRemove}>
        {t.removeGone}
      </button>
    </div>
  );
}

function PickRow({ f, onRemove }: { f: Flip; onRemove: () => void }) {
  const t = useT().flips;
  const { formatShort } = useFormat();
  const { data: index } = useItems();
  const item = index?.byId.get(f.itemId);
  const { name, upgrade, quality } = useOfferName(f, item);
  return (
    <li className={b.pickRow}>
      <ItemIcon item={item} size={30} />
      <span className={b.pickName}>
        <span className="truncate">
          {name}
          {upgrade && <em className="mono"> {upgrade}</em>}
          {f.amount > 1 && <small className="mono"> ×{f.amount}</small>}
        </span>
        <small>
          {quality && <span style={{ color: quality.color }}>{quality.label} · </span>}
          {t.buyout} <span className="mono">{formatShort(f.buyout)}</span>
        </small>
      </span>
      <span className={`mono ${b.pickProfit}`}>+{formatShort(f.profit)}</span>
      <CopyName name={name} />
      <button type="button" className={b.pickRemove} aria-label={`${t.unpick}: ${name}`} onClick={onRemove}>
        <Icon name="close" size={14} />
      </button>
    </li>
  );
}

interface BasketProps {
  picks: Picks;
  /** лента региона целиком (без фильтров) - свежие цены выбранных лотов */
  flips: Flip[];
  /** лента загружена и своя: только тогда можно сказать, что лот ушёл */
  ready: boolean;
  onRemove: (keys: string[]) => void;
  onClear: () => void;
}

/**
 * Широкий экран: «Расчёт» в колонке справа - виден всегда, пока листаете ленту.
 * Пусто - подсказка, как добавить; иначе итоги крупно и список выбранных с копированием названия.
 */
export function FlipCalc({ picks, flips, ready, onRemove, onClear }: BasketProps) {
  const t = useT().flips;
  const { formatNumber, locale } = useFormat();
  const sellAll = useSellAll();
  const s = totals(picks, flips, ready);

  return (
    <section className={b.side} aria-label={t.calcTitle}>
      <span className={b.frame} aria-hidden />
      <header className={b.sideHead}>
        <span className={b.kicker}>
          <i aria-hidden />
          {t.calcTitle}
        </span>
        {s.present.length > 0 && <span className={b.countNum}>{s.present.length}</span>}
        {s.keys.length > 0 && (
          <button
            type="button"
            className={b.clearText}
            onClick={() => {
              haptic.notify("warning");
              onClear();
            }}
          >
            {t.clearShort}
          </button>
        )}
      </header>

      {!s.keys.length ? (
        <div className={b.empty}>
          <span className={b.emptyIcon}>
            <Icon name="plus" size={18} strokeWidth={2.4} />
          </span>
          <b>{t.calcEmptyTitle}</b>
          <p>{t.calcEmptyText}</p>
        </div>
      ) : (
        <>
          <span className={b.sideFlow} style={{ "--buy": `${s.spendShare}%` } as React.CSSProperties} aria-hidden />
          <dl className={b.totals}>
            <div>
              <dt>{t.spend}</dt>
              <dd className="mono">{formatNumber(s.spend)}</dd>
            </div>
            <div>
              <dt>{t.revenue}</dt>
              <dd className="mono">{formatNumber(s.revenue)}</dd>
            </div>
            <div data-tone="good">
              <dt>{t.profitTotal}</dt>
              <dd className="mono">
                +{formatNumber(s.profit)}
                <i>{s.pct.toLocaleString(locale)} %</i>
              </dd>
            </div>
            <div data-tone={s.worst < 0 ? "bad" : undefined}>
              <dt>{t.worstTotal}</dt>
              <dd className="mono">{s.worst < 0 ? `−${formatNumber(-s.worst)}` : `+${formatNumber(s.worst)}`}</dd>
            </div>
            {s.present.length > 0 && (
              <div>
                <dt>{t.sellAll}</dt>
                <dd className="mono">{sellAll(s.slowest)}</dd>
              </div>
            )}
          </dl>
          {s.gone.length > 0 && <GoneNotice count={s.gone.length} onRemove={() => onRemove(s.gone)} />}
          <ul className={`${b.list} ${b.sideList}`}>
            {s.present.map((f) => (
              <PickRow key={f.key} f={f} onRemove={() => onRemove([f.key])} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/**
 * Телефон и узкий экран: расчёт полосой, липнет к низу экрана, пока листаете ленту;
 * раскрывается списком. Пусто - полосы нет.
 */
export function FlipBasket({ picks, flips, ready, onRemove, onClear }: BasketProps) {
  const t = useT().flips;
  const { formatShort, formatNumber, locale } = useFormat();
  const sellAll = useSellAll();
  const [open, setOpen] = useState(false);
  const { keys, present, gone, spend, revenue, profit, worst, pct, slowest, spendShare } = totals(picks, flips, ready);
  if (!keys.length) return null;

  return (
    <section className={b.basket} data-open={open || undefined} data-flip-basket aria-label={t.picked(present.length)}>
      <span className={b.flow} style={{ "--buy": `${spendShare}%` } as React.CSSProperties} aria-hidden />

      {open && (
        <div className={b.body}>
          {gone.length > 0 && <GoneNotice count={gone.length} onRemove={() => onRemove(gone)} />}
          <ul className={b.list}>
            {present.map((f) => (
              <PickRow key={f.key} f={f} onRemove={() => onRemove([f.key])} />
            ))}
          </ul>
          <div className={b.extra}>
            <span>
              {t.worstTotal}{" "}
              <b className="mono" data-warn={worst < 0 || undefined}>
                {worst < 0 ? `−${formatNumber(-worst)}` : `+${formatNumber(worst)}`}
              </b>
            </span>
            {present.length > 0 && (
              <span>
                {t.sellAll} <b className="mono">{sellAll(slowest)}</b>
              </span>
            )}
          </div>
        </div>
      )}

      <div className={b.bar}>
        <button
          type="button"
          className={b.count}
          aria-expanded={open}
          title={t.showPicks}
          onClick={() => {
            haptic.tap();
            setOpen((v) => !v);
          }}
        >
          <span className={b.countNum}>{present.length}</span>
          <span className={b.countWord}>{t.pickedWord(present.length)}</span>
          {gone.length > 0 && <span className={b.goneDot} aria-label={t.gone(gone.length)} />}
          <Icon name={open ? "down" : "up"} size={15} />
        </button>
        <div className={b.stats}>
          <span className={b.stat}>
            <small>{t.spend}</small>
            <b className="mono">{formatShort(spend)}</b>
          </span>
          <span className={b.stat}>
            <small>{t.revenue}</small>
            <b className="mono">{formatShort(revenue)}</b>
          </span>
          <span className={b.stat} data-tone="good">
            <small>{t.profitTotal}</small>
            <b className="mono">
              +{formatShort(profit)}
              <i>{pct.toLocaleString(locale)} %</i>
            </b>
          </span>
        </div>
        <button
          type="button"
          className={b.clear}
          aria-label={t.clearPicks}
          title={t.clearPicks}
          onClick={() => {
            haptic.notify("warning");
            setOpen(false);
            onClear();
          }}
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    </section>
  );
}
