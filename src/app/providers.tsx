"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { I18nProvider } from "@/i18n/client";
import type { Lang } from "@/i18n/lang";
import { syncFromCloud } from "@/lib/store";
import { consumeStartPath, initTelegram } from "@/lib/telegram";

export function Providers({ lang, children }: { lang: Lang | null; children: React.ReactNode }) {
  const router = useRouter();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 10 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  useEffect(() => {
    initTelegram().then(() => {
      syncFromCloud();
      const start = consumeStartPath();
      if (start) router.replace(start);
    });
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider saved={lang}>{children}</I18nProvider>
    </QueryClientProvider>
  );
}
