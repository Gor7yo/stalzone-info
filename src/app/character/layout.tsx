import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Статистика игрока STALZONE по нику", template: "%s · STALZONE INFO" },
  description: "Поиск игроков STALZONE по нику: статистика, K/D, часы в игре, достижения и клан.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
