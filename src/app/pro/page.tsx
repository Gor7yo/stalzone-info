"use client";

import Link from "next/link";
import { LoginCard, TelegramLinkCard } from "@/components/Account/AccountGate";
import { Icon } from "@/components/Icon";
import { ProBadge } from "@/components/Pro/Pro";
import { ReviewCard, Stars } from "@/components/Reviews/Reviews";
import { PageHeader } from "@/components/ui/PageHeader";
import { PRO_BUY_URL, PRO_FEATURES, usePro, useReferral, useStartTrial } from "@/features/pro";
import { useReviews } from "@/features/reviews";
import { useFormat, useT } from "@/i18n/client";
import { haptic } from "@/lib/telegram";
import { useState } from "react";
import styles from "./pro.module.css";

/** Три свежих отзыва и средняя оценка; пока отзывов нет — блока нет. */
function ProReviews() {
  const t = useT().reviews;
  const { formatNumber } = useFormat();
  const { data } = useReviews();
  const first = data?.pages[0];
  if (!first?.count) return null;
  return (
    <section className="section">
      <h2 className="section-title">
        {t.proTitle}
        <Link href="/reviews">{t.proAll}</Link>
      </h2>
      <div className={styles.reviewsHead}>
        <Stars rating={first.average ?? 0} size={18} />
        <span>
          {first.average?.toLocaleString("ru-RU")} · {t.count(first.count, formatNumber(first.count))}
        </span>
      </div>
      <div className="stack desk-grid" style={{ gap: 8 }}>
        {first.items.slice(0, 3).map((r) => (
          <ReviewCard key={r.id} review={r} />
        ))}
      </div>
    </section>
  );
}

/** Реферальная ссылка: друг получает пробный, вы — день Pro за каждого. */
function ReferralCard() {
  const t = useT().pro.referral;
  const { data } = useReferral(true);
  const [copied, setCopied] = useState(false);
  if (!data) return null;

  const share = `https://t.me/share/url?url=${encodeURIComponent(data.link)}&text=${encodeURIComponent(t.shareText(data.trialDays))}`;
  return (
    <section className="section">
      <h2 className="section-title">{t.title}</h2>
      <div className={`glass ${styles.referral}`}>
        <p>{t.text(data.trialDays, data.bonusDays, data.minHours ?? 5)}</p>
        <div className={styles.refLink}>
          <code>{data.link}</code>
          <button
            type="button"
            className="btn"
            onClick={() => {
              haptic.tap();
              void navigator.clipboard?.writeText(data.link).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
          >
            {copied ? t.copied : t.copy}
          </button>
        </div>
        <a className="btn primary" href={share} target="_blank" rel="noopener" onClick={() => haptic.tap()}>
          <Icon name="share" size={16} /> {t.share}
        </a>
        <div className={styles.refStats}>
          <span>
            {t.invited} <strong className="mono">{data.invited}</strong>
          </span>
          <span>
            {t.month} <strong className="mono">{`${data.rewardedMonth} / ${data.monthLimit}`}</strong>
          </span>
        </div>
      </div>
    </section>
  );
}

export default function ProPage() {
  const t = useT().pro;
  const { formatDate } = useFormat();
  const pro = usePro();
  const trial = useStartTrial();

  return (
    <main className="page">
      <PageHeader eyebrow={t.eyebrow} title="STALZONE INFO Pro">
        {t.lead}
      </PageHeader>

      <section className={`glass ${styles.hero}`}>
        <span className={styles.heroBadge}>
          <ProBadge />
        </span>
        <strong className={styles.heroTitle}>{pro.isPro ? t.active : t.heroTitle}</strong>
        <span className={styles.heroText}>{pro.isPro && pro.data?.proUntil ? t.until(formatDate(pro.data.proUntil)) : t.heroText}</span>
      </section>

      <section className="section">
        <h2 className="section-title">{t.included}</h2>
        <div className="stack desk-grid" style={{ gap: 8 }}>
          {PRO_FEATURES.map((f) => (
            <div key={f.key} className={styles.feature}>
              <span className={styles.featureIcon}>
                <Icon name={f.icon} size={20} />
              </span>
              <span className={styles.featureBody}>
                <strong>{t.features[f.key][0]}</strong>
                <span>{t.features[f.key][1]}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        {pro.pending ? null : !pro.available ? (
          <LoginCard text={t.login} />
        ) : pro.isPro ? null : (
          <div className="stack" style={{ gap: 12 }}>
            {/* без Telegram — сначала привязка: пробный выдаётся один на Telegram */}
            {pro.data?.telegram ? (
              <div className={`glass ${styles.buy}`}>
                {pro.data.trialAvailable && (
                  <>
                    <button type="button" className="btn primary" disabled={trial.isPending} onClick={() => trial.mutate()}>
                      {trial.isPending ? t.trialPending : t.trial}
                    </button>
                    {trial.error && <span className="dim">{trial.error.message}</span>}
                  </>
                )}
                <a
                  href={PRO_BUY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={pro.data.trialAvailable ? "btn" : "btn primary"}
                  onClick={() => setTimeout(() => pro.refetch(), 30_000)}
                >
                  {t.buy}
                </a>
                <span className="dim">{t.payHint}</span>
              </div>
            ) : (
              <TelegramLinkCard text={pro.data?.trialAvailable ? t.linkTelegramTrial : t.linkTelegram} />
            )}
            <p className={`dim ${styles.free}`}>{t.safe}</p>
          </div>
        )}
      </section>

      <ProReviews />

      {pro.available && <ReferralCard />}

      <section className="section">
        <h2 className="section-title">{t.freeTitle}</h2>
        <p className={`dim ${styles.free}`}>{t.freeText}</p>
      </section>
    </main>
  );
}
