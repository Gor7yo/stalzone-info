import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Флиппер - выгодные лоты и заработок на аукционе STALZONE",
  description: "Флиппер STALZONE: как заработать на аукционе - лоты дешевле рынка с прибылью после комиссии и оценкой надёжности.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
