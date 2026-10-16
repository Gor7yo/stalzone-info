"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/States";
import { completeLogin } from "@/features/account";
import { useT } from "@/i18n/client";
import { tr } from "@/i18n/lang";
import { haptic } from "@/lib/telegram";

type State = { phase: "working" } | { phase: "error"; message: string };

/** Один запуск на загрузку страницы: state одноразовый, повторный вызов (StrictMode) его не найдёт. */
let pending: ReturnType<typeof completeLogin> | null = null;

async function start() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  if (params.get("error") || !code || !state) {
    throw new Error(tr("Вход в EXBO отменён или не завершён.", "EXBO sign-in was cancelled or not completed."));
  }
  return completeLogin(code, state);
}

/** Возврат из EXBO: получаем сессию и возвращаем туда, откуда нажали «Войти». */
export function ExboCallback() {
  const t = useT();
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
        setState({
          phase: "error",
          message: error instanceof Error ? error.message : tr("Не удалось войти через EXBO", "Couldn't sign in with EXBO"),
        });
      });
  }, [qc, router]);

  if (state.phase === "working") {
    return <EmptyState icon="user" title={t.callback.working} text={t.callback.workingText} />;
  }

  return (
    <EmptyState icon="bolt" tone="error" title={t.callback.failed} text={state.message}>
      <Link href="/account" className="btn">
        {t.common.back}
      </Link>
    </EmptyState>
  );
}
