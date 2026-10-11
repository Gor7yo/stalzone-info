"use client";

import { Icon } from "@/components/Icon";
import { TelegramLink } from "@/components/PriceAlert/TelegramLink";
import { ProBadge } from "@/components/Pro/Pro";
import { PageHeader } from "@/components/ui/PageHeader";
import { PRO_FEATURES, usePro } from "@/features/pro";
import { formatDate } from "@/lib/format";
import styles from "./pro.module.css";

export default function ProPage() {
  const pro = usePro();

  return (
    <main className="page">
      <PageHeader eyebrow="Подписка" title="Stalzone Pro">
        Всё, что нужно трейдеру Зоны: флиппер, алерты в Telegram, графики и точные цены по качеству и заточке.
      </PageHeader>

      <section className={`glass ${styles.hero}`}>
        <span className={styles.heroBadge}>
          <ProBadge />
        </span>
        <strong className={styles.heroTitle}>{pro.isPro ? "Pro активен" : "Pro — это имба"}</strong>
        <span className={styles.heroText}>
          {pro.isPro && pro.data?.proUntil
            ? `Действует до ${formatDate(pro.data.proUntil)}`
            : "Один выгодный флип окупает подписку. Остальные — чистая прибыль."}
        </span>
      </section>

      <section className="section">
        <h2 className="section-title">Что входит</h2>
        <div className="stack" style={{ gap: 8 }}>
          {PRO_FEATURES.map((f) => (
            <div key={f.title} className={styles.feature}>
              <span className={styles.featureIcon}>
                <Icon name={f.icon} size={20} />
              </span>
              <span className={styles.featureBody}>
                <strong>{f.title}</strong>
                <span>{f.text}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        {!pro.available ? (
          <TelegramLink text="Pro привязывается к вашему Telegram — так он работает и в мини-приложении, и на сайте. Привяжите Telegram, чтобы оформить." />
        ) : pro.isPro ? null : (
          <div className={`glass ${styles.buy}`}>
            <button type="button" className="btn primary" disabled>
              Оформить Pro
            </button>
            <span className="dim">Приём оплаты подключаем — кнопка заработает совсем скоро.</span>
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">Бесплатно остаётся</h2>
        <p className={`dim ${styles.free}`}>
          Поиск и цены на рынке, лоты, история продаж за месяц, крафт, рюкзак, кланы, сталкеры, уведомления о выбросе и один ценовой
          алерт.
        </p>
      </section>
    </main>
  );
}
