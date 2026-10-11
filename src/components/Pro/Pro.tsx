"use client";

import Link from "next/link";
import { haptic } from "@/lib/telegram";
import { Icon } from "../Icon";
import styles from "./Pro.module.css";

/** Значок «PRO» рядом с названием функции. */
export function ProBadge() {
  return <span className={styles.badge}>PRO</span>;
}

/**
 * Заглушка вместо Pro-функции: что тут было бы и кнопка на экран подписки.
 * compact — одной строкой (внутри страницы), иначе — крупная карточка.
 */
export function ProTeaser({ title, text, compact = false }: { title: string; text: string; compact?: boolean }) {
  return (
    <Link href="/pro" className={`glass ${styles.teaser}`} data-compact={compact || undefined} onClick={() => haptic.tap()}>
      <span className={styles.lock}>
        <Icon name="star" size={compact ? 18 : 22} />
      </span>
      <span className={styles.body}>
        <strong>
          {title} <ProBadge />
        </strong>
        <span>{text}</span>
      </span>
      {compact ? <Icon name="chevron" size={18} className="dim" /> : <span className={`btn primary ${styles.cta}`}>Что даёт Pro</span>}
    </Link>
  );
}
