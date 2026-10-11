"use client";

import { useQuery } from "@tanstack/react-query";
import { useIsTelegram } from "@/lib/telegram";
import { useTgSession } from "@/lib/tgSession";
import { authed } from "./alerts";

export interface ProStatus {
  pro: boolean;
  /** до какого момента действует (ISO); null — не оформлен */
  proUntil: string | null;
  limits: { priceAlerts: number };
}

/** Что даёт Pro — для экрана подписки и заглушек. */
export const PRO_FEATURES: { icon: "bolt" | "bell" | "market" | "sparkle" | "star"; title: string; text: string }[] = [
  { icon: "bolt", title: "Флиппер", text: "Лоты дешевле рынка в реальном времени — выкупай и перепродавай с прибылью" },
  { icon: "bell", title: "Флип-алерты в Telegram", text: "Бот сам пришлёт выгодный лот, пока его не выкупили другие" },
  { icon: "market", title: "Графики цен", text: "История цены за день и неделю, медиана, тренд и подсказки по каждой сделке" },
  { icon: "sparkle", title: "Качество и заточка", text: "Фильтр лотов и сделок по качеству артефакта и уровню заточки, оценка «выгодно / дорого»" },
  { icon: "star", title: "20 ценовых алертов", text: "Вместо одного — и с точным качеством и заточкой" },
];

/**
 * Статус подписки. Без Telegram (браузер без привязки) — бесплатная версия.
 * isPro по умолчанию false, пока статус грузится, — чтобы Pro-функции не мигали.
 */
export function usePro() {
  const inTelegram = useIsTelegram();
  const session = useTgSession();
  const available = inTelegram || Boolean(session);
  const query = useQuery({
    queryKey: ["me"],
    queryFn: () => authed<ProStatus>("/api/me"),
    enabled: available,
    staleTime: 60_000,
  });
  return {
    ...query,
    /** можно узнать статус (есть Telegram) */
    available,
    isPro: query.data?.pro ?? false,
    /** статус ещё неизвестен — не показываем ни Pro, ни заглушку */
    pending: available && query.isLoading,
  };
}
