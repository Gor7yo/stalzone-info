"use client";

import { ErrorState } from "@/components/ui/States";
import { useT } from "@/i18n/client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const t = useT();
  return (
    <main className="page" style={{ paddingTop: "20vh" }}>
      <ErrorState onRetry={reset} text={t.common.errorGeneric} />
    </main>
  );
}
