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
    background_color: "#f5f5f0",
    theme_color: "#f5f5f0",
    icons: [
      // `v`: bump when the icon design changes; the icons are cached for a year (HTTP + service worker).
      { src: "/pwa-icon/192?v=2", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512?v=2", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512?maskable=1&v=2", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
