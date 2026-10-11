import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
