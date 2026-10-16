import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Кланы", template: "%s · STALZONE INFO" },
  description: "Кланы STALZONE: рейтинг, состав, лидер и описание по регионам RU, EU, NA и SEA.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
