import type { MetadataRoute } from "next";

/** Личные и служебные страницы поисковикам не нужны. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/account", "/admin", "/auth/"] },
    sitemap: "https://stalzone-info.ru/sitemap.xml",
    host: "https://stalzone-info.ru",
  };
}
