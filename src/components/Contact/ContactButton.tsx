"use client";

import { useSyncExternalStore } from "react";
import { CONTACT_URL } from "@/lib/creator";
import { haptic } from "@/lib/telegram";
import styles from "./ContactButton.module.css";

/** Нажимали ли уже — тогда кнопка больше не мигает. */
const KEY = "stalzone:contact-seen";
const EVENT = "stalzone:contact-seen";

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
};

const seen = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    // хранилище недоступно (приватный режим) — не мигаем, чтобы не раздражать
    return true;
  }
};

/**
 * «Связаться с нами» справа снизу — ведёт в поддержку бота.
 * Пульсирует, пока человек ни разу не нажал; на сервере — без пульса (нет мигания при загрузке).
 */
export function ContactButton({ label }: { label: string }) {
  const calm = useSyncExternalStore(subscribe, seen, () => true);

  return (
    <a
      className={styles.button}
      href={CONTACT_URL}
      target="_blank"
      rel="noopener"
      aria-label={label}
      data-pulse={!calm || undefined}
      onClick={() => {
        haptic.tap();
        try {
          localStorage.setItem(KEY, "1");
        } catch {}
        window.dispatchEvent(new Event(EVENT));
      }}
    >
      {/* логотип Telegram — самолётик */}
      <svg className={styles.logo} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path
          fill="currentColor"
          d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"
        />
      </svg>
      <span className={styles.label}>{label}</span>
    </a>
  );
}
