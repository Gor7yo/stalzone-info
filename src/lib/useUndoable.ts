"use client";

import { useCallback, useEffect, useState } from "react";

const LIMIT = 30;

/**
 * Состояние с историей: set() запоминает предыдущее значение, undo() возвращает его.
 * Ctrl+Z / ⌘Z на десктопе тоже делает undo (кроме ввода в поля).
 */
export function useUndoable<T extends object>(initial: T) {
  const [state, setState] = useState({ value: initial, past: [] as T[] });

  const set = useCallback((patch: Partial<T>) => {
    setState(({ value, past }) => {
      const next = { ...value, ...patch };
      const changed = (Object.keys(patch) as (keyof T)[]).some((k) => !Object.is(value[k], next[k]));
      return changed ? { value: next, past: [...past.slice(-LIMIT + 1), value] } : { value, past };
    });
  }, []);

  /** Изменение без записи в историю (например, номер страницы при подгрузке). */
  const replace = useCallback((patch: Partial<T>) => {
    setState(({ value, past }) => ({ value: { ...value, ...patch }, past }));
  }, []);

  const undo = useCallback(() => {
    setState(({ value, past }) => (past.length ? { value: past[past.length - 1], past: past.slice(0, -1) } : { value, past }));
  }, []);

  const canUndo = state.past.length > 0;

  useEffect(() => {
    if (!canUndo) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === "KeyZ") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canUndo, undo]);

  return { value: state.value, set, replace, undo, canUndo };
}
