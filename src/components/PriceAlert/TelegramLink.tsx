"use client";

import { useTelegramLink } from "@/features/alerts";
import type { TgSession } from "@/lib/tgSession";
import { haptic } from "@/lib/telegram";
import { Icon } from "../Icon";
import styles from "./PriceAlert.module.css";

/** Карточка «Привязать Telegram» для обычного браузера: без неё уведомлениям некуда приходить. */
export function TelegramLink({ text }: { text: string }) {
  const { state, start, cancel } = useTelegramLink();

  return (
    <div className={`glass ${styles.panel}`}>
      <p className={styles.note}>
        <Icon name="bell" size={18} />
        <span>
          {state.phase === "waiting" ? "Нажмите «✅ Привязать» в боте — эта страница обновится сама." : text}
        </span>
      </p>

      {state.phase === "waiting" ? (
        <div className={styles.form}>
          <a className="btn primary" style={{ flex: 1 }} href={state.url} target="_blank" rel="noopener noreferrer">
            Открыть бота
          </a>
          <button type="button" className="btn" onClick={cancel}>
            Отмена
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            haptic.tap();
            start();
          }}
        >
          Привязать Telegram
        </button>
      )}

      {state.phase === "error" && <p className={styles.error}>{state.message}</p>}
    </div>
  );
}

/** «Уведомления → @ник · Отвязать» — только в браузере, привязанном через бота. */
export function LinkedAs({ session }: { session: TgSession }) {
  const { unlink } = useTelegramLink();
  const who = session.username ? `@${session.username}` : (session.firstName ?? "ваш Telegram");

  return (
    <span className={styles.hint}>
      Уведомления приходят в Telegram: {who} ·{" "}
      <button type="button" className={styles.link} onClick={unlink}>
        Отвязать
      </button>
    </span>
  );
}
