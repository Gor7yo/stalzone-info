"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authed, useMe } from "./account";

/** Админка: метрики, аккаунты, Pro и баны. Доступ — аккаунт с Telegram из ADMIN_CHAT_IDS на бэкенде. */

export interface Point {
  day: string;
  n: number;
}

export interface Money {
  currency: string;
  amount: number;
  count: number;
}

export interface Dashboard {
  updatedAt: string;
  users: { total: number; new1: number; new7: number; dau: number; wau: number; mau: number; banned: number; telegram: number };
  pro: { active: number; trials: number; paidUsers: number; payments: number };
  revenue: { total: Money[]; last30: Money[] };
  alerts: { price: number; flip: number; emission: number };
  series: { newUsers: Point[]; active: Point[]; payments: Point[] };
  collector: {
    regions: string[];
    tracked: number;
    overdue: { lots: number; sales: number };
    backfilling: number;
    budget: { perMinute: number; reserve: number; available: number };
    stored: { sales: number; activeLots: number };
  };
}

/** Аккаунт (EXBO) в админке. */
export interface AdminUser {
  id: string;
  login: string;
  /** привязанный Telegram; null - не привязан */
  telegram: { chatId: string; username: string | null; firstName: string | null; botBlocked: boolean } | null;
  pro: boolean;
  proUntil: string | null;
  trialUsedAt: string | null;
  banned: boolean;
  bannedUntil: string | null;
  banReason: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface LogEntry {
  id: string;
  adminId: string;
  /** Telegram цели (старые записи) */
  targetId: string | null;
  targetUserId: string | null;
  /** логин цели (только в общем журнале) */
  targetLogin?: string | null;
  action: "pro_grant" | "pro_revoke" | "ban" | "unban";
  details: string | null;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUser {
  alerts: { price: number; flip: number };
  payments: { id: string; event: string; amount: number | null; currency: string | null; createdAt: string }[];
  log: LogEntry[];
}

/** Срок: N дней, до даты или навсегда. */
export type Term = { days: number } | { until: string } | { forever: true };

/** Админ ли текущий пользователь (флаг из /api/me). */
export function useIsAdmin() {
  return Boolean(useMe().me?.admin);
}

export const useDashboard = (enabled: boolean) =>
  useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => authed<Dashboard>("/api/admin/dashboard"),
    enabled,
    refetchInterval: 60_000,
  });

export const useAdminUsers = (q: string, enabled: boolean) =>
  useQuery({
    queryKey: ["admin", "users", q],
    queryFn: () => authed<AdminUser[]>(`/api/admin/users?q=${encodeURIComponent(q)}`),
    enabled,
    placeholderData: (prev) => prev,
  });

export const useAdminUser = (id: string | null) =>
  useQuery({
    queryKey: ["admin", "user", id],
    queryFn: () => authed<AdminUserDetail>(`/api/admin/users/${id}`),
    enabled: !!id,
  });

export const useAdminLog = (enabled: boolean) =>
  useQuery({
    queryKey: ["admin", "log"],
    queryFn: () => authed<LogEntry[]>("/api/admin/log"),
    enabled,
  });

type Action =
  | { kind: "pro"; term: Term; notify: boolean; message?: string }
  | { kind: "revoke" }
  | { kind: "ban"; term: Term; reason: string }
  | { kind: "unban" };

/** Действие над пользователем; после него обновляем карточку, список и журнал. */
export function useAdminAction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: Action) => {
      const base = `/api/admin/users/${id}`;
      switch (a.kind) {
        case "pro":
          return authed<AdminUserDetail>(`${base}/pro`, "POST", {
            ...a.term,
            notify: a.notify,
            message: a.notify && a.message?.trim() ? a.message.trim() : undefined,
          });
        case "revoke":
          return authed<AdminUserDetail>(`${base}/pro/revoke`, "POST");
        case "ban":
          return authed<AdminUserDetail>(`${base}/ban`, "POST", { ...a.term, reason: a.reason || undefined });
        case "unban":
          return authed<AdminUserDetail>(`${base}/unban`, "POST");
      }
    },
    onSuccess: (user) => {
      qc.setQueryData(["admin", "user", id], user);
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
      void qc.invalidateQueries({ queryKey: ["admin", "log"] });
      void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
