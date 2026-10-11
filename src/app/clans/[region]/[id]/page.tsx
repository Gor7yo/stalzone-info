import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isRegion } from "@/lib/regions";
import { ClanView } from "./ClanView";

export const metadata: Metadata = { title: "Клан" };

export default async function ClanPage({ params }: PageProps<"/clans/[region]/[id]">) {
  const { region, id } = await params;
  if (!isRegion(region)) notFound();
  return <ClanView region={region} id={decodeURIComponent(id)} />;
}
