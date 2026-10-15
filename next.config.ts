import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Самодостаточная сборка только для запасной выкладки на VPS (.github/workflows/deploy.yml);
  // на Vercel standalone ломает сборку
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  reactCompiler: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Справочники меняются только при `npm run items`
        source: "/:file(items|meta|barter).json",
        headers: [
          {
            key: "Cache-Control",
            // URL содержит ?v=<хеш данных>, поэтому кешируем надолго
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
