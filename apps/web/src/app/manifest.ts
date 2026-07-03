import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UAE ALIVE — الفهيدي",
    short_name: "UAE ALIVE",
    description:
      "AI + WebAR heritage platform for Al Fahidi Historical District, Dubai.",
    start_url: "/ar",
    display: "standalone",
    background_color: "#0B0E14",
    theme_color: "#0B0E14",
    orientation: "portrait",
    dir: "auto",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
