import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ChoreShare",
    short_name: "ChoreShare",
    description: "Share chores fairly as a couple",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#7c3aed",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "New task", url: "/tasks/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Shopping list", url: "/shopping", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
