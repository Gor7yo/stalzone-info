import type { Metadata } from "next";

export const metadata: Metadata = {
  // шаблон повторяем: строковый title раздела сбросил бы его у страниц предметов
  title: { default: "Аукцион STALZONE - цены на предметы", template: "%s · STALZONE INFO" },
  description:
    "Аукцион STALZONE (сталзон) онлайн: поиск предметов, лучшая цена сейчас, лоты, история продаж и графики цен по регионам RU, EU, NA и SEA.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
