import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope, Unbounded } from "next/font/google";
import { JsonLd, SITE_URL } from "@/components/JsonLd";
import { Shell } from "@/components/Shell/Shell";
import { getSavedLang } from "@/i18n/server";
import { THEME_SCRIPT } from "@/lib/theme";
import { Providers } from "./providers";
import "./globals.css";

const unbounded = Unbounded({ subsets: ["latin", "cyrillic"], variable: "--font-unbounded", display: "swap" });
const manrope = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-manrope", display: "swap" });
const jetbrains = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-jetbrains",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://stalzone-info.ru"),
  // главная: в заголовке — то, что ищут («цены аукциона»), а не только название
  title: { default: "STALZONE INFO - аукцион STALZONE: цены, флиппер, выбросы", template: "%s · STALZONE INFO" },
  description:
    "Сталзон Инфо - аукцион STALZONE (сталзон): цены на все предметы сейчас, история продаж, флиппер выгодных лотов, алерты в Telegram, кланы и таймер выброса.",
  keywords: [
    "сталзон инфо",
    "stalzone инфо",
    "аукцион stalzone",
    "stalzone аукцион",
    "сталзон аукцион",
    "цены stalzone",
    "stalzone info",
    "флиппер stalzone",
    "выброс stalzone",
    "сталзон цены",
    "когда выброс stalzone",
    "stalzone market",
    "stalzone auction prices",
  ],
  applicationName: "STALZONE INFO",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "STALZONE INFO" },
  openGraph: { siteName: "STALZONE INFO", type: "website", locale: "ru_RU" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#07080a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // язык интерфейса из cookie: страница сразу рендерится на нём (SEO-метаданные всё равно русские)
  const lang = await getSavedLang();
  return (
    // data-theme ставит скрипт ниже до гидрации — расхождение атрибута с серверным HTML ожидаемо
    <html lang={lang ?? "ru"} className={`${unbounded.variable} ${manrope.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://raw.githubusercontent.com" crossOrigin="" />
        {process.env.NEXT_PUBLIC_API_URL && <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL} crossOrigin="" />}
      </head>
      <body>
        {/* сайт с поиском по рынку: Google может показать поле поиска прямо в выдаче;
            alternateName - другие написания названия, по ним Google связывает запросы с сайтом */}
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "STALZONE INFO",
            alternateName: ["Сталзон Инфо", "Stalzone Info", "stalzone-info.ru"],
            url: SITE_URL,
            inLanguage: "ru",
            potentialAction: {
              "@type": "SearchAction",
              target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/auction?q={search_term_string}` },
              "query-input": "required name=search_term_string",
            },
          }}
        />
        <Providers lang={lang}>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
