"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/States";
import { completeLogin } from "@/features/account";
import { haptic } from "@/lib/telegram";

type State = { phase: "working" } | { phase: "error"; message: string };

/** Один запуск на загрузку страницы: state одноразовый, повторный вызов (StrictMode) его не найдёт. */
let pending: ReturnType<typeof completeLogin> | null = null;

async function start() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  if (params.get("error") || !code || !state) throw new Error("Вход в EXBO отменён или не завершён.");
  return completeLogin(code, state);
}

/** Возврат из EXBO: получаем сессию и возвращаем туда, откуда нажали «Войти». */
export function ExboCallback() {
  const qc = useQueryClient();
  const router = useRouter();
  const [state, setState] = useState<State>({ phase: "working" });

  useEffect(() => {
    pending ??= start();
    pending
      .then(({ returnTo }) => {
        qc.removeQueries();
        haptic.notify("success");
        // replace: страница возврата с кодом не остаётся в истории
        router.replace(returnTo);
      })
      .catch((error: unknown) => {
        haptic.notify("error");
        setState({ phase: "error", message: error instanceof Error ? error.message : "Не удалось войти через EXBO" });
      });
  }, [qc, router]);

  if (state.phase === "working") {
    return <EmptyState icon="user" title="Входим через EXBO…" text="Пара секунд - получаем ваших персонажей." />;
  }

  return (
    <EmptyState icon="bolt" tone="error" title="Не получилось войти" text={state.message}>
      <Link href="/account" className="btn">
        Назад
      </Link>
    </EmptyState>
  );
}
