"use client";

import { ErrorState } from "@/components/ui/States";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="page" style={{ paddingTop: "20vh" }}>
      <ErrorState onRetry={reset} text="Что-то пошло не так. Попробуйте ещё раз." />
    </main>
  );
}
