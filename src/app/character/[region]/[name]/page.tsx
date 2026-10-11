import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isRegion } from "@/lib/regions";
import { CharacterView } from "./CharacterView";

export async function generateMetadata({ params }: PageProps<"/character/[region]/[name]">): Promise<Metadata> {
  const { name } = await params;
  return { title: decodeURIComponent(name) };
}

export default async function CharacterPage({ params }: PageProps<"/character/[region]/[name]">) {
  const { region, name } = await params;
  if (!isRegion(region)) notFound();
  return <CharacterView region={region} name={decodeURIComponent(name)} />;
}
