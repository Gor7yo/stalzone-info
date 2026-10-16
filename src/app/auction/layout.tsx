import type { Metadata } from "next";

export const metadata: Metadata = {
  // шаблон повторяем: строковый title раздела сбросил бы его у страниц предметов
  title: { default: "Рынок - цены аукциона", template: "%s · STALZONE INFO" },
  description: "Цены аукциона STALZONE: поиск предметов, лучшая цена сейчас, лоты, история продаж и графики по регионам RU, EU, NA и SEA.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
