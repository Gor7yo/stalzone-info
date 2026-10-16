import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pro",
  description: "STALZONE INFO Pro: флиппер, аналитика цен, фильтры по качеству и заточке, до 20 алертов в Telegram.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
