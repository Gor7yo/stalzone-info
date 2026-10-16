import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Выброс - таймер",
  description:
    "Выброс в STALZONE: когда был последний и когда ждать следующий, таймер по регионам RU, EU, NA и SEA, уведомления в Telegram.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
