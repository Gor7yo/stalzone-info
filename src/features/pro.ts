"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authed, ME_KEY, useMe } from "./account";

/**
 * Страница оплаты Pro в Tribute. Pro выдаётся вебхуком на Telegram покупателя,
 * а с него - аккаунту, к которому этот Telegram привязан.
 */
export const PRO_BUY_URL = "https://web.tribute.tg/p/GO6";
/** Пробный Pro на 3 дня (один раз на аккаунт и на Telegram). */
export function useStartTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authed("/api/me/trial", "POST"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ME_KEY });
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}

/** Что даёт Pro — для экрана подписки и заглушек. */
export const PRO_FEATURES: { icon: "bolt" | "bell" | "market" | "sparkle" | "star" | "tag"; title: string; text: string }[] = [
  { icon: "bolt", title: "Флиппер", text: "Лоты дешевле рынка в реальном времени — выкупай и перепродавай с прибылью" },
  { icon: "bell", title: "Флип-алерты в Telegram", text: "Бот сам пришлёт выгодный лот, пока его не выкупили другие" },
  { icon: "tag", title: "Помощник продажи", text: "По какой цене выставить лот, чтобы он ушёл за час, 6 часов или сутки" },
  { icon: "market", title: "Графики цен", text: "История цены за день и неделю, медиана, тренд и подсказки по каждой сделке" },
  {
    icon: "sparkle",
    title: "Качество и заточка",
    text: "Фильтр лотов и сделок по качеству артефакта и уровню заточки, оценка «выгодно / дорого»",
  },
  { icon: "star", title: "20 ценовых алертов", text: "Вместо одного — и с точным качеством и заточкой" },
];

/**
 * Статус подписки аккаунта. Без входа — бесплатная версия.
 * isPro по умолчанию false, пока статус грузится, — чтобы Pro-функции не мигали.
 */
export function usePro() {
  const { me, loggedIn, pending, refetch } = useMe();
  return {
    data: me,
    refetch,
    /** вошли в аккаунт - статус известен */
    available: loggedIn,
    isPro: me?.pro ?? false,
    /** статус ещё неизвестен — не показываем ни Pro, ни заглушку */
    pending,
  };
}
