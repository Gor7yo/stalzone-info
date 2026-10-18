"use client";

import { useState } from "react";
import { TIERS } from "@/features/auction";
import { usePro } from "@/features/pro";
import { formatHours, hoursToSell, targetLabel, unitsAhead, useSellAdvice, type SellAdvice } from "@/features/sell";
import { useFormat, useLang, useT } from "@/i18n/client";
import { parseGamePrice } from "@/lib/format";
import type { Region } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { Icon } from "../Icon";
import { ModuleStatPicker } from "../ModuleStat/ModuleStat";
import { QualityPicker, UpgradeSlider } from "./Controls";
import { SaleTiming } from "./SaleTiming";
import { ProTeaser } from "../Pro/Pro";
import { LoginCard } from "../Account/AccountGate";
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
  /** ключевые характеристики модуля, что встречаются на рынке; пусто — у предмета их нет */
  variants: string[];
  initialVariant: string | null;
}

/** «По какой цене выставить, чтобы продалось за N часов» — Pro. */
export function SellHelper(props: Props) {
  const t = useT().sell;
  const { isPro, available, pending } = usePro();
  if (pending) return <div className="skeleton" style={{ height: 180, borderRadius: 22, marginTop: 12 }} />;
  if (!available) {
    return <LoginCard text={t.login} />;
  }
  if (!isPro) {
    return (
      <div style={{ marginTop: 12 }}>
        <ProTeaser compact title={t.title} text={t.teaser} />
      </div>
    );
  }
  // фильтр страницы поменялся — начинаем с нового варианта
  return <SellPanel key={`${props.initialQuality}:${props.initialUpgrade}:${props.initialVariant}`} {...props} />;
}

function SellPanel({ itemId, region, hasQuality, hasUpgrade, stackable, initialQuality, initialUpgrade, variants, initialVariant }: Props) {
  const t = useT().sell;
  const lang = useLang();
  const { formatNumber, formatShort } = useFormat();
  const [quality, setQuality] = useState(hasQuality ? (initialQuality ?? 0) : -1);
  const [upgrade, setUpgrade] = useState(initialUpgrade ?? 0);
  // модуль: без характеристики цену не посчитать — берём выбранную на странице или самую частую
  const [variant, setVariant] = useState(initialVariant ?? variants[0] ?? "");
  const [amountInput, setAmountInput] = useState("1");
  const [myInput, setMyInput] = useState("");
  const amount = stackable ? Math.max(1, Math.min(100_000, Math.floor(Number(amountInput)) || 1)) : 1;
  // у модуля заточки нет — вместо неё ключевая характеристика
  const upgradable = hasUpgrade && !variants.length;

  const advice = useSellAdvice({
    region,
    itemId,
    quality: hasQuality ? quality : -1,
    upgrade: upgradable ? upgrade : 0,
    variant,
    amount,
  });
  const a = advice.data;
  const myPrice = parseGamePrice(myInput);

  return (
    <div className={`glass ${styles.panel}`}>
      <div className={styles.head}>
        <Icon name="tag" size={18} />
        <span>{t.head}</span>
      </div>

      {hasQuality && <QualityPicker value={quality} onChange={setQuality} />}

      {variants.length > 0 && (
        <ModuleStatPicker
          variants={variants}
          value={variant || null}
          quality={quality >= 0 ? quality : null}
          allowAny={false}
          onChange={(v) => v && setVariant(v)}
        />
      )}

      {upgradable && <UpgradeSlider value={upgrade} onChange={setUpgrade} />}

      {stackable && (
        <div className={styles.params}>
          <label className={styles.amount}>
            <span>{t.pcs}</span>
            <input
              className="mono"
              inputMode="numeric"
              autoComplete="off"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
              aria-label={t.amountAria}
            />
          </label>
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
                label={t.quickest}
                hint={a.ladder.length ? t.quickestHint : t.quickestNoLots}
                price={a.quick.price}
                hours={a.quick.hours}
                amount={amount}
                fee={a.fee}
              />
            )}
            {a.targets.map((x) => (
              <PriceRow key={x.hours} label={targetLabel(x.hours, lang)} price={x.price} amount={amount} fee={a.fee} />
            ))}
          </ul>

          <form className={styles.mine} onSubmit={(e) => e.preventDefault()}>
            <input
              className="mono"
              inputMode="decimal"
              enterKeyHint="done"
              autoComplete="off"
              placeholder={t.myPlaceholder}
              aria-label={t.myAria}
              value={myInput}
              onChange={(e) => setMyInput(e.target.value)}
              data-invalid={(myInput && !myPrice) || undefined}
            />
          </form>
          {myPrice && <MyPrice a={a} price={myPrice} />}

          <p className={styles.hint}>
            {t.basis({
              deals: a.deals,
              dealsText: formatNumber(a.deals),
              days: a.windowDays,
              median: formatShort(a.sales.median),
              tier: a.basis === "tier" ? (TIERS.find((x) => upgrade >= x.min && upgrade <= x.max)?.label ?? "") : null,
              upgrade,
              lots: a.lotsTotal,
              lotsText: formatNumber(a.lotsTotal),
              fee: Math.round(a.fee * 100),
            })}
          </p>
        </div>
      )}

      <SaleTiming
        region={region}
        itemId={itemId}
        quality={hasQuality ? quality : -1}
        upgrade={upgradable ? upgrade : 0}
        variant={variant}
      />
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
  const t = useT().sell;
  const lang = useLang();
  const { formatPrice, formatShort } = useFormat();
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
      <button type="button" className={styles.row} onClick={copy} disabled={!price} title={price ? t.copy : undefined}>
        <span className={styles.rowLabel}>
          <b>{label}</b>
          <span>{copied ? t.copied : (hint ?? (hours != null ? formatHours(hours, lang) : ""))}</span>
        </span>
        {price ? (
          <span className={styles.rowPrice}>
            <strong className="mono">{formatPrice(price)}</strong>
            <span className="mono">{t.net(formatShort(price * amount * (1 - fee)))}</span>
          </span>
        ) : (
          <span className={styles.rowNone}>{t.tooLate}</span>
        )}
      </button>
    </li>
  );
}

function MyPrice({ a, price }: { a: SellAdvice; price: number }) {
  const t = useT().sell;
  const lang = useLang();
  const { formatNumber, formatPrice } = useFormat();
  const hours = hoursToSell(a, price);
  const ahead = unitsAhead(a.ladder, price);
  return (
    <p className={styles.verdict} data-bad={hours == null || undefined}>
      {hours == null
        ? t.unlikely
        : t.verdict(formatHours(hours, lang).replace("≈", ""), ahead, formatNumber(ahead), formatPrice(price * a.amount * (1 - a.fee)))}
    </p>
  );
}

function NoData({ a }: { a: SellAdvice }) {
  const t = useT().sell;
  const { formatNumber, formatPrice, formatRelative } = useFormat();
  return (
    <p className={styles.note}>
      {t.noData(a.windowDays, a.deals, formatNumber(a.deals))}
      {a.ladder[0] && ` ${t.cheapestNow(formatPrice(a.ladder[0].unit))}`}
      {a.lastSale && ` ${t.lastSale(formatRelative(a.lastSale))}`}
    </p>
  );
}
