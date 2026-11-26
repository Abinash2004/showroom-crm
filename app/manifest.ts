import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Showroom CRM",
    short_name: "Showroom",
    description: "Vehicle showroom leads, follow-ups and branch operations.",
    start_url: "/leads",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f5f9",
    theme_color: "#1d4ed8",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
