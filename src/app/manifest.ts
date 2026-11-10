import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arvo",
    short_name: "Arvo",
    description: "See where your money goes and start investing with what you have.",
    start_url: "/overview",
    scope: "/",
    display: "standalone",
    background_color: "#eef2f0",
    theme_color: "#124a3c",
    categories: ["finance", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
