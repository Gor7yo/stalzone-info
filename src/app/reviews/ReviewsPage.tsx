"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/ui/States";
import { ReviewCard, ReviewForm, Stars } from "@/components/Reviews/Reviews";
import { REVIEWS_CHANNEL_URL, useReviewStatus, useReviews } from "@/features/reviews";
import { useFormat, useT } from "@/i18n/client";
import styles from "./reviews.module.css";

export function ReviewsPage() {
  const t = useT().reviews;
  const { formatNumber } = useFormat();
  const { data, isLoading, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useReviews();
  const status = useReviewStatus();
  const first = data?.pages[0];
  const published = data?.pages.flatMap((p) => p.items) ?? [];
  // свой отзыв — первым, сразу после отправки (у остальных он появится, когда его опубликуют)
  const mine = status.data?.mine;
  const extra = mine && !published.some((r) => r.id === mine.id) ? mine : null;
  const items = extra ? [extra, ...published] : published;
  // и в итогах его отзыв уже учтён — иначе «1 отзыв» при двух карточках
  const count = (first?.count ?? 0) + (extra ? 1 : 0);
  const average = extra ? Math.round((((first?.average ?? 0) * (first?.count ?? 0) + extra.rating) / count) * 10) / 10 : first?.average;

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
          {first && count > 0 && (
            <section className={`glass ${styles.summary}`}>
              <strong className={`display ${styles.average}`}>{average?.toLocaleString("ru-RU")}</strong>
              <span className={styles.summaryText}>
                <Stars rating={average ?? 0} size={20} />
                <span>{t.count(count, formatNumber(count))}</span>
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
