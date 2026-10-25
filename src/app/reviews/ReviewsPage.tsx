"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/ui/States";
import { ReviewCard, ReviewForm, Stars } from "@/components/Reviews/Reviews";
import { REVIEWS_CHANNEL_URL, useReviews } from "@/features/reviews";
import { useFormat, useT } from "@/i18n/client";
import styles from "./reviews.module.css";

export function ReviewsPage() {
  const t = useT().reviews;
  const { formatNumber } = useFormat();
  const { data, isLoading, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useReviews();
  const first = data?.pages[0];
  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <main className="page">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        aside={
          REVIEWS_CHANNEL_URL && (
            <a className="btn" href={REVIEWS_CHANNEL_URL} target="_blank" rel="noopener">
              {t.channel}
            </a>
          )
        }
      >
        {t.lead}
      </PageHeader>

      <div className="desk-split">
        <div className="desk-main">
          {first && first.count > 0 && (
            <section className={`glass ${styles.summary}`}>
              <strong className={`display ${styles.average}`}>{first.average?.toLocaleString("ru-RU")}</strong>
              <span className={styles.summaryText}>
                <Stars rating={first.average ?? 0} size={20} />
                <span>{t.count(first.count, formatNumber(first.count))}</span>
              </span>
            </section>
          )}

          <section className="section">
            {isLoading && <RowSkeleton count={3} />}
            {isError && <ErrorState onRetry={() => refetch()} />}
            {first && !items.length && <EmptyState icon="star" title={t.emptyTitle} text={t.emptyText} />}
            <div className="stack" style={{ gap: 10 }}>
              {items.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
            {hasNextPage && (
              <button
                type="button"
                className="btn"
                style={{ width: "100%", marginTop: 12 }}
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
              >
                {t.more}
              </button>
            )}
          </section>
        </div>

        <aside className="desk-side">
          <ReviewForm />
        </aside>
      </div>
    </main>
  );
}
