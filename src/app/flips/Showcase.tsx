"use client";

import Link from "next/link";
import { TelegramLinkCard } from "@/components/Account/AccountGate";
import { Icon } from "@/components/Icon";
import { useStartTrial, usePro } from "@/features/pro";
import { haptic } from "@/lib/telegram";
import { ItemIcon } from "@/components/ui/ItemIcon";
import type { Showcase, ShowcaseFlip } from "@/features/flips";
import { useItems } from "@/features/items";
import { useFormat, useT } from "@/i18n/client";
import { ConfDot } from "./FlipFilters";
import { useOfferName } from "./OfferCard";
import styles from "./flips.module.css";
import s from "./showcase.module.css";

/** Ушедший флип целиком - как карточка ленты, без кнопок, и строка «выкупили через 4 мин». */
function GoneCard({ f }: { f: ShowcaseFlip }) {
  const t = useT().flips;
  const { formatShort, locale } = useFormat();
  const { data: index } = useItems();
  const item = index?.byId.get(f.itemId);
  const { name, upgrade, quality, variant } = useOfferName(f, item);
  const revenue = f.sellUnit * f.amount * 0.95;
  const buyShare = Math.min(100, Math.max(0, (f.buyout / revenue) * 100));

  return (
    <article className={s.gone}>
      <div className={styles.card} style={{ "--q": quality?.color ?? "var(--text-3)", "--buy": `${buyShare}%` } as React.CSSProperties}>
        <ItemIcon item={item} size={44} />
        <span className={s.cardText}>
          <span className={styles.nameRow}>
            <strong className="truncate">{name}</strong>
            {upgrade && <span className={styles.upgrade}>{upgrade}</span>}
            {f.amount > 1 && <span className={styles.amount}>×{f.amount}</span>}
          </span>
          <span className={styles.sub}>
            {quality && <span style={{ color: quality.color }}>{quality.label}</span>}
            {variant && <span className="truncate">{variant}</span>}
            <span className={styles.subPrice}>
              {t.buyout} <b className="mono">{formatShort(f.buyout)}</b>
            </span>
          </span>
        </span>
        <span className={styles.profit}>
          <strong className="mono">+{formatShort(f.profit)}</strong>
          <span>
            <ConfDot level={f.confidence} />
            <span className="mono">{f.pct.toLocaleString(locale)} %</span>
          </span>
        </span>
      </div>
      <p className={s.goneLine} data-sold={f.boughtInMin !== null || undefined}>
        <Icon name="clock" size={14} />
        {f.boughtInMin !== null ? t.showcase.boughtIn(f.boughtInMin) : t.showcase.expired}
      </p>
    </article>
  );
}

/**
 * Пробный Pro прямо на заглушке флиппера: доступен - одна кнопка, и лента открывается сразу;
 * без Telegram - сначала привязка (пробный - один на Telegram). null - пробного нет, показываем обычный тизер.
 */
export function TrialCard() {
  const t = useT();
  const pro = usePro();
  const trial = useStartTrial();
  if (!pro.data?.trialAvailable) return null;
  if (!pro.data.telegram) return <TelegramLinkCard text={t.pro.linkTelegramTrial} />;

  return (
    <section className={`glass ${s.trial}`}>
      <span className={s.trialIcon}>
        <Icon name="star" size={22} />
      </span>
      <span className={s.trialBody}>
        <strong>{t.flips.trialTitle}</strong>
        <span>{t.flips.trialText}</span>
      </span>
      <button
        type="button"
        className={`btn primary ${s.trialBtn}`}
        disabled={trial.isPending}
        onClick={() => {
          haptic.tap("medium");
          trial.mutate(undefined, { onSuccess: () => haptic.notify("success") });
        }}
      >
        {trial.isPending ? t.pro.trialPending : t.pro.trial}
      </button>
      {trial.error && <span className={s.trialError}>{trial.error.message}</span>}
      <Link href="/pro" className={s.trialMore}>
        {t.pro.whatPro}
      </Link>
    </section>
  );
}

/**
 * Витрина для бесплатной версии: сколько флипов нашли за сутки, сколько на них можно было
 * заработать, самый выгодный и пара уже забранных целиком - чтобы было видно, что упускаешь без Pro.
 */
export function FlipShowcase({ data }: { data: Showcase }) {
  const t = useT().flips;
  const { formatShort } = useFormat();
  const { data: index } = useItems();
  const best = data.best;

  return (
    <section className={s.showcase}>
      <div className={`glass ${s.stats}`}>
        <span className={s.kicker}>{t.showcase.title}</span>
        <strong className={`mono ${s.big}`}>{t.flipsCount(data.count)}</strong>
        <div className={s.tiles}>
          <div className={s.tile}>
            <span>{t.showcase.couldEarn}</span>
            <b className="mono" data-tone="good">
              +{formatShort(data.profit)}
            </b>
          </div>
          {best && (
            <div className={s.tile}>
              <span>{t.showcase.best}</span>
              <b className="mono">+{formatShort(best.profit)}</b>
              <small className="truncate">{index?.byId.get(best.itemId)?.name ?? best.itemId}</small>
            </div>
          )}
        </div>
      </div>

      {data.examples.length > 0 && (
        <>
          <h2 className="section-title">
            {t.showcase.goneTitle} <small>{t.showcase.goneHint}</small>
          </h2>
          <div className="stack" style={{ gap: 10 }}>
            {data.examples.map((f) => (
              <GoneCard key={`${f.itemId}|${f.seenAt}|${f.buyout}`} f={f} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
