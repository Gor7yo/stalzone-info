"use client";

import { useState } from "react";
import { deepLink, haptic, share } from "@/lib/telegram";
import { Icon } from "../Icon";
import styles from "./ui.module.css";

export function FavButton({
  active,
  onToggle,
  label = "В избранное",
}: {
  active: boolean;
  onToggle: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      className={`icon-btn ${styles.fav}`}
      data-active={active || undefined}
      aria-pressed={active}
      aria-label={active ? "Убрать из избранного" : label}
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
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={`icon-btn ${styles.share}`}
      aria-label="Поделиться"
      onClick={async () => {
        haptic.tap();
        const result = await share(deepLink(window.location.pathname), text);
        if (result === "copied") {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }
      }}
    >
      <Icon name="share" size={18} />
      {copied && (
        <span className={styles.toast} role="status">
          Ссылка скопирована
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
  const [busy, setBusy] = useState(false);
  const [cooling, setCooling] = useState(false);

  return (
    <button
      type="button"
      className={`icon-btn ${styles.refresh}`}
      aria-label="Обновить"
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
