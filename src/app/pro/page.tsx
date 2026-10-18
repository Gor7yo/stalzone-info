"use client";

import { LoginCard, TelegramLinkCard } from "@/components/Account/AccountGate";
import { Icon } from "@/components/Icon";
import { ProBadge } from "@/components/Pro/Pro";
import { PageHeader } from "@/components/ui/PageHeader";
import { PRO_BUY_URL, PRO_FEATURES, usePro, useStartTrial } from "@/features/pro";
import { useFormat, useT } from "@/i18n/client";
import styles from "./pro.module.css";

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

      <section className="section">
        <h2 className="section-title">{t.freeTitle}</h2>
        <p className={`dim ${styles.free}`}>{t.freeText}</p>
      </section>
    </main>
  );
}
