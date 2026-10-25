import type { Metadata } from "next";
import { ReviewsPage } from "./ReviewsPage";

export const metadata: Metadata = {
  title: "Отзывы",
  description: "Отзывы игроков о STALZONE INFO: оценки и мнения о флиппере, алертах, ценах и боте.",
  alternates: { canonical: "/reviews" },
};

export default function Page() {
  return <ReviewsPage />;
}
