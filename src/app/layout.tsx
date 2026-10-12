import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope, Unbounded } from "next/font/google";
import { Shell } from "@/components/Shell/Shell";
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
  title: { default: "STALZONE INFO", template: "%s · STALZONE INFO" },
  description: "Цены аукциона, флиппер, алерты, кланы и выбросы STALZONE — на сайте и в Telegram.",
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${unbounded.variable} ${manrope.variable} ${jetbrains.variable}`}>
      <head>
        <link rel="preconnect" href="https://raw.githubusercontent.com" crossOrigin="" />
        {process.env.NEXT_PUBLIC_API_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL} crossOrigin="" />
        )}
      </head>
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
