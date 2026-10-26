import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ChoreShare",
    short_name: "ChoreShare",
    description: "情侣家务分配与记录",
    lang: "zh-CN",
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
      { name: "新建任务", url: "/tasks/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "购物清单", url: "/shopping", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
