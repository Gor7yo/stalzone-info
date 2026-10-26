import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isRegion } from "@/lib/regions";
import { CharacterView } from "./CharacterView";

export async function generateMetadata({ params }: PageProps<"/character/[region]/[name]">): Promise<Metadata> {
  const { name: raw } = await params;
  const name = decodeURIComponent(raw);
  return {
    title: `${name} - статистика игрока STALZONE`,
    description: `${name}: статистика игрока STALZONE - K/D, убийства, часы в игре, клан, рейтинг и прогресс за неделю.`,
  };
}

export default async function CharacterPage({ params }: PageProps<"/character/[region]/[name]">) {
  const { region, name } = await params;
  if (!isRegion(region)) notFound();
  return <CharacterView region={region} name={decodeURIComponent(name)} />;
}
