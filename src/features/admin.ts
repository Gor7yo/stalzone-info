"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authed } from "./alerts";
import { usePro } from "./pro";

/** Админка: метрики, пользователи, Pro и баны. Доступ — Telegram id из ADMIN_CHAT_IDS на бэкенде. */

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
  users: { total: number; new1: number; new7: number; dau: number; wau: number; mau: number; banned: number };
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

export interface AdminUser {
  chatId: string;
  username: string | null;
  firstName: string | null;
  pro: boolean;
  proUntil: string | null;
  trialUsedAt: string | null;
  banned: boolean;
  bannedUntil: string | null;
  banReason: string | null;
  botBlocked: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface LogEntry {
  id: string;
  adminId: string;
  targetId: string;
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
  const pro = usePro();
  return Boolean(pro.data?.admin);
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

export const useAdminUser = (chatId: string | null) =>
  useQuery({
    queryKey: ["admin", "user", chatId],
    queryFn: () => authed<AdminUserDetail>(`/api/admin/users/${chatId}`),
    enabled: !!chatId,
  });

export const useAdminLog = (enabled: boolean) =>
  useQuery({
    queryKey: ["admin", "log"],
    queryFn: () => authed<LogEntry[]>("/api/admin/log"),
    enabled,
  });

type Action =
  | { kind: "pro"; term: Term; notify: boolean }
  | { kind: "revoke" }
  | { kind: "ban"; term: Term; reason: string }
  | { kind: "unban" };

/** Действие над пользователем; после него обновляем карточку, список и журнал. */
export function useAdminAction(chatId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: Action) => {
      const base = `/api/admin/users/${chatId}`;
      switch (a.kind) {
        case "pro":
          return authed<AdminUserDetail>(`${base}/pro`, "POST", { ...a.term, notify: a.notify });
        case "revoke":
          return authed<AdminUserDetail>(`${base}/pro/revoke`, "POST");
        case "ban":
          return authed<AdminUserDetail>(`${base}/ban`, "POST", { ...a.term, reason: a.reason || undefined });
        case "unban":
          return authed<AdminUserDetail>(`${base}/unban`, "POST");
      }
    },
    onSuccess: (user) => {
      qc.setQueryData(["admin", "user", chatId], user);
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
      void qc.invalidateQueries({ queryKey: ["admin", "log"] });
      void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
