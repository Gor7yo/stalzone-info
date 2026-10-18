import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isRegion } from "@/lib/regions";
import { RecapView } from "./RecapView";

const MONTH_RE = /^20\d\d-(0[1-9]|1[0-2])$/;
const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

export async function generateMetadata({ params }: PageProps<"/character/[region]/[name]/recap/[month]">): Promise<Metadata> {
  const { region, name, month } = await params;
  const nick = decodeURIComponent(name);
  const label = MONTH_RE.test(month) ? `Итоги ${MONTHS_GEN[Number(month.slice(5)) - 1]}` : "Итоги месяца";
  // превью ссылки — сама картинка-сторис
  const image = `/story/${region}/${encodeURIComponent(nick)}/${month}`;
  return {
    title: `${label} · ${nick}`,
    description: "Итоги месяца в Зоне: убийства, часы в игре, лучший день и архетип.",
    openGraph: { images: [{ url: image, width: 1080, height: 1920 }] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export default async function RecapPage({ params }: PageProps<"/character/[region]/[name]/recap/[month]">) {
  const { region, name, month } = await params;
  if (!isRegion(region) || !MONTH_RE.test(month)) notFound();
  return <RecapView region={region} name={decodeURIComponent(name)} month={month} />;
}
