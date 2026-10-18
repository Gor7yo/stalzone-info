import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { stripMc } from "@/lib/mcText";
import { serverClan } from "@/lib/players-server";
import { isRegion } from "@/lib/regions";
import { ClanView } from "./ClanView";

/** Заголовок ссылки — с тегом и названием клана (без ответа сервера — просто «Клан»). */
export async function generateMetadata({ params }: PageProps<"/clans/[region]/[id]">): Promise<Metadata> {
  const { region, id } = await params;
  const clan = isRegion(region) ? await serverClan(region, decodeURIComponent(id)) : null;
  if (!clan) return { title: "Клан" };
  return {
    title: `[${stripMc(clan.tag)}] ${stripMc(clan.name)}`,
    description: `Клан STALZONE: уровень ${clan.level}, бойцов ${clan.memberCount}, лидер ${stripMc(clan.leader)}.`,
  };
}

export default async function ClanPage({ params }: PageProps<"/clans/[region]/[id]">) {
  const { region, id } = await params;
  if (!isRegion(region)) notFound();
  return <ClanView region={region} id={decodeURIComponent(id)} />;
}
