/**
 * Структурированные данные schema.org для поисковиков (хлебные крошки, сайт с поиском).
 * «<» экранируем, чтобы строка из данных не закрыла тег script.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export const SITE_URL = "https://stalzone-info.ru";

/** BreadcrumbList: [["Рынок", "/auction"], ["Артефакты", "/auction/c/artefact"], ["Комета"]] */
export const breadcrumbs = (items: [name: string, path?: string][]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({
    "@type": "ListItem",
    position: i + 1,
    name,
    ...(path && { item: `${SITE_URL}${path}` }),
  })),
});
