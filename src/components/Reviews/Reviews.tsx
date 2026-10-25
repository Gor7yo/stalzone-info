"use client";

import { useState } from "react";
import { LoginCard, TelegramLinkCard } from "@/components/Account/AccountGate";
import { REVIEW_NICK, REVIEW_TEXT, useCreateReview, useReviewStatus, type Review } from "@/features/reviews";
import { useFormat, useT } from "@/i18n/client";
import { haptic } from "@/lib/telegram";
import styles from "./Reviews.module.css";

/** Пять звёзд: заполненные — оценка. */
export function Stars({ rating, size = 15 }: { rating: number; size?: number }) {
  return (
    <span className={styles.stars} style={{ fontSize: size }} aria-label={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} data-on={i <= Math.round(rating) || undefined}>
          ★
        </span>
      ))}
    </span>
  );
}

export function ReviewCard({ review }: { review: Review }) {
  const { formatDate } = useFormat();
  return (
    <article className={`glass ${styles.card}`}>
      <div className={styles.cardHead}>
        <strong className="truncate">{review.nick}</strong>
        <Stars rating={review.rating} />
      </div>
      <p className={styles.text}>{review.text}</p>
      <time className={styles.date} dateTime={review.createdAt}>
        {formatDate(review.createdAt)}
      </time>
    </article>
  );
}

/** Форма отзыва: вход → привязка Telegram → раз в неделю → форма. */
export function ReviewForm() {
  const t = useT().reviews;
  const { formatDate } = useFormat();
  const status = useReviewStatus();
  const create = useCreateReview();
  const [rating, setRating] = useState(0);
  const [nick, setNick] = useState("");
  const [text, setText] = useState("");

  if (status.pending) return null;
  if (!status.loggedIn) return <LoginCard text={t.login} />;
  if (status.data && !status.data.telegram) return <TelegramLinkCard text={t.linkTelegram} />;
  if (create.isSuccess) {
    return (
      <div className={`glass ${styles.done}`}>
        <strong>{t.sentTitle}</strong>
        <span>{t.sentText}</span>
      </div>
    );
  }
  if (status.data?.nextAt) {
    return (
      <div className={`glass ${styles.done}`}>
        <strong>{t.limitTitle}</strong>
        <span>{t.limitText(formatDate(status.data.nextAt))}</span>
      </div>
    );
  }

  const valid = rating > 0 && nick.trim().length >= REVIEW_NICK.min && text.trim().length >= REVIEW_TEXT.min;
  return (
    <form
      className={`glass ${styles.form}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid || create.isPending) return;
        haptic.tap("medium");
        create.mutate({ nick: nick.trim(), rating, text: text.trim() }, { onSuccess: () => haptic.notify("success") });
      }}
    >
      <strong className={styles.formTitle}>{t.formTitle}</strong>
      <div className={styles.pick} role="radiogroup" aria-label={t.ratingAria}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={rating === i}
            aria-label={t.starAria(i)}
            data-on={i <= rating || undefined}
            onClick={() => {
              haptic.select();
              setRating(i);
            }}
          >
            ★
          </button>
        ))}
      </div>
      <label className={styles.field}>
        <span>{t.nick}</span>
        <input
          className={styles.input}
          value={nick}
          maxLength={REVIEW_NICK.max}
          placeholder={t.nickPlaceholder}
          onChange={(e) => setNick(e.target.value)}
        />
      </label>
      <label className={styles.field}>
        <span>
          {t.text}
          <small>
            {text.trim().length}/{REVIEW_TEXT.max}
          </small>
        </span>
        <textarea
          className={styles.input}
          value={text}
          rows={4}
          maxLength={REVIEW_TEXT.max}
          placeholder={t.textPlaceholder}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      {create.error && <span className={styles.error}>{create.error.message}</span>}
      <button type="submit" className="btn primary" disabled={!valid || create.isPending}>
        {create.isPending ? t.sending : t.send}
      </button>
      <span className={styles.hint}>{t.hint}</span>
    </form>
  );
}
