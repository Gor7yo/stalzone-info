import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MAP_LOCATIONS, mapLocation } from "@/features/map";
import { MAP_ENABLED } from "@/lib/flags";
import { MapPage } from "./MapPage";

export const metadata: Metadata = {
  title: "Карта",
  description:
    "Интерактивная карта STALZONE: Зона, Север, Затон и другие локации в полном разрешении карты ПДА, координаты и ссылки на место.",
  alternates: { canonical: "/map" },
};

const num = (v: string | string[] | undefined) => {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) ? n : null;
};

/** /map?l=zone&x=-4100&z=2300&zoom=4 — ссылка на место: локация, центр в блоках, зум. */
export default async function Page({ searchParams }: PageProps<"/map">) {
  if (!MAP_ENABLED) notFound();
  const { l, x, z, zoom } = await searchParams;
  const location = mapLocation(Array.isArray(l) ? l[0] : l) ?? MAP_LOCATIONS[0];
  const px = num(x),
    pz = num(z),
    pzoom = num(zoom);
  const initial = px !== null && pz !== null && pzoom !== null ? { x: px, z: pz, zoom: pzoom } : null;
  return <MapPage initialLocation={location.id} initial={initial} />;
}
