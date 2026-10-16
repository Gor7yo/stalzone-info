import type { MetadataRoute } from "next";
import { marketItems } from "@/lib/items-server";

const SITE = "https://stalzone-info.ru";

/** Разделы и страницы предметов на рынке. Игроки и кланы не входят — их тысячи и они меняются. */
export default function sitemap(): MetadataRoute.Sitemap {
  const sections: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/auction`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE}/flips`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE}/emission`, changeFrequency: "hourly", priority: 0.7 },
    { url: `${SITE}/clans`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE}/character`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/pro`, changeFrequency: "monthly", priority: 0.4 },
  ];
  const items = marketItems().map((i) => ({
    url: `${SITE}/auction/${i.id}`,
    changeFrequency: "hourly" as const,
    priority: 0.6,
  }));
  return [...sections, ...items];
}
