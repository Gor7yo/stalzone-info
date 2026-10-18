"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

/** Реферальная ссылка аккаунта (t.me/<бот>?start=ref_…) и счётчики приглашений. */
export interface Referral {
  link: string;
  invited: number;
  rewardedMonth: number;
  monthLimit: number;
  bonusDays: number;
  trialDays: number;
}

export const useReferral = (enabled: boolean) =>
  useQuery({
    enabled,
    queryKey: ["referral"],
    queryFn: () => authed<Referral>("/api/me/referral"),
    staleTime: 60_000,
  });

/** Что даёт Pro — для экрана подписки и заглушек (тексты - в словаре, t.pro.features[key]). */
export const PRO_FEATURES: {
  icon: "bolt" | "bell" | "market" | "sparkle" | "star" | "tag";
  key: "flipper" | "flipAlerts" | "sell" | "charts" | "quality" | "alerts";
}[] = [
  { icon: "bolt", key: "flipper" },
  { icon: "bell", key: "flipAlerts" },
  { icon: "tag", key: "sell" },
  { icon: "market", key: "charts" },
  { icon: "sparkle", key: "quality" },
  { icon: "star", key: "alerts" },
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
