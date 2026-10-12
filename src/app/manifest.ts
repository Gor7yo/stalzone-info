import type { MetadataRoute } from "next";

/** Установка на домашний экран (PWA): название и значки STALZONE INFO. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "STALZONE INFO",
    short_name: "STALZONE INFO",
    description: "Цены аукциона, флиппер, алерты, кланы и выбросы STALZONE.",
    start_url: "/",
    display: "standalone",
    background_color: "#07080a",
    theme_color: "#07080a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
