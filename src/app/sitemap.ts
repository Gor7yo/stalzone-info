import type { MetadataRoute } from "next";
import { marketGroups, marketItems } from "@/lib/items-server";

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
    { url: `${SITE}/guide`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/rules`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];
  const groups = marketGroups().map((g) => ({
    url: `${SITE}/auction/c/${g.id}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
  const items = marketItems().map((i) => ({
    url: `${SITE}/auction/${i.id}`,
    changeFrequency: "hourly" as const,
    priority: 0.6,
  }));
  return [...sections, ...groups, ...items];
}
