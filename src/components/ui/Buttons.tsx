"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { haptic, share } from "@/lib/telegram";
import { Icon } from "../Icon";
import { SITE_URL } from "../JsonLd";
import styles from "./ui.module.css";

export function FavButton({ active, onToggle, label }: { active: boolean; onToggle: () => void; label?: string }) {
  const t = useT();
  return (
    <button
      type="button"
      className={`icon-btn ${styles.fav}`}
      data-active={active || undefined}
      aria-pressed={active}
      aria-label={active ? t.common.favRemove : (label ?? t.common.favAdd)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        haptic.notify(active ? "warning" : "success");
        onToggle();
      }}
    >
      <Icon name="star" size={19} filled={active} />
    </button>
  );
}

export function ShareButton({ text }: { text: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={`icon-btn ${styles.share}`}
      aria-label={t.common.share}
      onClick={async () => {
        haptic.tap();
        // всегда ссылка на сайт (не на мини-приложение): открывается в браузере и даёт картинку-превью
        const result = await share(`${SITE_URL}${window.location.pathname}`, text);
        if (result === "copied") {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }
      }}
    >
      <Icon name="share" size={18} />
      {copied && (
        <span className={styles.toast} role="status">
          {t.common.linkCopied}
        </span>
      )}
    </button>
  );
}

/**
 * Обновить данные: крутится, пока идёт запрос; перезарядка (кольцо по кругу)
 * начинается только когда пришёл ответ — 5 с по умолчанию.
 */
export function RefreshButton({ onRefresh, cooldownMs = 5000 }: { onRefresh: () => Promise<unknown>; cooldownMs?: number }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [cooling, setCooling] = useState(false);

  return (
    <button
      type="button"
      className={`icon-btn ${styles.refresh}`}
      aria-label={t.common.refresh}
      data-busy={busy || undefined}
      data-cooling={cooling || undefined}
      style={{ "--cooldown": `${cooldownMs}ms` } as React.CSSProperties}
      disabled={busy || cooling}
      onClick={async () => {
        haptic.tap();
        setBusy(true);
        try {
          await onRefresh();
        } finally {
          // отсчёт — с момента ответа сервера (и при ошибке тоже, чтобы не долбить API)
          setBusy(false);
          setCooling(true);
          setTimeout(() => setCooling(false), cooldownMs);
        }
      }}
    >
      <Icon name="refresh" size={18} />
    </button>
  );
}
