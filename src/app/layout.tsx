"use client";

import "./globals.css";
import { Providers } from "@/providers";
import { MobxProvider } from "@/components/MobxProvider";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <MobxProvider>
          <Providers>{children}</Providers>
        </MobxProvider>
      </body>
    </html>
  );
}
