"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { authed, useMe } from "./account";

export interface Review {
  id: number;
  nick: string;
  rating: number;
  text: string;
  createdAt: string;
}

interface ReviewPage {
  count: number;
  /** средняя оценка; null — отзывов ещё нет */
  average: number | null;
  items: Review[];
  more: boolean;
}

/** Ограничения формы — те же, что на сервере. */
export const REVIEW_NICK = { min: 2, max: 32 } as const;
export const REVIEW_TEXT = { min: 10, max: 500 } as const;

/** Канал с отзывами в Telegram (ссылка), если он есть. */
export const REVIEWS_CHANNEL_URL = process.env.NEXT_PUBLIC_REVIEWS_CHANNEL_URL || null;

const KEY = ["reviews"] as const;

/** Опубликованные отзывы, по 20, «Показать ещё» — следующая страница. */
export function useReviews() {
  return useInfiniteQuery({
    queryKey: KEY,
    queryFn: ({ pageParam }) => api<ReviewPage>("/api/reviews", { before: pageParam }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => (last.more ? last.items.at(-1)?.id : undefined),
    staleTime: 60_000,
  });
}

/** Можно ли оставить отзыв: нужен вход и привязанный Telegram, раз в неделю. */
export function useReviewStatus() {
  const { loggedIn, pending } = useMe();
  const query = useQuery({
    queryKey: [...KEY, "me"],
    // mine — свой отзыв за неделю: автор видит его в списке сразу
    queryFn: () => authed<{ telegram: boolean; nextAt: string | null; mine: Review | null }>("/api/reviews/me"),
    enabled: loggedIn,
    staleTime: 30_000,
  });
  return { ...query, loggedIn, pending };
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { nick: string; rating: number; text: string }) => authed<Review>("/api/reviews", "POST", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, "me"] }),
  });
}
