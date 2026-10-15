"use client";

import Link from "next/link";
import { type Me, useLogin, useTelegramLink } from "@/features/account";
import { haptic } from "@/lib/telegram";
import { Icon } from "../Icon";
import styles from "../PriceAlert/PriceAlert.module.css";

/** Карточка «Войти через EXBO»: аккаунт сайта - это аккаунт EXBO. */
export function LoginCard({ text }: { text: string }) {
  const login = useLogin();

  return (
    <div className={`glass ${styles.panel}`}>
      <p className={styles.note}>
        <Icon name="user" size={18} />
        <span>{text}</span>
      </p>
      <button
        type="button"
        className="btn primary"
        disabled={login.isPending}
        onClick={() => {
          haptic.tap();
          login.mutate(undefined);
        }}
      >
        {login.isPending ? "Открываем EXBO…" : "Войти через EXBO"}
      </button>
      <span className={styles.hint}>Пароль вводится только на exbo.net - сайт его не видит.</span>
      {login.error && <p className={styles.error}>{login.error.message}</p>}
    </div>
  );
}

/** «Привязать Telegram» (на сайте): уведомления приходят в бота. В мини-приложении Telegram привязан при входе. */
export function TelegramLinkCard({ text }: { text: string }) {
  const { state, start, cancel } = useTelegramLink();

  return (
    <div className={`glass ${styles.panel}`}>
      <p className={styles.note}>
        <Icon name="bell" size={18} />
        <span>{state.phase === "waiting" ? "Нажмите «✅ Привязать» в боте — эта страница обновится сама." : text}</span>
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

/** «Уведомления приходят в Telegram: @ник» — на сайте; управление привязкой — в аккаунте. */
export function SentTo({ telegram }: { telegram: NonNullable<Me["telegram"]> }) {
  const who = telegram.username ? `@${telegram.username}` : (telegram.firstName ?? "ваш Telegram");
  return (
    <span className={styles.hint}>
      Уведомления приходят в Telegram: {who} ·{" "}
      <Link href="/account" className={styles.link}>
        Аккаунт
      </Link>
    </span>
  );
}
