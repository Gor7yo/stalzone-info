"use client";

import { useSyncExternalStore } from "react";

/**
 * Общие «часы» на всё приложение: один setInterval на любое число таймеров
 * (лоты, выбросы, «был в сети N минут назад»), а не по интервалу на карточку.
 */
type Clock = { now: number; listeners: Set<() => void>; id?: ReturnType<typeof setInterval> };

const clocks = new Map<number, Clock>();

function clock(step: number): Clock {
  let c = clocks.get(step);
  if (!c) {
    c = { now: Date.now(), listeners: new Set() };
    clocks.set(step, c);
  }
  return c;
}

function subscribe(step: number, listener: () => void) {
  const c = clock(step);
  c.listeners.add(listener);
  if (!c.id) {
    c.now = Date.now();
    c.id = setInterval(() => {
      c.now = Date.now();
      c.listeners.forEach((l) => l());
    }, step);
  }
  return () => {
    c.listeners.delete(listener);
    if (!c.listeners.size && c.id) {
      clearInterval(c.id);
      c.id = undefined;
    }
  };
}

/** На сервере и при гидрации возвращает 0 — проверяйте `now > 0` перед расчётами. */
export function useNow(step = 1000): number {
  return useSyncExternalStore(
    (listener) => subscribe(step, listener),
    () => clock(step).now,
    () => 0,
  );
}
