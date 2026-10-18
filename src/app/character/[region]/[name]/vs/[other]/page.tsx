import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isRegion } from "@/lib/regions";
import { CompareView } from "./CompareView";

export async function generateMetadata({ params }: PageProps<"/character/[region]/[name]/vs/[other]">): Promise<Metadata> {
  const { name, other } = await params;
  return {
    title: `${decodeURIComponent(name)} vs ${decodeURIComponent(other)}`,
    description: "Сравнение игроков STALZONE: K/D, убийства, часы в игре, точность и прогресс за неделю.",
  };
}

export default async function ComparePage({ params }: PageProps<"/character/[region]/[name]/vs/[other]">) {
  const { region, name, other } = await params;
  if (!isRegion(region)) notFound();
  return <CompareView region={region} a={decodeURIComponent(name)} b={decodeURIComponent(other)} />;
}
