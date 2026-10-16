import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Флиппер - выгодные лоты",
  description: "Флиппер STALZONE: лоты на аукционе дешевле рынка с прибылью после комиссии и оценкой надёжности.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
