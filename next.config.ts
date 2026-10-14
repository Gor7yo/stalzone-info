import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Самодостаточная сборка для VPS: .next/standalone/server.js без node_modules
  output: "standalone",
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
