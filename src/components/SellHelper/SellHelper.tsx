"use client";

import { useState } from "react";
import { MAX_UPGRADE, QUALITY, TIERS } from "@/features/auction";
import { usePro } from "@/features/pro";
import { formatHours, hoursToSell, targetLabel, unitsAhead, useSellAdvice, type SellAdvice } from "@/features/sell";
import { formatNumber, formatPrice, formatRelative, formatShort, parseGamePrice, plural } from "@/lib/format";
import type { Region } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { Icon } from "../Icon";
import { ProTeaser } from "../Pro/Pro";
import { TelegramLink } from "../PriceAlert/TelegramLink";
import styles from "./SellHelper.module.css";

interface Props {
  itemId: string;
  region: Region;
  /** у предмета есть качество (артефакт, модуль) */
  hasQuality: boolean;
  /** у предмета бывает заточка */
  hasUpgrade: boolean;
  /** продаётся пачками (патроны, расходники) */
  stackable: boolean;
  /** стартовые качество и заточка — из фильтра страницы */
  initialQuality: number | null;
  initialUpgrade: number | null;
}

/** «По какой цене выставить, чтобы продалось за N часов» — Pro. */
export function SellHelper(props: Props) {
  const { isPro, available, pending } = usePro();
  if (!available) {
    return <TelegramLink text="Помощник продажи работает в Pro - он привязан к Telegram. Привяжите Telegram, это один клик в боте." />;
  }
  if (pending) return <div className="skeleton" style={{ height: 180, borderRadius: 22, marginTop: 12 }} />;
  if (!isPro) {
    return (
      <div style={{ marginTop: 12 }}>
        <ProTeaser
          compact
          title="Помощник продажи"
          text="По какой цене выставить лот, чтобы он ушёл за час, 6 часов или сутки - по очереди лотов и скорости сделок"
        />
      </div>
    );
  }
  // фильтр страницы поменялся — начинаем с нового варианта
  return <SellPanel key={`${props.initialQuality}:${props.initialUpgrade}`} {...props} />;
}

function SellPanel({ itemId, region, hasQuality, hasUpgrade, stackable, initialQuality, initialUpgrade }: Props) {
  const [quality, setQuality] = useState(hasQuality ? (initialQuality ?? 0) : -1);
  const [upgrade, setUpgrade] = useState(initialUpgrade ?? 0);
  const [amountInput, setAmountInput] = useState("1");
  const [myInput, setMyInput] = useState("");
  const amount = stackable ? Math.max(1, Math.min(100_000, Math.floor(Number(amountInput)) || 1)) : 1;

  const advice = useSellAdvice({ region, itemId, quality: hasQuality ? quality : -1, upgrade, amount });
  const a = advice.data;
  const myPrice = parseGamePrice(myInput);

  return (
    <div className={`glass ${styles.panel}`}>
      <div className={styles.head}>
        <Icon name="tag" size={18} />
        <span>По какой цене выставить, чтобы продалось быстро</span>
      </div>

      {hasQuality && (
        <div className="chips" role="group" aria-label="Качество">
          {QUALITY.map((q, i) => (
            <button
              key={q.label}
              type="button"
              className="chip"
              aria-pressed={quality === i}
              style={quality === i ? undefined : { color: q.color }}
              onClick={() => {
                haptic.tap();
                setQuality(i);
              }}
            >
              {q.label}
            </button>
          ))}
        </div>
      )}

      {(hasUpgrade || stackable) && (
        <div className={styles.params}>
          {hasUpgrade && (
            <div className={styles.stepper} aria-label="Заточка">
              <button type="button" aria-label="Меньше" disabled={upgrade <= 0} onClick={() => setUpgrade((u) => Math.max(0, u - 1))}>
                −
              </button>
              <span className="mono">+{upgrade}</span>
              <button
                type="button"
                aria-label="Больше"
                disabled={upgrade >= MAX_UPGRADE}
                onClick={() => setUpgrade((u) => Math.min(MAX_UPGRADE, u + 1))}
              >
                +
              </button>
            </div>
          )}
          {stackable && (
            <label className={styles.amount}>
              <span>штук</span>
              <input
                className="mono"
                inputMode="numeric"
                autoComplete="off"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                aria-label="Сколько штук продаёте"
              />
            </label>
          )}
        </div>
      )}

      {advice.isError ? (
        <p className={styles.error}>{advice.error.message}</p>
      ) : !a ? (
        <div className="skeleton" style={{ height: 150, borderRadius: 16 }} />
      ) : !a.sales ? (
        <NoData a={a} />
      ) : (
        <div style={{ opacity: advice.isPlaceholderData ? 0.5 : 1, transition: "opacity 200ms" }}>
          <ul className={styles.list}>
            {a.quick && (
              <PriceRow
                label="Быстрее всех"
                hint={a.ladder.length ? "дешевле самого дешёвого лота" : "лотов нет - по медиане"}
                price={a.quick.price}
                hours={a.quick.hours}
                amount={amount}
                fee={a.fee}
              />
            )}
            {a.targets.map((t) => (
              <PriceRow key={t.hours} label={targetLabel(t.hours)} price={t.price} amount={amount} fee={a.fee} />
            ))}
          </ul>

          <form className={styles.mine} onSubmit={(e) => e.preventDefault()}>
            <input
              className="mono"
              inputMode="decimal"
              enterKeyHint="done"
              autoComplete="off"
              placeholder="Своя цена за штуку, например 4,5кк"
              aria-label="Своя цена за штуку"
              value={myInput}
              onChange={(e) => setMyInput(e.target.value)}
              data-invalid={(myInput && !myPrice) || undefined}
            />
          </form>
          {myPrice && <MyPrice a={a} price={myPrice} />}

          <p className={styles.hint}>
            Посчитано по {formatNumber(a.deals)} {plural(a.deals, ["сделке", "сделкам", "сделкам"])} за {a.windowDays} дн. (медиана{" "}
            {formatShort(a.sales.median)}
            {a.basis === "tier" && `, вся ступень заточки ${TIERS.find((t) => upgrade >= t.min && upgrade <= t.max)?.label} - с +${upgrade} сделок мало`}) и{" "}
            {formatNumber(a.lotsTotal)} {plural(a.lotsTotal, ["лоту", "лотам", "лотам"])} на рынке. Оценка примерная: покупают самые дешёвые
            лоты, а новые продавцы могут перебить цену. «На руки» - после комиссии аукциона {Math.round(a.fee * 100)} %. Нажмите на цену, чтобы
            скопировать.
          </p>
        </div>
      )}
    </div>
  );
}

function PriceRow({
  label,
  hint,
  price,
  hours,
  amount,
  fee,
}: {
  label: string;
  hint?: string;
  price: number | null;
  hours?: number | null;
  amount: number;
  fee: number;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!price) return;
    haptic.tap();
    navigator.clipboard
      ?.writeText(String(price))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };
  return (
    <li>
      <button type="button" className={styles.row} onClick={copy} disabled={!price} title={price ? "Скопировать цену" : undefined}>
        <span className={styles.rowLabel}>
          <b>{label}</b>
          <span>{copied ? "цена скопирована" : (hint ?? (hours != null ? formatHours(hours) : ""))}</span>
        </span>
        {price ? (
          <span className={styles.rowPrice}>
            <strong className="mono">{formatPrice(price)}</strong>
            <span className="mono">на руки {formatShort(price * amount * (1 - fee))}</span>
          </span>
        ) : (
          <span className={styles.rowNone}>не успеть</span>
        )}
      </button>
    </li>
  );
}

function MyPrice({ a, price }: { a: SellAdvice; price: number }) {
  const hours = hoursToSell(a, price);
  const ahead = unitsAhead(a.ladder, price);
  return (
    <p className={styles.verdict} data-bad={hours == null || undefined}>
      {hours == null ? (
        <>Вряд ли продастся за 2 суток: по такой цене почти не покупают.</>
      ) : (
        <>
          Продастся примерно {formatHours(hours).replace("≈", "за ")}
          {ahead > 0 ? `, впереди ${formatNumber(ahead)} ${plural(ahead, ["штука", "штуки", "штук"])} дешевле` : ", вы будете самым дешёвым"}. На руки{" "}
          {formatPrice(price * a.amount * (1 - a.fee))}.
        </>
      )}
    </p>
  );
}

function NoData({ a }: { a: SellAdvice }) {
  return (
    <p className={styles.note}>
      За {a.windowDays} дн. {a.deals ? `всего ${formatNumber(a.deals)} ${plural(a.deals, ["сделка", "сделки", "сделок"])}` : "сделок не было"} - цену
      не оценить.
      {a.ladder[0] && ` Самый дешёвый лот сейчас - ${formatPrice(a.ladder[0].unit)}.`}
      {a.lastSale && ` Последняя продажа - ${formatRelative(a.lastSale)}.`}
    </p>
  );
}
