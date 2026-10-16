"use client";

import { useSyncExternalStore } from "react";
import { useT } from "@/i18n/client";
import { haptic } from "@/lib/telegram";
import { THEME_KEY, type Theme } from "@/lib/theme";
import { Icon } from "../Icon";
import styles from "./ThemeToggle.module.css";

// тема живёт на <html data-theme> (её ставит скрипт в <head>); переключатели узнают о смене через подписку
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const snapshot = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
// на сервере темы не знаем — рисуем тёмную, после гидрации подхватится выбранная
const serverSnapshot = (): Theme => "dark";

function setTheme(next: Theme) {
  if (next === "light") document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* приватный режим — тема до перезагрузки */
  }
  listeners.forEach((l) => l());
}

/**
 * Светлая/тёмная тема. compact — круглая кнопка-иконка (подвал), иначе строка с подписью (боковая панель).
 * По умолчанию тёмная — фирменный вид; выбор запоминается в этом браузере.
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const t = useT().shell;
  const label = theme === "light" ? t.themeDark : t.themeLight;
  return (
    <button
      type="button"
      className={compact ? styles.icon : styles.row}
      onClick={() => {
        haptic.select();
        setTheme(theme === "light" ? "dark" : "light");
      }}
      aria-label={label}
      title={label}
    >
      <Icon name={theme === "light" ? "moon" : "sun"} size={compact ? 16 : 18} />
      {!compact && label}
    </button>
  );
}
