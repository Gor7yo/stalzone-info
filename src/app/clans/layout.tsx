import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Кланы STALZONE - поиск и состав", template: "%s · STALZONE INFO" },
  description: "Кланы STALZONE: поиск клана, уровень, состав, лидер и описание по регионам RU, EU, NA и SEA.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
