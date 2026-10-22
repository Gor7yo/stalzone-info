import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Аналитика кланов",
  description: "Аналитика кланов STALZONE: кто растёт и теряет бойцов, группировки, новые и распущенные кланы в регионах RU, EU, NA и SEA.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
