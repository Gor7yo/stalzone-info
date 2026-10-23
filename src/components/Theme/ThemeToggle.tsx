"use client";

import { useSyncExternalStore } from "react";
import { useT } from "@/i18n/client";
import { THEME_KEY, type Theme } from "@/lib/theme";
import { Icon } from "../Icon";
import { Segmented } from "../ui/Segmented";

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
 * Светлая/тёмная тема — переключатель с иконками (луна / солнце), рядом с RU/EN.
 * По умолчанию тёмная — фирменный вид; выбор запоминается в этом браузере.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const t = useT().shell;
  return (
    <Segmented<Theme>
      label={t.theme}
      size="sm"
      value={theme}
      onChange={setTheme}
      options={[
        { value: "dark", label: <Icon name="moon" size={15} />, ariaLabel: t.themeDark },
        { value: "light", label: <Icon name="sun" size={15} />, ariaLabel: t.themeLight },
      ]}
    />
  );
}
