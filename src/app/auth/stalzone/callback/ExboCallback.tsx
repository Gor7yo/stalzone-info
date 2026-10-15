"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/States";
import { completeExboLogin } from "@/features/exbo";
import { haptic } from "@/lib/telegram";

type State = { phase: "working" } | { phase: "done"; login: string } | { phase: "error"; message: string };

/** Один запуск на загрузку страницы: state одноразовый, повторный вызов (StrictMode) его не найдёт. */
let pending: Promise<{ login: string }> | null = null;

async function start() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  if (params.get("error") || !code || !state) throw new Error("Вход в EXBO отменён или не завершён.");
  return completeExboLogin(code, state);
}

export function ExboCallback() {
  const qc = useQueryClient();
  const [state, setState] = useState<State>({ phase: "working" });

  useEffect(() => {
    pending ??= start();
    pending
      .then(({ login }) => {
        // код из адреса больше не нужен - убираем, чтобы не светился в истории
        window.history.replaceState(null, "", window.location.pathname);
        qc.invalidateQueries({ queryKey: ["exbo"] });
        haptic.notify("success");
        setState({ phase: "done", login });
      })
      .catch((error: unknown) => {
        haptic.notify("error");
        setState({ phase: "error", message: error instanceof Error ? error.message : "Не удалось привязать EXBO" });
      });
  }, [qc]);

  if (state.phase === "working")
    return <EmptyState icon="user" title="Привязываем EXBO…" text="Пара секунд - получаем ваших персонажей." />;

  if (state.phase === "error") {
    return (
      <EmptyState icon="bolt" tone="error" title="Не получилось" text={state.message}>
        <Link href="/pro" className="btn">
          Назад
        </Link>
      </EmptyState>
    );
  }

  return (
    <EmptyState icon="user" title={`EXBO ${state.login} привязан`} text="Персонажи и их кланы теперь видны в вашем аккаунте.">
      <Link href="/pro" className="btn primary">
        Мои персонажи
      </Link>
    </EmptyState>
  );
}
