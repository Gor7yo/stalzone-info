"use client";

import { useSyncExternalStore } from "react";
import type { Item } from "@/features/items";
import type { Offer } from "./OfferCard";

/** Разбор при наведении: одно окошко на всю ленту, карточки при этом не перерисовываются. */
export interface PeekState {
  offer: Offer;
  item?: Item;
  isNew: boolean;
  rect: DOMRect;
}

let state: PeekState | null = null;
let timer: number | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/**
 * Наведение на карточку: окошко появляется с задержкой (не мигает, пока мышь едет по ленте),
 * а между соседними карточками перескакивает сразу - hide() ждёт чуть-чуть, вдруг мышь уже на соседней.
 */
export const peek = {
  show(offer: Offer, item: Item | undefined, el: Element, isNew: boolean) {
    clearTimeout(timer);
    const open = () => {
      state = { offer, item, isNew, rect: el.getBoundingClientRect() };
      emit();
    };
    if (state) open();
    else timer = window.setTimeout(open, 140);
  },
  hide() {
    clearTimeout(timer);
    timer = window.setTimeout(peek.hideNow, 90);
  },
  hideNow() {
    clearTimeout(timer);
    if (!state) return;
    state = null;
    emit();
  },
};

export const usePeek = () =>
  useSyncExternalStore(
    subscribe,
    () => state,
    () => null,
  );
