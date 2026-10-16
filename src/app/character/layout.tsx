import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Игроки", template: "%s · STALZONE INFO" },
  description: "Поиск игроков STALZONE по нику: статистика, достижения и клан.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
